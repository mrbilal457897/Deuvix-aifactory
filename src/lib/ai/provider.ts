import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { aiConfig } from "./config";

/**
 * OpenAI-compatible provider pointed at the operator's own model server.
 *
 * Ollama and vLLM both speak the OpenAI chat-completions API, so this single
 * provider covers every supported backend. `.chat()` is used deliberately: the
 * default `openai(id)` call targets the Responses API, which local servers do
 * not implement.
 */
let cached: ReturnType<typeof createOpenAI> | null = null;

function provider() {
  if (!cached) {
    cached = createOpenAI({
      name: "deux-llm",
      baseURL: aiConfig.baseUrl,
      apiKey: aiConfig.apiKey,
    });
  }
  return cached;
}

export function getModel(): LanguageModel {
  return provider().chat(aiConfig.model);
}

/** Test seam: forget the memoised provider (used after env changes). */
export function resetProvider(): void {
  cached = null;
}
