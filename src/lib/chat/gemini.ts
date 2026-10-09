/**
 * Gemini client (§1). Server-side only — `GEMINI_API_KEY` is never exposed.
 *
 * Responsibilities:
 *  - generation config from env, temperature hard-clamped to <= 0.3
 *  - streaming upstream, accumulating safely
 *  - exponential backoff on 429 / 5xx (max 2 retries)
 *  - hard timeout, and never letting a raw error reach the browser
 */

import { GoogleGenAI } from "@google/genai";
import { chatConfig } from "./config";

export type ChatFailureKind = "rate_limit" | "timeout" | "auth" | "model" | "network";

export class ChatModelError extends Error {
  constructor(
    readonly kind: ChatFailureKind,
    message?: string,
  ) {
    super(message || kind);
    this.name = "ChatModelError";
  }
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (client) return client;
  const apiKey = chatConfig.apiKey;
  if (!apiKey) {
    throw new ChatModelError("auth", "GEMINI_API_KEY is not set");
  }
  client = new GoogleGenAI({ apiKey });
  return client;
}

/** Test hook — lets the suite swap in a fake without touching process.env. */
export function __setClient(next: GoogleGenAI | null): void {
  client = next;
}

function classifyError(err: unknown): ChatFailureKind {
  const e = err as { status?: number; code?: number; message?: string; name?: string };
  const status = e?.status ?? e?.code ?? 0;
  const msg = String(e?.message || "");

  if (e?.name === "AbortError" || /aborted|timeout|timed out/i.test(msg)) return "timeout";
  if (status === 429 || /RESOURCE_EXHAUSTED|rate limit|quota/i.test(msg)) return "rate_limit";
  if (status === 401 || status === 403 || /API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i.test(msg))
    return "auth";
  if (status >= 500 || /INTERNAL|UNAVAILABLE|DEADLINE_EXCEEDED/i.test(msg)) return "model";
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|network|ECONNRESET/i.test(msg)) return "network";
  if (status >= 400) return "model";
  return "network";
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Streaming generation. Yields text deltas. Throws {@link ChatModelError}
 * after retries are exhausted — callers map that to a friendly message.
 */
export async function* streamChat(
  systemInstruction: string,
  userPrompt: string,
  opts: { signal?: AbortSignal; maxRetries?: number } = {},
): AsyncGenerator<string> {
  const maxRetries = opts.maxRetries ?? 2;
  let attempt = 0;

  for (;;) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), chatConfig.timeoutMs);
    const onOuterAbort = () => controller.abort();
    opts.signal?.addEventListener("abort", onOuterAbort);

    try {
      const ai = getClient();
      const stream = await ai.models.generateContentStream({
        model: chatConfig.model,
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: chatConfig.temperature,
          topP: chatConfig.topP,
          topK: chatConfig.topK,
          maxOutputTokens: chatConfig.maxOutputTokens,
          abortSignal: controller.signal,
        },
      });

      // The SDK reports chunk text differently across versions (delta vs
      // cumulative). Accumulate with a heuristic so neither breaks us.
      let acc = "";
      for await (const chunk of stream) {
        const piece = chunk.text ?? "";
        if (!piece) continue;
        if (piece.startsWith(acc)) {
          const delta = piece.slice(acc.length);
          acc = piece;
          if (delta) yield delta;
        } else {
          acc += piece;
          yield piece;
        }
      }
      return;
    } catch (err) {
      const kind = classifyError(err);
      const retryable = kind === "rate_limit" || kind === "model" || kind === "network";
      if (retryable && attempt < maxRetries) {
        const delay = 500 * 2 ** attempt + Math.floor(Math.random() * 250);
        await sleep(delay);
        attempt += 1;
        continue;
      }
      throw new ChatModelError(kind, err instanceof Error ? err.message : undefined);
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onOuterAbort);
    }
  }
}

/** Non-streaming helper used for rolling summaries and one-shot rewrites. */
export async function completeChat(
  systemInstruction: string,
  userPrompt: string,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), chatConfig.timeoutMs);
  try {
    const ai = getClient();
    const res = await ai.models.generateContent({
      model: chatConfig.model,
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: chatConfig.temperature,
        topP: chatConfig.topP,
        topK: chatConfig.topK,
        maxOutputTokens: chatConfig.maxOutputTokens,
        abortSignal: controller.signal,
      },
    });
    return (res.text || "").trim();
  } catch (err) {
    throw new ChatModelError(classifyError(err), err instanceof Error ? err.message : undefined);
  } finally {
    clearTimeout(timer);
  }
}

const embedCache = new Map<string, number[]>();
const EMBED_CACHE_MAX = 2000;

/**
 * Text → 768-d vector. Retries twice on 429, exactly like generation.
 * Free-tier embedding quota is per-day, so failures here must be obvious
 * rather than silently producing a zero vector.
 */
export async function embedText(text: string): Promise<number[]> {
  const key = text.slice(0, 2000);
  const cached = embedCache.get(key);
  if (cached) return cached;

  const maxRetries = 2;
  let attempt = 0;
  for (;;) {
    try {
      const ai = getClient();
      const res = await ai.models.embedContent({
        model: chatConfig.embeddingModel,
        contents: text,
        config: {
          outputDimensionality: 768,
        },
      });
      const values = res.embeddings?.[0]?.values;
      if (!values || values.length !== 768) {
        throw new ChatModelError("model", "embedding returned wrong dimensionality");
      }
      if (embedCache.size >= EMBED_CACHE_MAX) {
        const first = embedCache.keys().next().value;
        if (first !== undefined) embedCache.delete(first);
      }
      embedCache.set(key, values);
      return values;
    } catch (err) {
      const kind = err instanceof ChatModelError ? err.kind : classifyError(err);
      if (kind !== "auth" && attempt < maxRetries) {
        await sleep(500 * 2 ** attempt);
        attempt += 1;
        continue;
      }
      throw new ChatModelError(kind, err instanceof Error ? err.message : undefined);
    }
  }
}

/** Friendly, non-leaking message for each failure class (§1). */
export function friendlyFailure(kind: ChatFailureKind): string {
  switch (kind) {
    case "rate_limit":
      return "I'm getting a lot of messages right now. Give me a moment and try again.";
    case "timeout":
      return "That took too long to answer. Please try again.";
    case "auth":
    case "model":
      return "The assistant is unavailable at the moment. Please try again shortly.";
    default:
      return "I lost the connection. Check your network and try again.";
  }
}
