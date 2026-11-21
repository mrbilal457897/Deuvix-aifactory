/**
 * Retrieval (§2D). Embeds the query once, searches the requested namespaces
 * with pgvector cosine distance, applies a similarity threshold, and returns
 * only what actually cleared it.
 */

import { and, inArray, isNotNull, or, sql } from "drizzle-orm";
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
  /** True when embeddings failed and the KB was searched lexically instead. */
  fallback?: boolean;
  /** Which Gemini failure class caused `error: "model"` (auth, quota, …). */
  errorKind?: ChatFailureKind;
  /** Diagnostics for the server log only — never sent to the browser. */
  errorStatus?: number;
  errorName?: string;
  errorMessage?: string;
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

  let vector: number[] | null = null;
  let embedFailure: Partial<RetrievalResult> | null = null;
  try {
    vector = await embedText(query);
  } catch (err) {
    const errorKind: ChatFailureKind = err instanceof ChatModelError ? err.kind : "model";
    const errorStatus =
      err instanceof ChatModelError
        ? err.status
        : (err as { status?: number; code?: number } | null)?.status ??
          (err as { code?: number } | null)?.code;
    embedFailure = {
      errorKind,
      errorStatus: typeof errorStatus === "number" ? errorStatus : undefined,
      errorName: err instanceof Error ? err.name : undefined,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
    console.warn(
      "[chat] embedding failed - using lexical retrieval fallback",
      JSON.stringify({ kind: errorKind, status: embedFailure.errorStatus }),
    );
  }

  // Embeddings can fail (quota/auth/model) while text generation still works.
  // Search the same KB lexically so a broken embedding never kills the turn.
  if (vector === null) {
    const terms = query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length >= 4)
      .slice(0, 6);
    if (terms.length === 0) return { ...empty, ...embedFailure };
    const conditions = terms.map((term) => {
      const pattern = `%${term}%`;
      return sql`(lower(${kbChunks.text}) like ${pattern} or lower(coalesce(${kbChunks.title}, '')) like ${pattern})`;
    });
    const rows = await getDb()
      .select({
        id: kbChunks.id,
        source: kbChunks.source,
        url: kbChunks.url,
        title: kbChunks.title,
        heading: kbChunks.heading,
        text: kbChunks.text,
      })
      .from(kbChunks)
      .where(and(inArray(kbChunks.source, namespaces), isNotNull(kbChunks.embedding), or(...conditions)))
      .limit(topK * 2);
    const kept = ((Array.isArray(rows) ? rows : []) as Omit<Row, "score">[])
      .slice(0, topK)
      .map((row) => ({ ...row, score: 1 })) as Row[];
    const topScores: Record<string, number> = {};
    for (const ns of namespaces) topScores[ns] = kept.some((chunk) => chunk.source === ns) ? 1 : 0;
    return { chunks: kept, topScores, urls: collectUrls(kept), fallback: true, ...embedFailure };
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
