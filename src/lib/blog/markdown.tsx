/**
 * Minimal markdown rendering for the local blog bodies.
 * Handles: ## / ### headings, paragraphs, unordered + ordered lists, pipe tables,
 * and inline **bold** / *italic*. Everything is rendered as React elements —
 * no HTML string injection.
 */
import React from "react";

type Block =
  | { type: "h2" | "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] };

function isTableRow(line: string) {
  return line.trim().startsWith("|") && line.trim().endsWith("|");
}
function splitRow(line: string) {
  return line
    .trim()
    .slice(1, -1)
    .split("|")
    .map((c) => c.trim());
}
function isSeparatorRow(line: string) {
  return splitRow(line).every((c) => /^:?-{2,}:?$/.test(c));
}

function parseBlocks(source: string): Block[] {
  const lines = source.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  const push = (b: Block) => blocks.push(b);

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      push({ type: "h2", text: trimmed.slice(4).trim() });
      i += 1;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      push({ type: "h2", text: trimmed.slice(3).trim() });
      i += 1;
      continue;
    }
    if (isTableRow(trimmed)) {
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i].trim())) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      if (rows.length >= 2 && isSeparatorRow(rows[1].join("|"))) {
        push({ type: "table", head: rows[0], rows: rows.slice(2) });
      } else if (rows.length >= 1) {
        push({ type: "table", head: rows[0], rows: rows.slice(1) });
      }
      continue;
    }
    if (/^-\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^-\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().slice(2).trim());
        i += 1;
      }
      push({ type: "ul", items });
      continue;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      push({ type: "ol", items });
      continue;
    }
    // paragraph: accumulate until blank line or heading/table/list
    const buf: string[] = [];
    while (i < lines.length) {
      const l = lines[i].trim();
      if (!l || l.startsWith("##") || isTableRow(l) || /^-\s+/.test(l) || /^\d+\.\s+/.test(l)) break;
      buf.push(l);
      i += 1;
    }
    push({ type: "p", text: buf.join(" ") });
  }
  return blocks;
}

/** Inline parser for **bold** and *italic*; everything else stays literal text. */
export function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={`b-${key++}`}>{token.slice(2, -2)}</strong>,
      );
    } else {
      parts.push(
        <em key={`i-${key++}`}>{token.slice(1, -1)}</em>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function renderMarkdown(source: string): React.ReactNode {
  const blocks = parseBlocks(source);
  return blocks.map((block, i) => {
    switch (block.type) {
      case "h2":
        return (
          <h2 id={headingId(block.text)} key={i} className="font-heading h2-sm mt-10 mb-4 text-foreground">
            {renderInline(block.text)}
          </h2>
        );
      case "h3":
        return null;
      case "p":
        return (
          <p key={i} className="text-base leading-relaxed text-foreground/90">
            {renderInline(block.text)}
          </p>
        );
      case "ul":
        return (
          <ul key={i} className="list-disc space-y-2 pl-5 text-base leading-relaxed text-foreground/90">
            {block.items.map((item, j) => (
              <li key={j}>{renderInline(item)}</li>
            ))}
          </ul>
        );
      case "ol":
        return (
          <ol key={i} className="list-decimal space-y-2 pl-5 text-base leading-relaxed text-foreground/90">
            {block.items.map((item, j) => (
              <li key={j}>{renderInline(item)}</li>
            ))}
          </ol>
        );
      case "table":
        return (
          <div className="overflow-x-auto my-6" key={i}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {block.head.map((cell, j) => (
                    <th key={j} scope="col" className="px-3 py-2 font-semibold text-foreground">
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r} className="border-b border-border align-top">
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 text-foreground/90">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  });
}

/** Slug used both for the heading anchor and the table of contents. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

/** Returns section anchors for the table of contents — h2s when present, else h3s. */
export function tocFor(source: string): Array<{ id: string; text: string }> {
  const blocks = parseBlocks(source);
  const h2s = blocks.filter((b) => b.type === "h2");
  const pool = h2s.length > 0 ? h2s : blocks.filter((b) => b.type === "h3");
  return pool.map((b) => {
    const entry = b as { type: "h2" | "h3"; text: string };
    return { id: headingId(entry.text), text: entry.text };
  });
}

/** Crude "words per minute" read-time. */
export function readingTimeMinutes(source: string): number {
  const words = source.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}
