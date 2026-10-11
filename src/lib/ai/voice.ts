import { aiConfig } from "./config";
import { normalizeTranscript, type VoiceLanguage } from "./voice-languages";

/**
 * Adapter for a self-hosted speech-to-text server (faster-whisper behind a
 * small FastAPI/OpenAI-compatible endpoint). The server is optional: when
 * STT_BASE_URL is unset, voice is simply "not configured" and never errors.
 *
 * Transcription only produces text. It is returned to the client for the admin
 * to REVIEW and edit before sending — nothing is executed automatically.
 */

export interface SttHealth {
  ok: boolean;
  /** False when STT_BASE_URL is unset; the UI hides voice entirely. */
  configured: boolean;
  baseUrl: string;
  model?: string;
  error?: string;
}

export class VoiceError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "VoiceError";
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  return aiConfig.sttApiKey ? { Authorization: `Bearer ${aiConfig.sttApiKey}` } : {};
}

export async function checkSttHealth(timeoutMs = 4000): Promise<SttHealth> {
  const base: SttHealth = {
    ok: false,
    configured: aiConfig.sttEnabled,
    baseUrl: aiConfig.sttBaseUrl,
    model: aiConfig.sttModel || undefined,
  };
  if (!aiConfig.sttEnabled) return { ...base, error: "not configured" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${aiConfig.sttBaseUrl}/health`, {
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

function filenameFor(mimeType: string): string {
  if (mimeType.includes("wav")) return "audio.wav";
  if (mimeType.includes("ogg")) return "audio.ogg";
  if (mimeType.includes("mp4") || mimeType.includes("m4a") || mimeType.includes("aac")) {
    return "audio.m4a";
  }
  return "audio.webm";
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  durationMs?: number;
}

export async function transcribeAudio(
  bytes: Buffer,
  mimeType: string,
  language: VoiceLanguage,
): Promise<TranscriptionResult> {
  if (!aiConfig.sttEnabled) {
    throw new VoiceError("Voice input is not configured.", 503);
  }

  const form = new FormData();
  const audioBytes = Uint8Array.from(bytes).buffer;
  form.append("file", new Blob([audioBytes], { type: mimeType }), filenameFor(mimeType));
  if (language !== "auto") form.append("language", language);
  if (aiConfig.sttModel) form.append("model", aiConfig.sttModel);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), aiConfig.sttTimeoutMs);
  try {
    const res = await fetch(`${aiConfig.sttBaseUrl}/transcribe`, {
      method: "POST",
      body: form,
      headers: authHeaders(),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new VoiceError(
        `Transcription failed (HTTP ${res.status}).${detail ? ` ${detail.slice(0, 200)}` : ""}`,
        res.status === 413 ? 413 : 502,
      );
    }

    const json = (await res.json().catch(() => null)) as
      | { text?: string; language?: string; duration?: number }
      | null;
    const text = normalizeTranscript(json?.text || "");
    if (!text) throw new VoiceError("No speech detected in the recording.", 422);

    return {
      text,
      language: json?.language,
      durationMs: json?.duration != null ? Math.round(json.duration * 1000) : undefined,
    };
  } catch (err) {
    if (err instanceof VoiceError) throw err;
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Transcription timed out."
        : "Could not reach the speech service.";
    throw new VoiceError(message, 503);
  } finally {
    clearTimeout(timer);
  }
}
