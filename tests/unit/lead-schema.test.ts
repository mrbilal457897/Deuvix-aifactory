import { describe, expect, it } from "vitest";
import { leadSchema } from "@/lib/chat/lead-handoff";
import { chatConfig } from "@/lib/chat/config";

describe("lead schema (consent is mandatory)", () => {
  const valid = {
    name: "Sam Ali",
    contact: "sam@example.com",
    summary: "I want an agent that triages inbound leads for my clinic.",
    consent: true,
  };

  it("accepts a complete, consented lead", () => {
    expect(leadSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a phone number as the contact", () => {
    expect(leadSchema.safeParse({ ...valid, contact: "+92 300 1234567" }).success).toBe(true);
  });

  it("rejects a missing consent tick", () => {
    const res = leadSchema.safeParse({ ...valid, consent: false });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.issues[0].path).toContain("consent");
  });

  it("rejects a short name, bad contact and thin summary", () => {
    expect(leadSchema.safeParse({ ...valid, name: "S" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, contact: "nope" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, summary: "help" }).success).toBe(false);
  });
});

describe("chat configuration", () => {
  it("hard-clamps temperature to 0.3", () => {
    expect(chatConfig.temperature).toBeLessThanOrEqual(0.3);
    const previous = process.env.CHAT_TEMPERATURE;
    process.env.CHAT_TEMPERATURE = "1.5";
    expect(chatConfig.temperature).toBeLessThanOrEqual(0.3);
    if (previous === undefined) delete process.env.CHAT_TEMPERATURE;
    else process.env.CHAT_TEMPERATURE = previous;
  });

  it("caps user input at 1000 characters", () => {
    expect(chatConfig.maxInputChars).toBe(1000);
  });

  it("keeps retrieval inside a sane top-k", () => {
    expect(chatConfig.topKRetrieval).toBeGreaterThan(0);
    expect(chatConfig.topKRetrieval).toBeLessThanOrEqual(12);
  });

  it("falls back to the Google SDK key name, preferring GEMINI_API_KEY", () => {
    const prevGemini = process.env.GEMINI_API_KEY;
    const prevGoogle = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    try {
      delete process.env.GEMINI_API_KEY;
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = "  google-key  ";
      expect(chatConfig.apiKey).toBe("google-key");

      process.env.GEMINI_API_KEY = " gemini-key ";
      expect(chatConfig.apiKey).toBe("gemini-key");
    } finally {
      if (prevGemini === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = prevGemini;
      if (prevGoogle === undefined) delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      else process.env.GOOGLE_GENERATIVE_AI_API_KEY = prevGoogle;
    }
  });
});
