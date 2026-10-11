import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { resolveProvider } from "./providers";

/**
 * OpenAI-compatible provider factory.
 *
 * Gemini, Groq and Ollama all expose a chat-completions API, so this single
 * `createOpenAI` client covers every supported backend — only the base URL, key
 * and model differ. `.chat()` is used deliberately: the default `openai(id)`
 * call targets the Responses API, which these servers do not implement.
 *
 * Clients are memoised per base URL so switching providers is cheap.
 */
const cache = new Map<string, ReturnType<typeof createOpenAI>>();

function clientFor(baseUrl: string, apiKey: string) {
  let client = cache.get(baseUrl);
  if (!client) {
    client = createOpenAI({ name: "deux-llm", baseURL: baseUrl, apiKey });
    cache.set(baseUrl, client);
  }
  return client;
}

/** The model for a given provider (falls back to AI_PROVIDER / Ollama). */
export function getModel(providerId?: string | null): LanguageModel {
  const provider = resolveProvider(providerId);
  return clientFor(provider.baseUrl, provider.apiKey).chat(provider.model);
}

/** Test seam: forget the memoised clients (used after env changes). */
export function resetProvider(): void {
  cache.clear();
}
