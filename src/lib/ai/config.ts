/**
 * Single source of truth for every tunable the admin AI agent reads, except the
 * model endpoint itself — that lives in ./providers.ts, which supports several
 * switchable OpenAI-compatible backends (Gemini, Groq, Ollama).
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

  /**
   * Text-to-speech is opt-in and OFF by default: when TTS_BASE_URL is unset the
   * client speaks replies with the browser's built-in SpeechSynthesis instead of
   * a server, so no audio leaves the device.
   */
  get ttsEnabled() {
    return str("TTS_BASE_URL", "").length > 0;
  },
  get ttsBaseUrl() {
    return str("TTS_BASE_URL", "http://localhost:9100").replace(/\/+$/, "");
  },
  /** Optional model override forwarded to the speech server (e.g. Piper voice). */
  get ttsModel() {
    return str("TTS_MODEL", "");
  },
  /** Optional default voice forwarded to the speech server. */
  get ttsVoice() {
    return str("TTS_VOICE", "");
  },
  get ttsApiKey() {
    return process.env.TTS_API_KEY?.trim() || "";
  },
  get ttsTimeoutMs() {
    return num("TTS_TIMEOUT_MS", 60_000);
  },
  /** Max characters accepted for a single synthesis request. */
  get ttsMaxChars() {
    return num("TTS_MAX_CHARS", 2000);
  },
} as const;
