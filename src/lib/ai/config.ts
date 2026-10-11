/**
 * Single source of truth for every tunable the admin AI agent reads.
 *
 * The model server lives OUTSIDE the deployment (Ollama or any OpenAI-compatible
 * endpoint). Nothing here is hardcoded to a vendor: point LLM_BASE_URL at the
 * server and LLM_MODEL at the model id. No data leaves the operator's own
 * infrastructure — there is no third-party AI API in this path.
 */

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function str(name: string, fallback: string): string {
  const raw = process.env[name]?.trim();
  return raw ? raw : fallback;
}

export const aiConfig = {
  /** OpenAI-compatible base URL. Ollama exposes one at /v1. */
  get baseUrl() {
    return str("LLM_BASE_URL", "http://localhost:11434/v1").replace(/\/+$/, "");
  },
  /** Model id as the server names it (e.g. qwen2.5:7b, llama3.1:8b). */
  get model() {
    return str("LLM_MODEL", "qwen2.5:7b");
  },
  /**
   * Optional. Local servers ignore it, but most OpenAI-compatible gateways
   * require a non-empty value, so a placeholder is used when unset.
   */
  get apiKey() {
    return process.env.LLM_API_KEY?.trim() || "ollama";
  },
  get timeoutMs() {
    return num("LLM_TIMEOUT_MS", 60_000);
  },
  /** Hard cap on the tool-calling loop (spec: max 8 steps). */
  get maxSteps() {
    return num("LLM_MAX_STEPS", 8);
  },
  get temperature() {
    return num("LLM_TEMPERATURE", 0.2);
  },
  /** Max characters accepted for a single admin turn (§6). */
  get maxInputChars() {
    return num("AI_MAX_INPUT_CHARS", 4000);
  },
  /** How many prior turns are replayed to the model. */
  get historyWindow() {
    return num("AI_HISTORY_WINDOW", 12);
  },
  /** Admin requests per minute per admin (§6). */
  get rateLimit() {
    return num("AI_RATE_LIMIT", 30);
  },
  /** Tool output is truncated before it is fed back to the model. */
  get maxToolResultChars() {
    return num("AI_MAX_TOOL_RESULT_CHARS", 12_000);
  },

  /**
   * Voice input is opt-in: it is only "configured" when STT_BASE_URL is set, so
   * deployments without a speech server never show a voice UI or an error.
   */
  get sttEnabled() {
    return str("STT_BASE_URL", "").length > 0;
  },
  get sttBaseUrl() {
    return str("STT_BASE_URL", "http://localhost:9000").replace(/\/+$/, "");
  },
  /** Optional model override forwarded to the speech server. */
  get sttModel() {
    return str("STT_MODEL", "");
  },
  get sttApiKey() {
    return process.env.STT_API_KEY?.trim() || "";
  },
  get sttTimeoutMs() {
    return num("STT_TIMEOUT_MS", 120_000);
  },
  /** Hard cap on an uploaded recording, enforced before buffering it. */
  get sttMaxUploadBytes() {
    return num("STT_MAX_UPLOAD_BYTES", 8_000_000);
  },
  /** Client-side recording cap; a longer recording auto-stops. */
  get sttMaxSeconds() {
    return num("STT_MAX_SECONDS", 120);
  },
} as const;
