/**
 * Single source of truth for every tunable the chatbot reads.
 * Nothing outside this file may read process.env for chat behaviour.
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

export const chatConfig = {
  /** Verified free-tier on ai.google.dev/gemini-api/docs/pricing. Override freely. */
  get model() {
    return str("GEMINI_MODEL", "gemini-3.5-flash-lite");
  },
  get embeddingModel() {
    return str("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001");
  },
  get apiKey() {
    return process.env.GEMINI_API_KEY || "";
  },
  get temperature() {
    // Hard ceiling: the spec forbids anything above 0.3.
    return Math.min(num("CHAT_TEMPERATURE", 0.2), 0.3);
  },
  get topP() {
    return num("CHAT_TOP_P", 0.8);
  },
  get topK() {
    return num("CHAT_TOP_K", 40);
  },
  get maxOutputTokens() {
    return num("CHAT_MAX_OUTPUT_TOKENS", 400);
  },
  get timeoutMs() {
    return num("CHAT_TIMEOUT_MS", 30_000);
  },
  /** Input cap (§6I). */
  get maxInputChars() {
    return num("CHAT_MAX_INPUT_CHARS", 1000);
  },
  /** Per user / per guest-session messages per minute (§6I). */
  get userRateLimit() {
    return num("CHAT_USER_RATE_LIMIT", 10);
  },
  get topKRetrieval() {
    return num("CHAT_TOP_K_RETRIEVAL", 6);
  },
  get similarityThreshold() {
    return num("CHAT_SIM_THRESHOLD", 0.32);
  },
  get historyWindow() {
    return num("CHAT_HISTORY_WINDOW", 10);
  },
  get summaryThreshold() {
    return num("CHAT_SUMMARY_THRESHOLD", 20);
  },
  /** Abuse strikes before the session ends (§6E). */
  get abuseStrikeLimit() {
    return num("CHAT_ABUSE_STRIKES", 3);
  },
  /** ABORT cooldown before a user may start a new chat, in seconds. */
  get endedCooldownSec() {
    return num("CHAT_ENDED_COOLDOWN_SEC", 60);
  },
  get logEvents() {
    return str("CHAT_LOG_EVENTS", "true") === "true";
  },
} as const;

/**
 * Founders contact. Placeholders until the owner fills them in — the chat
 * must degrade to "use the Contact page" rather than invent an address.
 */
export const foundersContact = {
  get email() {
    return process.env.FOUNDERS_CONTACT_EMAIL?.trim() || "";
  },
  get url() {
    return process.env.FOUNDERS_CONTACT_URL?.trim() || "/contact";
  },
  get whatsapp() {
    return process.env.FOUNDERS_WHATSAPP?.trim() || "";
  },
  get leadWebhook() {
    return process.env.CHAT_LEAD_WEBHOOK_URL?.trim() || "";
  },
  get isEmailConfigured() {
    return Boolean(process.env.FOUNDERS_CONTACT_EMAIL?.trim());
  },
} as const;

/** URLS the model may cite without them coming from retrieved context. */
export const URL_ALLOWLIST: readonly string[] = [
  "/",
  "/about",
  "/products",
  "/contact",
  "/projects",
  "/docs",
  "/careers",
  "/changelog",
  "/book-a-call",
  "/blog",
  "/terms",
  "/privacy",
  "/cookies",
  "/login",
];

export const SITE_ORIGIN = (process.env.SITE_URL || "https://deux-aicompany.vercel.app")
  .replace(/\/+$/, "");
