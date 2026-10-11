import { aiConfig } from "./config";

/**
 * Adapter for a self-hosted text-to-speech server (Piper or Kokoro behind a
 * small HTTP endpoint). TTS is optional and OFF by default: when TTS_BASE_URL is
 * unset the client falls back to the browser's SpeechSynthesis, so nothing is
 * sent anywhere.
 *
 * Contract: `POST {TTS_BASE_URL}/synthesize` with JSON `{ input, model?, voice? }`
 * returns raw audio bytes (audio/wav by default); `GET {TTS_BASE_URL}/health`.
 */

export interface TtsHealth {
  ok: boolean;
  /** False when TTS_BASE_URL is unset; the client then uses the browser voice. */
  configured: boolean;
  baseUrl: string;
  model?: string;
  voice?: string;
  error?: string;
}

export class TtsError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "TtsError";
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  return aiConfig.ttsApiKey ? { Authorization: `Bearer ${aiConfig.ttsApiKey}` } : {};
}

export async function checkTtsHealth(timeoutMs = 4000): Promise<TtsHealth> {
  const base: TtsHealth = {
    ok: false,
    configured: aiConfig.ttsEnabled,
    baseUrl: aiConfig.ttsBaseUrl,
    model: aiConfig.ttsModel || undefined,
    voice: aiConfig.ttsVoice || undefined,
  };
  if (!aiConfig.ttsEnabled) return { ...base, error: "not configured" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${aiConfig.ttsBaseUrl}/health`, {
      method: "GET",
      headers: authHeaders(),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return { ...base, error: `HTTP ${res.status}` };
    return { ...base, ok: true };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "timeout"
        : err instanceof Error
          ? err.message
          : "unreachable";
    return { ...base, error: message };
  } finally {
    clearTimeout(timer);
  }
}

export interface SpeechAudio {
  audio: Uint8Array;
  contentType: string;
}

export async function synthesizeSpeech(text: string, voice?: string): Promise<SpeechAudio> {
  if (!aiConfig.ttsEnabled) {
    throw new TtsError("Text-to-speech is not configured.", 503);
  }

  const trimmed = text.trim().slice(0, aiConfig.ttsMaxChars);
  const payload: Record<string, string> = { input: trimmed };
  if (aiConfig.ttsModel) payload.model = aiConfig.ttsModel;
  const chosen = voice || aiConfig.ttsVoice;
  if (chosen) payload.voice = chosen;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), aiConfig.ttsTimeoutMs);
  try {
    const res = await fetch(`${aiConfig.ttsBaseUrl}/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new TtsError(`Speech synthesis failed (HTTP ${res.status}).`, 502);
    }
    const buffer = new Uint8Array(await res.arrayBuffer());
    return {
      audio: buffer,
      contentType: res.headers.get("content-type") || "audio/wav",
    };
  } catch (err) {
    if (err instanceof TtsError) throw err;
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Speech synthesis timed out."
        : "Could not reach the speech service.";
    throw new TtsError(message, 503);
  } finally {
    clearTimeout(timer);
  }
}
