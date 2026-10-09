/**
 * Knowledge-base status for the chatbot (§2A/§2B).
 *
 *   npm run kb:stats
 *
 * Prints how much of each source is indexed so a partial ingest is obvious.
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { count, eq, max, sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "../src/lib/db";
import { kbPages, kbChunks } from "../src/lib/db/schema";

async function main() {
  if (!isDatabaseConfigured()) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env.local first.");
    process.exit(1);
  }

  const db = getDb();

  const pages = await db
    .select({
      source: kbPages.source,
      pages: count(),
      chunks: sql<number>`coalesce(sum(${kbPages.chunkCount}), 0)::int`,
      latest: max(kbPages.lastFetched),
    })
    .from(kbPages)
    .groupBy(kbPages.source)
    .orderBy(kbPages.source);

  const rows = await db
    .select({ source: kbChunks.source, chunks: count() })
    .from(kbChunks)
    .groupBy(kbChunks.source);

  const chunkMap = new Map(rows.map((r) => [r.source, Number(r.chunks)]));

  if (pages.length === 0) {
    console.log("Knowledge base is empty — run `npm run ingest -- --all`.");
    return;
  }

  console.log("source         pages   chunks   latest");
  console.log("-------------  -----   ------   ------------------------");
  for (const row of pages) {
    console.log(
      `${row.source.padEnd(13)}  ${String(row.pages).padStart(5)}   ` +
        `${String(chunkMap.get(row.source) ?? 0).padStart(6)}   ` +
        `${row.latest ? new Date(row.latest).toISOString() : "-"}`,
    );
  }

  const gaps = await db
    .select({ url: kbPages.url })
    .from(kbPages)
    .where(eq(kbPages.chunkCount, 0));

  if (gaps.length > 0) {
    console.log(`\n${gaps.length} page(s) indexed with 0 chunks:`);
    for (const gap of gaps) console.log(`  ${gap.url}`);
  }

  const sizes = await db
    .select({
      source: kbChunks.source,
      avgChars: sql<number>`round(avg(length(${kbChunks.text})))::int`,
      minChars: sql<number>`min(length(${kbChunks.text}))::int`,
      maxChars: sql<number>`max(length(${kbChunks.text}))::int`,
    })
    .from(kbChunks)
    .groupBy(kbChunks.source);

  console.log("\nchunk size (characters of chunk text)");
  console.log("source            avg      min      max");
  for (const s of sizes) {
    console.log(
      `${s.source.padEnd(13)}  ${String(s.avgChars).padStart(6)}   ` +
        `${String(s.minChars).padStart(6)}   ${String(s.maxChars).padStart(6)}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
