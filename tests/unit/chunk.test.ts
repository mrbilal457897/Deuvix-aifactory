import { describe, expect, it } from "vitest";
import { chunkBlocks, type Block } from "../../scripts/lib/content";

/** A page that alternates heading/paragraph — the shape that used to produce
 *  one chunk per paragraph and burn the embedding quota. */
function alternating(paragraphs: number): Block[] {
  return Array.from({ length: paragraphs }, (_, i) => ({
    heading: `Section ${i}`,
    text: `Paragraph body number ${i}. `.repeat(8),
  }));
}

describe("chunkBlocks", () => {
  it("merges heading-heavy pages instead of emitting one chunk per paragraph", () => {
    const blocks = alternating(15);
    const chunks = chunkBlocks(blocks, { targetChars: 700 });

    expect(chunks.length).toBeLessThan(blocks.length);
    expect(chunks.length).toBeLessThan(Math.ceil(blocks.length / 2));
    expect(chunks.every((c) => c.text.length >= 40)).toBe(true);
  });

  it("respects the target size", () => {
    const blocks: Block[] = Array.from({ length: 40 }, (_, i) => ({
      heading: "Same heading",
      text: `Sentence ${i} `.repeat(20),
    }));
    const chunks = chunkBlocks(blocks, { targetChars: 700 });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThan(1400);
    }
  });

  it("carries a section title into the chunk that follows it", () => {
    const blocks: Block[] = [
      { heading: "Alpha", text: "A".repeat(300) },
      { heading: "Beta", text: "B".repeat(300) },
      { heading: "Gamma", text: "C".repeat(300) },
    ];
    const chunks = chunkBlocks(blocks, { targetChars: 700 });

    expect(chunks.length).toBe(2);
    expect(chunks[0].heading).toBe("Alpha");
    expect(chunks[0].text).toContain("Beta");
    expect(chunks[1].heading).toBe("Gamma");
    expect(chunks[1].text).toContain("C".repeat(50));
  });

  it("drops fragments too small to be useful", () => {
    const blocks: Block[] = [
      { heading: "Only heading", text: "" },
      { heading: "Only heading", text: "ok" },
      { heading: "Only heading", text: "x" },
    ];
    expect(chunkBlocks(blocks)).toHaveLength(0);
  });

  it("labels each chunk with the heading it opened with", () => {
    const blocks: Block[] = [
      { heading: "First", text: "one ".repeat(50) },
      { heading: "First", text: "two ".repeat(50) },
      { heading: "Second", text: "three ".repeat(50) },
    ];
    const chunks = chunkBlocks(blocks, { targetChars: 700 });
    expect(chunks[0].heading).toBe("First");
    expect(chunks.map((c) => c.heading)).toContain("Second");
  });
});
