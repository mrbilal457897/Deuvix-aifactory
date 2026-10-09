/**
 * HTML -> structured text helpers for the knowledge-base ingest.
 *
 * Kept in scripts/ (not src/) so nothing here can be pulled into a client
 * bundle. jsdom is a devDependency and only ever loaded by the ingest CLI.
 */

import { createHash } from "node:crypto";
import { JSDOM } from "jsdom";

export interface Block {
  /** Nearest heading above this block, used as chunk context. */
  heading: string;
  text: string;
}

export interface PageContent {
  title: string;
  blocks: Block[];
}

/** Anything that looks like a price, plan, trial or billing period. */
export const CURRENCY_RE = new RegExp(
  [
    "[$€£¥]\\s?\\d[\\d,.]*",
    "\\b\\d[\\d,.]*\\s?(?:usd|pkr|eur|gbp|aed)\\b",
    "[$€£¥]\\s?(?:\\d[\\d,.]*)?\\s*(?:/|per)\\s?(?:mo(?:nth)?|yr|year|user|seat)",
    "\\b(?:per month|monthly|annually|yearly) billing\\b",
    "\\b\\d{1,3}\\s?[- ]?day free trial\\b",
    "\\bfree trial\\b",
    "\\b(?:starter|professional|enterprise) plan\\b",
  ].join("|"),
  "i",
);

const DROP_SELECTOR = [
  "script",
  "style",
  "noscript",
  "svg",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  "button",
  "input",
  "textarea",
  "select",
  "iframe",
  "dialog",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
  "[aria-hidden='true']",
].join(",");

function normalize(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, " ").trim();
}

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 40);
}

function pickContainer(doc: Document): Element {
  return (
    doc.querySelector("main article") ||
    doc.querySelector("article") ||
    doc.querySelector("main") ||
    doc.querySelector("[role='main']") ||
    doc.body
  );
}

/** Removes whole nodes whose id/class signals a pricing block. */
function removePricingNodes(container: Element): void {
  const candidates = Array.from(container.querySelectorAll("[id], [class]"));
  for (const el of candidates) {
    if (!el.isConnected) continue;
    const haystack = `${el.id || ""} ${el.getAttribute("class") || ""}`.toLowerCase();
    if (/\bpric(e|ing)|plan-?card|rate-?card|billing\b/.test(haystack) && el !== container) {
      el.remove();
    }
  }
}

export interface ExtractOptions {
  /** Strip every price, plan, trial and billing reference (Source A only). */
  stripPricing?: boolean;
}

export function extractPage(html: string, opts: ExtractOptions = {}): PageContent {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const container = pickContainer(doc);
  const title =
    normalize(doc.querySelector("main h1, article h1, h1")?.textContent || doc.title || "") ||
    "Untitled";

  // Drop global chrome before walking blocks.
  for (const el of Array.from(container.querySelectorAll(DROP_SELECTOR))) el.remove();
  if (opts.stripPricing) removePricingNodes(container);

  const blocks: Block[] = [];
  let heading = "";
  let lastText = "";

  const nodes = container.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,blockquote,pre");
  for (const node of nodes) {
    if (!node.isConnected || node.closest(DROP_SELECTOR)) continue;

    const tag = node.tagName.toLowerCase();
    const raw = tag === "pre" ? node.textContent || "" : normalize(node.textContent || "");
    if (!raw) continue;

    if (/^h[1-6]$/.test(tag)) {
      heading = raw.slice(0, 160);
      continue;
    }

    if (raw === lastText) continue;
    lastText = raw;

    if (opts.stripPricing && tag !== "pre" && CURRENCY_RE.test(raw)) continue;
    if (raw.length < 3) continue;

    blocks.push({ heading, text: raw });
  }

  return { title, blocks };
}

export interface Chunk {
  index: number;
  heading: string;
  text: string;
}

/**
 * Groups blocks into ~700-character chunks with a small overlap, so a single
 * answer can cite the page without dragging the whole page into the prompt.
 *
 * Heading changes are only treated as a section break once the current chunk is
 * already substantial. Without that, a heading-heavy page (h2, p, h3, p …)
 * produces one chunk per paragraph: embedding quota is counted per request, so
 * that wastes the budget and gives the retriever tiny, context-free fragments.
 * Headings encountered mid-chunk are written into the text so the embedding
 * still sees which section it is reading.
 */
export function chunkBlocks(
  blocks: Block[],
  opts: { targetChars?: number; overlapChars?: number } = {},
): Chunk[] {
  const target = opts.targetChars ?? 700;
  const overlap = opts.overlapChars ?? 120;
  // Only pay for a new chunk on a heading boundary once the current one is
  // close to full — every extra chunk is an extra embedding request against the
  // 1000/day free tier, and a half-empty chunk wastes retrieval precision too.
  const minBeforeHeadingBreak = Math.round(target * 0.9);

  const chunks: Chunk[] = [];
  let texts: string[] = [];
  let heading = "";
  let openHeading = "";
  let size = 0;

  const flush = () => {
    if (!texts.length) return;
    chunks.push({
      index: chunks.length,
      heading,
      text: texts.join("\n\n").trim(),
    });
    texts = [];
    heading = "";
    size = 0;
  };

  for (const block of blocks) {
    if (block.heading && block.heading !== openHeading) {
      if (texts.length && size >= minBeforeHeadingBreak) flush();
      openHeading = block.heading;
      if (!texts.length) heading = block.heading;
    }

    if (size + block.text.length > target && texts.length > 0) {
      const carried = texts[texts.length - 1];
      const tail = carried.length > overlap ? carried.slice(-overlap) : carried;
      flush();
      if (!heading) heading = openHeading;
      if (tail) {
        texts.push(tail);
        size = tail.length;
      }
    }

    const payload =
      texts.length > 0 && block.heading && block.heading !== heading
        ? `${block.heading}\n${block.text}`
        : block.text;
    texts.push(payload);
    size += payload.length + 2;
    if (!heading) heading = block.heading || openHeading;
  }

  flush();
  return chunks.filter((c) => c.text.length >= 40);
}
