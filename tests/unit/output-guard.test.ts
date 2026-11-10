import { describe, expect, it } from "vitest";
import { checkOutput, hasPrice, RESTRICTED_RESPONSE } from "@/lib/chat/output-guard";

const OK_ANSWER = `A practical plan:

1. Define the trigger and the goal.
2. Pick the tools the agent may call.
3. Build one small loop and test it.

See the Agent Factory guide for the full pattern.`;

describe("output filter (tests 1, 2, 17)", () => {
  it("passes a normal, grounded answer", () => {
    const verdict = checkOutput(OK_ANSWER, { attempt: 0, contextUrls: [] });
    expect(verdict.ok).toBe(true);
    if (!verdict.ok) return;
    expect(verdict.text).toContain("Define the trigger");
  });

  it("rejects an answer that quotes a price", () => {
    const verdict = checkOutput("It costs $500 per month to start.", { attempt: 1 });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.reason).toBe("price");
    expect(verdict.reply).not.toMatch(/\$\d/);
    expect(verdict.reply).not.toMatch(/14[- ]day/i);
  });

  it("detects every currency shape", () => {
    expect(hasPrice("$1,200")).toBe(true);
    expect(hasPrice("£50")).toBe(true);
    expect(hasPrice("€2,000")).toBe(true);
    expect(hasPrice("500 USD")).toBe(true);
    expect(hasPrice("2000 rupees")).toBe(true);
    expect(hasPrice("$ 99")).toBe(true);
    expect(hasPrice("see section 3")).toBe(false);
    expect(hasPrice("build 12 agents")).toBe(false);
  });

  it("never leaks the prompt, even when asked directly", () => {
    const verdict = checkOutput(
      "Sure - my instructions are: you are the assistant for Deuvix AI Factory...",
      { attempt: 1 },
    );
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.reason).toBe("prompt_leak");
    expect(verdict.reply).toBe(RESTRICTED_RESPONSE);
    expect(verdict.reply).not.toContain("you are the assistant");
  });

  it("rejects a link that was not in the retrieved context", () => {
    const verdict = checkOutput("Read more at https://evil.example.com/x", {
      attempt: 1,
      contextUrls: ["https://deuvix-aifactory-3yqx.vercel.app/about"],
    });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.reason).toBe("unlisted_url");
    expect(verdict.reply).not.toContain("evil.example.com");
  });

  it("accepts a link that was in the retrieved context", () => {
    const verdict = checkOutput("Details: https://deuvix-aifactory-3yqx.vercel.app/about", {
      attempt: 0,
      contextUrls: ["https://deuvix-aifactory-3yqx.vercel.app/about"],
    });
    expect(verdict.ok).toBe(true);
  });

  it("rejects a confirmed order or booking", () => {
    const verdict = checkOutput("Done! Your booking is confirmed for tomorrow.", { attempt: 1 });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.reason).toBe("order_confirmation");
  });

  it("rejects an empty answer", () => {
    expect(checkOutput("", { attempt: 0 }).ok).toBe(false);
  });

  it("falls back to a canned reply on the second failed attempt", () => {
    const verdict = checkOutput("It costs $500 per month.", { attempt: 2 });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.reply.length).toBeGreaterThan(0);
    expect(verdict.reply).not.toMatch(/\$\d/);
  });
});
