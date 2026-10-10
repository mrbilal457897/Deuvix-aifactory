import { aiConfig } from "./config";

export interface LlmHealth {
  ok: boolean;
  model: string;
  baseUrl: string;
  latencyMs: number;
  /** Present when ok is false. */
  error?: string;
  /** The server is reachable but does not list the configured model. */
  modelMissing?: boolean;
  modelsSeen?: string[];
}

/**
 * Cheap reachability probe against the OpenAI-compatible `/models` endpoint.
 * It never throws: an unreachable server is a normal, reportable state and the
 * UI renders an "AI offline" banner instead of a stack trace.
 */
export async function checkLlmHealth(timeoutMs = 4000): Promise<LlmHealth> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const base: Omit<LlmHealth, "ok" | "latencyMs"> = {
    model: aiConfig.model,
    baseUrl: aiConfig.baseUrl,
  };

  try {
    const res = await fetch(`${aiConfig.baseUrl}/models`, {
      method: "GET",
      headers: aiConfig.apiKey ? { Authorization: `Bearer ${aiConfig.apiKey}` } : {},
      signal: controller.signal,
      cache: "no-store",
    });

    const latencyMs = Date.now() - started;
    if (!res.ok) {
      return { ...base, ok: false, latencyMs, error: `HTTP ${res.status}` };
    }

    let modelsSeen: string[] = [];
    try {
      const json = (await res.json()) as { data?: Array<{ id?: string }> };
      modelsSeen = (json.data || []).map((m) => m.id).filter((id): id is string => Boolean(id));
    } catch {
      // A server may return 200 with an empty body; treat that as reachable.
    }

    // Ollama reports "qwen2.5:7b"; a server may also expose "qwen2.5".
    const wantedBase = aiConfig.model.split(":")[0];
    const modelMissing =
      modelsSeen.length > 0 &&
      !modelsSeen.some((id) => id === aiConfig.model || id.split(":")[0] === wantedBase);

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
