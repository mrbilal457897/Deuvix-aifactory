/**
 * The admin AI agent speaks the OpenAI chat-completions API, so any OpenAI-
 * compatible endpoint works. Three are built in and switchable at runtime:
 * Google Gemini, Groq, and a local Ollama. The choice travels with each request
 * and is validated server-side against this allowlist — the client can never
 * point the agent at an arbitrary URL.
 *
 * Keys live only in server env. Nothing here is sent to the browser except the
 * provider id, label and a ready/not-ready flag.
 */
export type ProviderId = "gemini" | "groq" | "ollama";

export interface ProviderDef {
  id: ProviderId;
  label: string;
  /** OpenAI-compatible base URL (no trailing slash). */
  baseUrl: string;
  defaultModel: string;
  /** Env vars checked, in order, for the API key. Empty array = no key needed. */
  apiKeyEnvs: string[];
  /** Env vars that override the model. */
  modelEnvs: string[];
  /** Env vars that override the base URL. */
  baseUrlEnvs: string[];
  requiresKey: boolean;
  /** Short hint shown in the UI (where to get a key, or how to run it). */
  where: string;
}

export const PROVIDERS: Record<ProviderId, ProviderDef> = {
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    apiKeyEnvs: ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
    modelEnvs: ["GEMINI_MODEL"],
    baseUrlEnvs: ["GEMINI_BASE_URL"],
    requiresKey: true,
    where: "Free key at aistudio.google.com/apikey",
  },
  groq: {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    apiKeyEnvs: ["GROQ_API_KEY"],
    modelEnvs: ["GROQ_MODEL"],
    baseUrlEnvs: ["GROQ_BASE_URL"],
    requiresKey: true,
    where: "Free key at console.groq.com/keys",
  },
  ollama: {
    id: "ollama",
    label: "Ollama (local)",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "qwen2.5:7b",
    apiKeyEnvs: ["LLM_API_KEY"],
    modelEnvs: ["OLLAMA_MODEL", "LLM_MODEL"],
    baseUrlEnvs: ["OLLAMA_BASE_URL", "LLM_BASE_URL"],
    requiresKey: false,
    where: "Run `ollama serve` and `ollama pull qwen2.5:7b`",
  },
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PROVIDERS, value);
}

function firstEnv(names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

/** The provider to use when the request does not specify one. */
export function resolveProviderId(value?: string | null): ProviderId {
  if (isProviderId(value)) return value;
  const env = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (isProviderId(env)) return env;
  return "ollama";
}

export interface ResolvedProvider {
  id: ProviderId;
  label: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  requiresKey: boolean;
  /** False only when a required key is missing. */
  configured: boolean;
  where: string;
}

export function resolveProvider(value?: string | null): ResolvedProvider {
  const id = resolveProviderId(value);
  const def = PROVIDERS[id];
  const rawKey = firstEnv(def.apiKeyEnvs);
  // Local servers ignore the key, but OpenAI-compatible clients usually require
  // a non-empty value, so a placeholder is used when none is set.
  const apiKey = rawKey || (def.requiresKey ? "" : "ollama");
  const baseUrl = (firstEnv(def.baseUrlEnvs) || def.baseUrl).replace(/\/+$/, "");
  const model = firstEnv(def.modelEnvs) || def.defaultModel;
  return {
    id,
    label: def.label,
    baseUrl,
    model,
    apiKey,
    requiresKey: def.requiresKey,
    configured: !def.requiresKey || rawKey.length > 0,
    where: def.where,
  };
}

export interface ProviderStatus {
  id: ProviderId;
  label: string;
  model: string;
  ready: boolean;
  requiresKey: boolean;
  where: string;
}

/** Safe-to-send readiness list for the provider picker in the UI. */
export function providerStatuses(): ProviderStatus[] {
  return PROVIDER_IDS.map((id) => {
    const p = resolveProvider(id);
    return {
      id: p.id,
      label: p.label,
      model: p.model,
      ready: p.configured,
      requiresKey: p.requiresKey,
      where: p.where,
    };
  });
}
