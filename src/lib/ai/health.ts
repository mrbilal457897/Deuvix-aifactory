import { PROVIDERS, resolveProvider } from "./providers";

export interface LlmHealth {
  ok: boolean;
  provider: string;
  label: string;
  model: string;
  baseUrl: string;
  latencyMs: number;
  /** False when a required API key is missing. */
  configured: boolean;
  /** Present when ok is false. */
  error?: string;
  /** The server is reachable but does not list the configured model. */
  modelMissing?: boolean;
  modelsSeen?: string[];
}

/**
 * Cheap reachability probe against the OpenAI-compatible `/models` endpoint.
 * It never throws: an unreachable server (or a missing key) is a normal,
 * reportable state and the UI renders an "AI offline" banner.
 */
export async function checkLlmHealth(
  providerId?: string | null,
  timeoutMs = 4000,
): Promise<LlmHealth> {
  const started = Date.now();
  const provider = resolveProvider(providerId);
  const base = {
    provider: provider.id,
    label: provider.label,
    model: provider.model,
    baseUrl: provider.baseUrl,
    configured: provider.configured,
  };

  if (!provider.configured) {
    const keyName = PROVIDERS[provider.id].apiKeyEnvs[0] ?? "the API key";
    return {
      ...base,
      ok: false,
      latencyMs: 0,
      error: `No API key set — add ${keyName}. ${provider.where}`,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${provider.baseUrl}/models`, {
      method: "GET",
      headers: provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {},
      signal: controller.signal,
      cache: "no-store",
    });

    const latencyMs = Date.now() - started;

    // A server may not implement GET /models but still serve chat completions.
    if (res.status === 404 || res.status === 405) {
      return { ...base, ok: true, latencyMs };
    }
    if (!res.ok) {
      const hint =
        res.status === 401 || res.status === 403
          ? `The provider rejected the API key (HTTP ${res.status}).`
          : `HTTP ${res.status}`;
      return { ...base, ok: false, latencyMs, error: hint };
    }

    let modelsSeen: string[] = [];
    try {
      const json = (await res.json()) as { data?: Array<{ id?: string }> };
      modelsSeen = (json.data || []).map((m) => m.id).filter((id): id is string => Boolean(id));
    } catch {
      // A server may return 200 with an empty body; treat that as reachable.
    }

    // Ollama reports "qwen2.5:7b"; a server may also expose "qwen2.5".
    const wantedBase = provider.model.split(":")[0];
    const modelMissing =
      modelsSeen.length > 0 &&
      !modelsSeen.some((id) => id === provider.model || id.split(":")[0] === wantedBase);

    return {
      ...base,
      ok: true,
      latencyMs,
      modelsSeen: modelsSeen.slice(0, 50),
      ...(modelMissing ? { modelMissing: true } : {}),
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "timeout"
        : err instanceof Error
          ? err.message
          : "unreachable";
    return { ...base, ok: false, latencyMs, error: message };
  } finally {
    clearTimeout(timer);
  }
}
