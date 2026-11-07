/**
 * Knowledge-base ingest for the chatbot (§2A/§2B).
 *
 *   npm run ingest -- --source deuvix --base-url http://localhost:3000
 *   npm run ingest -- --source agentfactory
 *   npm run ingest -- --all --base-url http://localhost:3000
 *
 * Source A  = this site's 21 public pages. Pricing, plans, trials and billing
 *             references are stripped before chunking, because the chatbot
 *             never quotes prices (§6C).
 * Source B  = the public Agent Factory docs, fetched from their own sitemap.
 *             Crawl rules from robots.txt are respected.
 *
 * Idempotent: a page whose content hash is unchanged is skipped entirely, so
 * re-running costs nothing. URLs that disappeared from the crawl are pruned.
 *
 * Requires DATABASE_URL and GEMINI_API_KEY in .env.local.
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

// The free-tier embedding quota is counted per project (1000 requests/day), so
// indexing can be pointed at a second Google project without touching the key
// the running chatbot uses for generation and query embeddings.
const ingestKey = process.env.GEMINI_API_KEY_INGEST?.trim();
if (ingestKey) process.env.GEMINI_API_KEY = ingestKey;

import { eq, and, inArray } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "../src/lib/db";
import { kbPages, kbChunks, type KbSource } from "../src/lib/db/schema";
import { embedText, ChatModelError } from "../src/lib/chat/gemini";
import { chatConfig } from "../src/lib/chat/config";
import { extractPage, chunkBlocks, hashText } from "./lib/content";

/* -------------------------------------------------------------------------- */
/* Crawl targets                                                              */
/* -------------------------------------------------------------------------- */

const SOURCE_A_PATHS = [
  "/",
  "/products",
  "/about",
  "/contact",
  "/projects",
  "/docs",
  "/careers",
  "/changelog",
  "/book-a-call",
  "/blog",
  "/blog/loop-engineering",
  "/blog/building-digital-fte",
  "/blog/fde-practices",
  "/blog/monetize-ai-agents",
  "/blog/ai-native-development",
  "/blog/human-vs-digital-fte",
  "/blog/spec-driven-development",
  "/terms",
  "/privacy",
  "/cookies",
];

const AGENT_FACTORY_ORIGIN = "https://agentfactory.panaversity.org";
const AGENT_FACTORY_UA = "DeuvixChatbotBot/1.0 (+https://deuvix-aicompany.vercel.app)";

/* -------------------------------------------------------------------------- */
/* CLI                                                                        */
/* -------------------------------------------------------------------------- */

interface Args {
  source: KbSource | "all";
  baseUrl: string;
  limit: number | null;
  dryRun: boolean;
  force: boolean;
  noPrune: boolean;
  targetChars: number;
  maxEmbeds: number | null;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    source: "deuvix",
    baseUrl: process.env.SITE_URL || "http://localhost:3000",
    limit: null,
    dryRun: false,
    force: false,
    noPrune: false,
    targetChars: 700,
    maxEmbeds: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = () => argv[++i];
    switch (flag) {
      case "--source":
        args.source = (next() || "deuvix") as Args["source"];
        break;
      case "--all":
        args.source = "all";
        break;
      case "--base-url":
        args.baseUrl = next() || args.baseUrl;
        break;
      case "--limit":
        args.limit = Number(next()) || null;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--force":
        args.force = true;
        break;
      case "--no-prune":
        args.noPrune = true;
        break;
      case "--target-chars": {
        const n = Number(next());
        // Upper bound is the embedding model's 2048-token input window (~7000
        // characters of English prose); larger chunks are rejected by the API.
        if (Number.isFinite(n) && n >= 200 && n <= 7000) args.targetChars = n;
        break;
      }
      case "--max-embeds": {
        const n = Number(next());
        if (Number.isFinite(n) && n > 0) args.maxEmbeds = n;
        break;
      }
      case "--help":
      case "-h":
        console.log(
          [
            "Usage: tsx scripts/ingest.ts [options]",
            "  --source deuvix|agentfactory   which namespace to fill (default: deuvix)",
            "  --all                        fill both",
            "  --base-url <url>             origin to fetch Source A from",
            "  --limit <n>                  only process the first n pages",
            "  --force                      ignore content hashes and re-embed",
            "  --dry-run                    fetch and report, write nothing",
            "  --no-prune                   keep pages that no longer exist",
            "  --target-chars <n>           chunk size (default 700). Bigger chunks",
            "                               mean fewer embedding requests, which",
            "                               matters against the 1000/day free tier.",
            "  --max-embeds <n>             stop cleanly after n embedding requests",
            "                               (finishes the page in flight; resumable).",
          ].join("\n"),
        );
        process.exit(0);
        break;
      default:
        break;
    }
  }

  if (args.source !== "deuvix" && args.source !== "agentfactory" && args.source !== "all") {
    console.error(`Unknown --source "${args.source}". Use deuvix, agentfactory or all.`);
    process.exit(1);
  }
  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  return args;
}

/* -------------------------------------------------------------------------- */
/* Small HTTP helpers                                                         */
/* -------------------------------------------------------------------------- */

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/* -------------------------------------------------------------------------- */
/* Embedding with quota pacing                                                */
/* -------------------------------------------------------------------------- */

/**
 * Free-tier embedding quota is ~100 requests/minute, and a full crawl is
 * ~1000 chunks — so pace under the limit and back off hard when the API still
 * says no. A run must never die on a single 429.
 */
const EMBED_SPACING_MS = 700;
const EMBED_MAX_ATTEMPTS = 6;

/** Thrown to unwind out of a page when the run's embedding budget is spent. */
class EmbedBudgetReached extends Error {}

let embedBudget = Number.POSITIVE_INFINITY;
let embedsUsed = 0;

/** True once a run stopped early for any reason — never prune on a short run. */
let stoppedEarly = false;

async function embedChunk(text: string): Promise<number[]> {
  if (embedsUsed >= embedBudget) throw new EmbedBudgetReached("embedding budget reached");
  for (let attempt = 0; ; attempt += 1) {
    await sleep(EMBED_SPACING_MS);
    try {
      const vector = await embedText(text);
      embedsUsed += 1;
      if (embedsUsed % 50 === 0) console.log(`  … ${embedsUsed} embeddings spent`);
      return vector;
    } catch (err) {
      const kind = err instanceof ChatModelError ? err.kind : "unknown";
      if (kind === "auth" || attempt >= EMBED_MAX_ATTEMPTS) throw err;
      const backoffMs = Math.min(15_000 * 2 ** attempt, 120_000);
      console.log(
        `  Gemini ${kind} — waiting ${Math.round(backoffMs / 1000)}s ` +
          `(attempt ${attempt + 1}/${EMBED_MAX_ATTEMPTS})`,
      );
      await sleep(backoffMs);
    }
  }
}

async function fetchHtml(url: string, userAgent: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": userAgent, Accept: "text/html,application/xhtml+xml" },
    signal: AbortSignal.timeout(20_000),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

interface DisallowRule {
  allow: boolean;
  prefix: string;
}

/** Minimal robots.txt reader: only `User-agent: *` groups are consulted. */
async function readRobots(origin: string): Promise<DisallowRule[]> {
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": AGENT_FACTORY_UA },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    const rules: DisallowRule[] = [];
    let applies = false;
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.split("#")[0].trim();
      if (!trimmed) continue;
      const [rawKey, ...rest] = trimmed.split(":");
      const key = rawKey.trim().toLowerCase();
      const value = rest.join(":").trim();
      if (key === "user-agent") applies = value === "*";
      else if (applies && key === "disallow" && value) rules.push({ allow: false, prefix: value });
      else if (applies && key === "allow" && value) rules.push({ allow: true, prefix: value });
    }
    return rules;
  } catch {
    return [];
  }
}

function isAllowed(path: string, rules: DisallowRule[]): boolean {
  let allowed = true;
  for (const rule of rules) {
    if (path.startsWith(rule.prefix)) allowed = rule.allow;
  }
  return allowed;
}

async function sitemapUrls(origin: string): Promise<string[]> {
  const res = await fetch(`${origin}/sitemap.xml`, {
    headers: { "User-Agent": AGENT_FACTORY_UA },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`sitemap.xml returned ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

/* -------------------------------------------------------------------------- */
/* Ingestion                                                                  */
/* -------------------------------------------------------------------------- */

interface Target {
  url: string;
  html: string;
  stripPricing: boolean;
}

interface Stats {
  fetched: number;
  skipped: number;
  updated: number;
  chunks: number;
  pruned: number;
  failed: number;
}

async function loadExisting(source: KbSource, urls: string[]) {
  const db = getDb();
  if (urls.length === 0) return new Map<string, { contentHash: string }>();
  const rows = await db
    .select({ url: kbPages.url, contentHash: kbPages.contentHash })
    .from(kbPages)
    .where(and(eq(kbPages.source, source), inArray(kbPages.url, urls)));
  return new Map(rows.map((r) => [r.url, { contentHash: r.contentHash }]));
}

async function writePage(
  source: KbSource,
  target: Target,
  opts: { dryRun: boolean; targetChars: number },
): Promise<number> {
  const { title, blocks } = extractPage(target.html, { stripPricing: target.stripPricing });
  const fullText = blocks.map((b) => `${b.heading}\n${b.text}`).join("\n\n");
  const contentHash = hashText(fullText);
  const chunks = chunkBlocks(blocks, { targetChars: opts.targetChars });
  const chars = blocks.reduce((sum, b) => sum + b.text.length, 0);

  if (opts.dryRun) {
    console.log(
      `  [dry-run] ${target.url} — ${blocks.length} blocks, ${chars} chars, ${chunks.length} chunks`,
    );
    return chunks.length;
  }

  const db = getDb();
  const vectors: number[][] = [];
  for (const chunk of chunks) {
    const text = `${chunk.heading}\n${chunk.text}`.trim();
    vectors.push(await embedChunk(text));
  }

  // Vectors are already paid for, so a flaky connection must not throw that work
  // away — retry the writes; each retry is safe because the delete comes first.
  await withDbRetry(async () => {
    // Replace the page atomically enough: drop old chunks, write new ones, then
    // commit the page row so a partial failure leaves the old page visible.
    await db.delete(kbChunks).where(and(eq(kbChunks.source, source), eq(kbChunks.url, target.url)));

    for (const [i, chunk] of chunks.entries()) {
      await db.insert(kbChunks).values({
        source,
        url: target.url,
        chunkIndex: chunk.index,
        title,
        heading: chunk.heading,
        text: chunk.text,
        contentHash,
        embedding: vectors[i],
      });
    }

    await db
      .insert(kbPages)
      .values({
        source,
        url: target.url,
        title,
        contentHash,
        chunkCount: chunks.length,
        lastFetched: new Date(),
      })
      .onConflictDoUpdate({
        target: [kbPages.source, kbPages.url],
        set: {
          title,
          contentHash,
          chunkCount: chunks.length,
          lastFetched: new Date(),
        },
      });
  });

  return chunks.length;
}

/** Retry transient network/DNS failures; a dropped pooler connection is not fatal. */
async function withDbRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      const code = (err as { code?: string; cause?: { code?: string } })?.cause?.code ??
        (err as { code?: string })?.code;
      const transient = code === "EAI_AGAIN" || code === "ETIMEDOUT" || code === "ECONNRESET";
      if (!transient || attempt >= attempts) throw err;
      const wait = 2_000 * 2 ** attempt;
      console.log(`  db ${code} — retrying in ${wait / 1000}s`);
      await sleep(wait);
    }
  }
}

async function prune(source: KbSource, seen: Set<string>, stats: Stats) {
  const db = getDb();
  const rows = await db.select({ url: kbPages.url }).from(kbPages).where(eq(kbPages.source, source));
  const gone = rows.map((r) => r.url).filter((url) => !seen.has(url));
  if (gone.length === 0) return;

  await db.delete(kbChunks).where(and(eq(kbChunks.source, source), inArray(kbChunks.url, gone)));
  await db.delete(kbPages).where(and(eq(kbPages.source, source), inArray(kbPages.url, gone)));
  stats.pruned += gone.length;
  for (const url of gone) console.log(`  pruned ${url}`);
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

async function ingestSourceA(args: Args, stats: Stats) {
  const base = args.baseUrl;
  console.log(`\nSource A — Deuvix site (${base})`);

  const paths = args.limit ? SOURCE_A_PATHS.slice(0, args.limit) : SOURCE_A_PATHS;
  const targets: Target[] = [];

  for (const path of paths) {
    const url = path === "/" ? base : `${base}${path}`;
    try {
      const html = await fetchHtml(url, AGENT_FACTORY_UA);
      targets.push({ url: path, html, stripPricing: true });
      stats.fetched += 1;
      process.stdout.write(`  fetched ${path}\n`);
    } catch (err) {
      stats.failed += 1;
      console.error(`  FAILED ${path}: ${err instanceof Error ? err.message : err}`);
      console.error("    Is the site running? Start it with: npm run dev");
    }
  }

  const existing = await loadExisting("deuvix", targets.map((t) => t.url));
  const seen = new Set(targets.map((t) => t.url));

  for (const target of targets) {
    const { blocks } = extractPage(target.html, { stripPricing: true });
    const hash = hashText(blocks.map((b) => `${b.heading}\n${b.text}`).join("\n\n"));
    const prior = existing.get(target.url);

    if (prior && prior.contentHash === hash && !args.force) {
      stats.skipped += 1;
      continue;
    }

    try {
      stats.chunks += await writePage("deuvix", target, { dryRun: args.dryRun, targetChars: args.targetChars });
    } catch (err) {
      if (err instanceof EmbedBudgetReached) {
        stoppedEarly = true;
        console.log(`  budget reached after ${embedsUsed} embeddings — stopping; re-run to resume`);
        break;
      }
      throw err;
    }
    stats.updated += 1;
    console.log(`  updated ${target.url}`);
    await sleep(50);
  }

  if (!args.noPrune && !args.dryRun && !args.limit && !stoppedEarly) await prune("deuvix", seen, stats);
}

async function ingestSourceB(args: Args, stats: Stats) {
  console.log(`\nSource B — Agent Factory docs (${AGENT_FACTORY_ORIGIN})`);

  const rules = await readRobots(AGENT_FACTORY_ORIGIN);
  const all = await sitemapUrls(AGENT_FACTORY_ORIGIN);
  const docs = all.filter((loc) => {
    if (!loc.startsWith(`${AGENT_FACTORY_ORIGIN}/docs`)) return false;
    const path = new URL(loc).pathname;
    if (!isAllowed(path, rules)) {
      console.log(`  robots.txt disallows ${path} — skipped`);
      return false;
    }
    return true;
  });

  const urls = args.limit ? docs.slice(0, args.limit) : docs;
  const targets: Target[] = [];

  for (const url of urls) {
    try {
      const html = await fetchHtml(url, AGENT_FACTORY_UA);
      targets.push({ url, html, stripPricing: false });
      stats.fetched += 1;
      process.stdout.write(`  fetched ${new URL(url).pathname}\n`);
      await sleep(300); // be a polite guest on someone else's docs site
    } catch (err) {
      stats.failed += 1;
      console.error(`  FAILED ${url}: ${err instanceof Error ? err.message : err}`);
    }
  }

  const existing = await loadExisting("agentfactory", targets.map((t) => t.url));
  const seen = new Set(targets.map((t) => t.url));

  for (const target of targets) {
    const { blocks } = extractPage(target.html, { stripPricing: false });
    const hash = hashText(blocks.map((b) => `${b.heading}\n${b.text}`).join("\n\n"));
    const prior = existing.get(target.url);

    if (prior && prior.contentHash === hash && !args.force) {
      stats.skipped += 1;
      continue;
    }

    try {
      stats.chunks += await writePage("agentfactory", target, { dryRun: args.dryRun, targetChars: args.targetChars });
    } catch (err) {
      if (err instanceof EmbedBudgetReached) {
        stoppedEarly = true;
        console.log(`  budget reached after ${embedsUsed} embeddings — stopping; re-run to resume`);
        break;
      }
      throw err;
    }
    stats.updated += 1;
    console.log(`  updated ${new URL(target.url).pathname}`);
    await sleep(50);
  }

  if (!args.noPrune && !args.dryRun && !args.limit && !stoppedEarly) await prune("agentfactory", seen, stats);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!isDatabaseConfigured()) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env.local first.");
    process.exit(1);
  }
  if (!chatConfig.apiKey) {
    console.error(
      "GEMINI_API_KEY is not set. Embeddings cannot be generated without it " +
        "(set GEMINI_API_KEY_INGEST to index with a second Google project's quota).",
    );
    process.exit(1);
  }
  if (ingestKey) {
    console.log("Using GEMINI_API_KEY_INGEST for embedding quota.\n");
  }
  embedBudget = args.maxEmbeds ?? Number.POSITIVE_INFINITY;
  embedsUsed = 0;
  stoppedEarly = false;

  const stats: Stats = { fetched: 0, skipped: 0, updated: 0, chunks: 0, pruned: 0, failed: 0 };

  if (args.source === "deuvix" || args.source === "all") await ingestSourceA(args, stats);
  if (args.source === "agentfactory" || args.source === "all") await ingestSourceB(args, stats);

  console.log(
    [
      "",
      `fetched=${stats.fetched} updated=${stats.updated} unchanged=${stats.skipped}`,
      `chunks_written=${stats.chunks} pruned=${stats.pruned} failed=${stats.failed}`,
    ].join("\n"),
  );

  if (stats.failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof ChatModelError ? `Gemini: ${err.kind}` : err);
  process.exit(1);
});
