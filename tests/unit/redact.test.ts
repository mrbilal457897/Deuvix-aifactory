import { describe, expect, it } from "vitest";
import { hasPaymentData, redact, stripCardNumbers } from "@/lib/chat/redact";

describe("stripCardNumbers", () => {
  it.each([
    "4111111111111111",
    "4111 1111 1111 1111",
    "4111-1111-1111-1111",
    "5500 0000 0000 0004",
    "3400 0000 0000 009",
  ])("removes %s", (card) => {
    const { text, found } = stripCardNumbers(`my card is ${card} thanks`);
    expect(found).toBe(true);
    expect(text).not.toContain(card.replace(/[\s-]/g, "").slice(0, 4));
    expect(text).toContain("my card is");
  });

  it("leaves ordinary numbers alone", () => {
    expect(stripCardNumbers("I have 5 agents").found).toBe(false);
    expect(stripCardNumbers("room 4111 is fine").found).toBe(false);
  });
});

describe("hasPaymentData", () => {
  it("detects card and CVV material", () => {
    expect(hasPaymentData("card 4111 1111 1111 1111")).toBe(true);
    expect(hasPaymentData("IBAN PK36 SCBL 0000 0011 2345 6702")).toBe(true);
    expect(hasPaymentData("cvv 123")).toBe(true);
  });

  it("does not treat a password as payment data (it is a secret instead)", () => {
    expect(hasPaymentData("my password is hunter2")).toBe(false);
  });

  it("ignores ordinary chat", () => {
    expect(hasPaymentData("How do I build an AI agent?")).toBe(false);
  });
});

describe("redact", () => {
  it("masks payment material", () => {
    const out = redact("card 4111 1111 1111 1111", false);
    expect(out.text).not.toContain("4111 1111");
    expect(out.hitPayment).toBe(true);
  });

  it("masks secrets", () => {
    const out = redact("password hunter2", false);
    expect(out.text).not.toContain("hunter2");
    expect(out.hitSecret).toBe(true);
  });

  it("keeps the sentence readable when there is nothing to hide", () => {
    const out = redact("How do I build an AI agent?", false);
    expect(out.text).toBe("How do I build an AI agent?");
    expect(out.hitPayment).toBe(false);
    expect(out.hitSecret).toBe(false);
  });

  it("only masks PII when asked to", () => {
    const keep = redact("reach me at sam@example.com", false);
    expect(keep.text).toContain("sam@example.com");
    expect(keep.hitPii).toBe(false);

    const masked = redact("reach me at sam@example.com", true);
    expect(masked.text).not.toContain("sam@example.com");
    expect(masked.hitPii).toBe(true);
  });
});
