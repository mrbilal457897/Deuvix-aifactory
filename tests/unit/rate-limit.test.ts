import { describe, expect, it } from "vitest";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows up to the limit, then blocks", () => {
    const key = "test:allow-block";
    for (let i = 0; i < 3; i += 1) expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(false);
  });

  it("keeps different keys independent", () => {
    const a = "test:key-a";
    const b = "test:key-b";
    expect(checkRateLimit(a, 1, 60_000)).toBe(true);
    expect(checkRateLimit(a, 1, 60_000)).toBe(false);
    expect(checkRateLimit(b, 1, 60_000)).toBe(true);
  });

  it("forgets attempts once the window passes", async () => {
    const key = "test:window";
    expect(checkRateLimit(key, 1, 30)).toBe(true);
    expect(checkRateLimit(key, 1, 30)).toBe(false);
    await new Promise((r) => setTimeout(r, 50));
    expect(checkRateLimit(key, 1, 30)).toBe(true);
  });
});

describe("getClientIp", () => {
  it("prefers the first x-forwarded-for hop", () => {
    const req = new Request("http://localhost/api/chat", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("203.0.113.7");
  });

  it("falls back without leaking the header", () => {
    const req = new Request("http://localhost/api/chat");
    expect(getClientIp(req)).toBe("unknown");
  });
});
