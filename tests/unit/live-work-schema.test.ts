import { describe, expect, it } from "vitest";
import {
  dedupeSlug,
  fieldError,
  normalizeProjectInput,
  parseProjectInput,
  slugify,
} from "@/lib/live-work/schema";
import { DESCRIPTION_MAX } from "@/lib/live-work/types";

const validThumbnail = {
  url: "https://images.example.com/desktop.png",
  path: "projects/desktop.png",
  width: 1600,
  height: 1000,
  alt: "Dashboard screenshot",
};

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Outbound Qualification Agent",
    slug: "outbound-qualification-agent",
    description: "Screens inbound leads, books qualified calls and logs every touch to CRM.",
    status: "published",
    featured: false,
    order: 0,
    stats: [
      { value: "7 days", label: "To go live" },
      { value: "312", label: "Leads per wk" },
      { value: "68%", label: "Qualified" },
    ],
    tags: ["Sales Ops", "CRM", "Agents"],
    desktopThumbnail: validThumbnail,
    mobileThumbnail: { ...validThumbnail, url: "https://images.example.com/mobile.png", width: 900, height: 1920 },
    ...overrides,
  };
}

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Outbound Qualification Agent")).toBe("outbound-qualification-agent");
  });

  it("strips accents, punctuation and leading/trailing hyphens", () => {
    expect(slugify("  Ops — Loop!  ")).toBe("ops-loop");
    expect(slugify("Crème Brûlée Agent")).toBe("creme-brulee-agent");
  });

  it("never produces an empty slug", () => {
    expect(slugify("!!!")).toBe("");
  });

  it("caps the length at 80 characters", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe("dedupeSlug", () => {
  it("returns the base slug when it is free", () => {
    expect(dedupeSlug("voice-support-agent", [])).toBe("voice-support-agent");
  });

  it("appends -2, -3, … until the slug is free", () => {
    const taken = ["voice-support-agent", "voice-support-agent-2", "voice-support-agent-3"];
    expect(dedupeSlug("voice-support-agent", taken)).toBe("voice-support-agent-4");
  });

  it("works with a Set as well as an array", () => {
    expect(dedupeSlug("ops-loop-agent", new Set(["ops-loop-agent"]))).toBe("ops-loop-agent-2");
  });

  it("falls back when the name yields no slug at all", () => {
    expect(dedupeSlug("!!!", [])).toBe("project");
  });
});

describe("normalizeProjectInput", () => {
  it("turns empty strings into undefined so optional fields validate", () => {
    const normalized = normalizeProjectInput({
      name: "  Agent  ",
      slug: "Agent-Slug",
      liveUrl: "",
      chipTitle: "   ",
      unitId: "FTE-004",
    });
    expect(normalized.name).toBe("Agent");
    expect(normalized.slug).toBe("agent-slug");
    expect(normalized.liveUrl).toBeUndefined();
    expect(normalized.chipTitle).toBeUndefined();
    expect(normalized.unitId).toBe("FTE-004");
  });

  it("trims tags and drops the empty slots", () => {
    const normalized = normalizeProjectInput({
      tags: [" CRM ", "", "Agents", "Sales", "Ops", "Extra"],
    });
    expect(normalized.tags).toEqual(["CRM", "Agents", "Sales", "Ops", "Extra"]);
  });
});

describe("projectInputSchema", () => {
  it("accepts a complete project", () => {
    const result = parseProjectInput(validInput());
    expect(result.success).toBe(true);
  });

  it("rejects a description over 280 characters", () => {
    const result = parseProjectInput(validInput({ description: "x".repeat(DESCRIPTION_MAX + 1) }));
    expect(result.success).toBe(false);
    expect(fieldError(result, "description")).toContain(`Max ${DESCRIPTION_MAX}`);
  });

  it("treats stats as optional: 0–3 rows, half-filled rows dropped", () => {
    // No stats at all.
    const none = validInput();
    none.stats = [];
    expect(parseProjectInput(none).success).toBe(true);

    // One or two rows are fine too.
    const two = validInput();
    two.stats = two.stats.slice(0, 2);
    expect(parseProjectInput(two).success).toBe(true);

    // Four rows are not.
    const four = validInput();
    four.stats = [...four.stats, { value: "9x", label: "Output" }];
    expect(parseProjectInput(four).success).toBe(false);

    // Empty slots are filtered out instead of failing validation.
    const padded = validInput();
    padded.stats = [...padded.stats.slice(0, 1), { value: "", label: "" }, { value: "", label: "" }];
    const result = parseProjectInput(padded);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.stats).toHaveLength(1);
  });

  it("allows up to four tags but not five", () => {
    expect(parseProjectInput(validInput({ tags: ["a", "b", "c", "d"] })).success).toBe(true);
    expect(parseProjectInput(validInput({ tags: ["a", "b", "c", "d", "e"] })).success).toBe(false);
  });

  it("requires both screenshots", () => {
    const missing = validInput();
    delete (missing as Record<string, unknown>).mobileThumbnail;
    const result = parseProjectInput(missing);
    expect(result.success).toBe(false);
    expect(fieldError(result, "mobileThumbnail")).toBeDefined();
  });

  it("rejects a non-http thumbnail URL", () => {
    const result = parseProjectInput(
      validInput({ desktopThumbnail: { ...validThumbnail, url: "/local/path.png" } })
    );
    expect(result.success).toBe(false);
    expect(fieldError(result, "desktopThumbnail")).toBeDefined();
  });

  it("rejects an uppercase or spaced slug", () => {
    expect(parseProjectInput(validInput({ slug: "Outbound Agent" })).success).toBe(false);
    expect(parseProjectInput(validInput({ slug: "outbound_agent" })).success).toBe(false);
  });

  it("only accepts draft or published", () => {
    expect(parseProjectInput(validInput({ status: "Active" })).success).toBe(false);
    expect(parseProjectInput(validInput({ status: "draft" })).success).toBe(true);
  });

  it("defaults order, content and gallery when omitted", () => {
    const input = validInput();
    delete (input as Record<string, unknown>).order;
    const result = parseProjectInput(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.order).toBe(0);
      expect(result.data.content).toBe("");
      expect(result.data.gallery).toEqual([]);
    }
  });
});
