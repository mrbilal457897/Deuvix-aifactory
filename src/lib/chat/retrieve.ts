/**
 * Retrieval (§2D). Embeds the query once, searches the requested namespaces
 * with pgvector cosine distance, applies a similarity threshold, and returns
 * only what actually cleared it.
 */

import { and, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { chatConfig } from "./config";
import { embedText, ChatModelError, type ChatFailureKind } from "./gemini";
import { kbChunks, type KbSource } from "@/lib/db/schema";

export interface RetrievedChunk {
  id: string;
  source: KbSource;
  url: string;
  title: string | null;
  heading: string | null;
  text: string;
  score: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  /** Best score per namespace, used by score-based routing. */
  topScores: Record<string, number>;
  /** Every URL present in the retrieved text — the only citable links. */
  urls: string[];
  error?: "no_index" | "model";
  /** Which Gemini failure class caused `error: "model"` (auth, quota, …). */
  errorKind?: ChatFailureKind;
}

interface Row {
  id: string;
  source: KbSource;
  url: string;
  title: string | null;
  heading: string | null;
  text: string;
  score: number;
}

export async function retrieve(
  query: string,
  namespaces: KbSource[],
  topK = chatConfig.topKRetrieval,
): Promise<RetrievalResult> {
  const empty: RetrievalResult = { chunks: [], topScores: {}, urls: [] };

  if (!isDatabaseConfigured()) return empty;
  if (namespaces.length === 0) return empty;

  let vector: number[];
  try {
    vector = await embedText(query);
  } catch (err) {
    // Quota/auth failures must not silently become "no answer found" — the
    // route turns this into a friendly model-error message instead.
    const errorKind: ChatFailureKind = err instanceof ChatModelError ? err.kind : "model";
    return { ...empty, error: "model", errorKind };
  }

  const literal = `[${vector.map((v) => (Number.isFinite(v) ? v : 0)).join(",")}]`;

  const rows = await getDb()
    .select({
      id: kbChunks.id,
      source: kbChunks.source,
      url: kbChunks.url,
      title: kbChunks.title,
      heading: kbChunks.heading,
      text: kbChunks.text,
      score: sql<number>`1 - (${kbChunks.embedding} <=> ${literal}::vector)`,
    })
    .from(kbChunks)
    .where(and(inArray(kbChunks.source, namespaces), isNotNull(kbChunks.embedding)))
    .orderBy(sql`${kbChunks.embedding} <=> ${literal}::vector`)
    .limit(topK * 2);

  const all: Row[] = Array.isArray(rows) ? (rows as unknown as Row[]) : [];
  const threshold = chatConfig.similarityThreshold;
  const kept = all
    .filter((r) => Number(r.score) >= threshold)
    .slice(0, topK)
    .map((r) => ({ ...r, score: Number(r.score) }));

  const topScores: Record<string, number> = {};
  for (const ns of namespaces) {
    const best = kept.filter((c) => c.source === ns).reduce((m, c) => Math.max(m, c.score), 0);
    const bestAny = all.filter((c) => c.source === ns).reduce((m, c) => Math.max(m, Number(c.score)), 0);
    topScores[ns] = Math.max(best, bestAny);
  }

  return {
    chunks: kept,
    topScores,
    urls: collectUrls(kept),
  };
}

/** Pulls every http(s)/relative URL that literally appears in the chunks. */
export function collectUrls(chunks: RetrievedChunk[]): string[] {
  const out = new Set<string>();
  for (const c of chunks) {
    for (const m of c.text.matchAll(/(?:https?:\/\/[^\s<>)"']|\/[a-z0-9-][a-z0-9/\-_.]*)+/gi)) {
      const url = m[0].replace(/[.,;:]+$/, "");
      if (url.length > 1 && url.length < 300) out.add(url);
    }
    // A chunk's own page is always citable for that chunk.
    if (c.url) out.add(c.url);
  }
  return [...out];
}

/** True when the index has content — used to distinguish "no data" from "no match". */
export async function hasIndex(source: KbSource): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const rows = await getDb().execute<{ n: number }>(
    sql`SELECT 1 AS n FROM kb_chunks WHERE source = ${source} LIMIT 1`,
  );
  const arr = Array.isArray(rows) ? rows : ((rows as unknown as { rows?: unknown[] }).rows ?? []);
  return arr.length > 0;
}
