import { afterEach, describe, expect, it, vi } from "vitest";
import { aiConfig } from "@/lib/ai/config";
import { checkTtsHealth, synthesizeSpeech, TtsError } from "@/lib/ai/tts";

describe("ai tts config", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is OFF by default (empty TTS_BASE_URL)", () => {
    vi.stubEnv("TTS_BASE_URL", "");
    expect(aiConfig.ttsEnabled).toBe(false);
  });

  it("is ON only when TTS_BASE_URL is set, and normalises it", () => {
    vi.stubEnv("TTS_BASE_URL", "http://localhost:9100/");
    expect(aiConfig.ttsEnabled).toBe(true);
    expect(aiConfig.ttsBaseUrl).toBe("http://localhost:9100");
  });

  it("caps a single synthesis request in characters", () => {
    vi.stubEnv("TTS_MAX_CHARS", "100");
    expect(aiConfig.ttsMaxChars).toBe(100);
  });
});

describe("ai tts adapter", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reports not-configured when disabled", async () => {
    vi.stubEnv("TTS_BASE_URL", "");
    const health = await checkTtsHealth();
    expect(health.configured).toBe(false);
    expect(health.ok).toBe(false);
  });

  it("reports ok when the server answers", async () => {
    vi.stubEnv("TTS_BASE_URL", "http://tts.test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        expect(url).toBe("http://tts.test/health");
        expect(init?.signal).toBeDefined();
        return { ok: true, status: 200 } as Response;
      }),
    );
    const health = await checkTtsHealth(1000);
    expect(health.ok).toBe(true);
  });

  it("refuses to synthesise when disabled", async () => {
    vi.stubEnv("TTS_BASE_URL", "");
    await expect(synthesizeSpeech("hello")).rejects.toBeInstanceOf(TtsError);
  });

  it("sends input/model/voice and returns audio bytes", async () => {
    vi.stubEnv("TTS_BASE_URL", "http://tts.test");
    vi.stubEnv("TTS_MODEL", "piper");
    const body = new Uint8Array([1, 2, 3]).buffer;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const sent = JSON.parse(String(init?.body ?? "{}")) as Record<string, string>;
        expect(url).toBe("http://tts.test/synthesize");
        expect(sent.input).toBe("hello world");
        expect(sent.model).toBe("piper");
        expect(sent.voice).toBe("male-en");
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "audio/wav" }),
          arrayBuffer: async () => body,
        } as unknown as Response;
      }),
    );
    const audio = await synthesizeSpeech("hello world", "male-en");
    expect([...audio.audio]).toEqual([1, 2, 3]);
    expect(audio.contentType).toBe("audio/wav");
  });
});