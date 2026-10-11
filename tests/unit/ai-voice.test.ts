import { afterEach, describe, expect, it, vi } from "vitest";
import { aiConfig } from "@/lib/ai/config";
import {
  VOICE_LANGUAGES,
  VOICE_MAX_SECONDS,
  normalizeLanguage,
  normalizeTranscript,
} from "@/lib/ai/voice-languages";

describe("voice languages", () => {
  it("offers auto, English and Urdu", () => {
    const codes = VOICE_LANGUAGES.map((l) => l.code);
    expect(codes).toEqual(["auto", "en", "ur"]);
  });

  it("normalizes language tags onto supported codes", () => {
    expect(normalizeLanguage("en")).toBe("en");
    expect(normalizeLanguage("en-US")).toBe("en");
    expect(normalizeLanguage("UR")).toBe("ur");
    expect(normalizeLanguage("ur-PK")).toBe("ur");
    expect(normalizeLanguage("")).toBe("auto");
    expect(normalizeLanguage(null)).toBe("auto");
    expect(normalizeLanguage("fr")).toBe("auto");
  });

  it("collapses whitespace the model may echo back", () => {
    expect(normalizeTranscript("  hello   world \n")).toBe("hello world");
    expect(normalizeTranscript("a\t\tb")).toBe("a b");
    expect(normalizeTranscript("   ")).toBe("");
  });

  it("caps recordings at a sane length", () => {
    expect(VOICE_MAX_SECONDS).toBeGreaterThan(0);
    expect(VOICE_MAX_SECONDS).toBeLessThanOrEqual(300);
  });
});

describe("voice config", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is disabled until STT_BASE_URL is set", () => {
    vi.stubEnv("STT_BASE_URL", "");
    expect(aiConfig.sttEnabled).toBe(false);
  });

  it("enables and normalizes the base URL when set", () => {
    vi.stubEnv("STT_BASE_URL", "http://localhost:9000/");
    expect(aiConfig.sttEnabled).toBe(true);
    expect(aiConfig.sttBaseUrl).toBe("http://localhost:9000");
  });

  it("defaults the upload and duration caps", () => {
    vi.stubEnv("STT_MAX_UPLOAD_BYTES", "");
    vi.stubEnv("STT_MAX_SECONDS", "");
    expect(aiConfig.sttMaxUploadBytes).toBe(8_000_000);
    expect(aiConfig.sttMaxSeconds).toBe(120);
  });
});
