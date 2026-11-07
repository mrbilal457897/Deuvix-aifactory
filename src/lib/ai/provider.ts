import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { resolveProvider } from "./providers";

/**
 * Provider factory.
 *
 * Gemini uses the native Google SDK: Google's OpenAI-compatible endpoint drops
 * the `thought_signature` on tool calls, which makes multi-step tool calling
 * fail with a 400. The native provider preserves it. Groq and Ollama speak the
 * OpenAI chat-completions API, so they share one `createOpenAI` client.
 *
 * Clients are memoised per key so switching providers is cheap.
 */
const openaiCache = new Map<string, ReturnType<typeof createOpenAI>>();
const googleCache = new Map<string, ReturnType<typeof createGoogleGenerativeAI>>();

function openaiClient(baseUrl: string, apiKey: string) {
  let client = openaiCache.get(baseUrl);
  if (!client) {
    client = createOpenAI({ name: "deuvix-llm", baseURL: baseUrl, apiKey });
    openaiCache.set(baseUrl, client);
  }
  return client;
}

function googleClient(apiKey: string) {
  let client = googleCache.get(apiKey);
  if (!client) {
    client = createGoogleGenerativeAI({ apiKey });
    googleCache.set(apiKey, client);
  }
  return client;
}

/** The model for a given provider (falls back to AI_PROVIDER / Ollama). */
export function getModel(providerId?: string | null): LanguageModel {
  const provider = resolveProvider(providerId);
  if (provider.kind === "google") {
    return googleClient(provider.apiKey)(provider.model);
  }
  // `.chat()` is used deliberately: the default `openai(id)` call targets the
  // Responses API, which Groq/Ollama do not implement.
  return openaiClient(provider.baseUrl, provider.apiKey).chat(provider.model);
}

/** Test seam: forget the memoised clients (used after env changes). */
export function resetProvider(): void {
  openaiCache.clear();
  googleCache.clear();
}
