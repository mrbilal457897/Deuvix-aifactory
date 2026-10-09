/**
 * A deliberately small Markdown renderer for chat bubbles.
 *
 * It returns React elements only — it never produces an HTML string and is
 * never fed to `dangerouslySetInnerHTML`. That single property is what makes
 * XSS impossible regardless of what the model emits (§8.3).
 *
 * Supported: headings, bullets, ordered lists, blockquotes, fenced code,
 * bold, italic, inline code, links, hard line breaks.
 */

import React, { Fragment } from "react";

/** Absolute http(s), site-relative, or mailto. Everything else is dropped. */
function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (/^https?:\/\//i.test(href)) return href;
  if (/^mailto:[^\s]+$/i.test(href)) return href;
  if (/^\/(?!\/)[^\s]*$/.test(href)) return href;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return null; // javascript:, data:, …
  return href.length > 0 ? href : null;
}

/* -------------------------------------------------------------------------- */
/* Inline                                                                      */
/* -------------------------------------------------------------------------- */

const INLINE_PATTERN = new RegExp(
  [
    "(`[^`\\n]+`)", // 1 inline code
    "(\\*\\*[^*\\n]+\\*\\*)", // 2 bold
    "(__[^_\\n]+__)", // 3 bold alt
    "(\\*[^*\\n]+\\*)", // 4 italic
    "(\\[[^\\]\\n]+\\]\\([^)\\s]+\\))", // 5 link
    "(https?://[^\\s<>()]+)", // 6 bare url
  ].join("|"),
  "g",
);

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  INLINE_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const key = `${keyBase}-i${i++}`;
    const token = match[0];

    if (token.startsWith("`")) {
      out.push(
        <code
          key={key}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**") || token.startsWith("__")) {
      out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      out.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("[")) {
      const close = token.indexOf("](");
      const label = token.slice(1, close);
      const href = safeHref(token.slice(close + 2, -1));
      out.push(
        href ? (
          <a
            key={key}
            href={href}
            className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
            {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer noopener" } : {})}
          >
            {label}
          </a>
        ) : (
          <Fragment key={key}>{label}</Fragment>
        ),
      );
    } else {
      out.push(
        <a
          key={key}
          href={token}
          target="_blank"
          rel="noreferrer noopener"
          className="font-medium text-primary underline underline-offset-2 hover:opacity-80 break-all"
        >
          {token}
        </a>,
      );
    }

    last = match.index + token.length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}

/* -------------------------------------------------------------------------- */
/* Blocks                                                                      */
/* -------------------------------------------------------------------------- */

const BLOCK_TYPES = {
  h1: "text-[1.05rem] font-semibold mt-3 first:mt-0",
  h2: "text-base font-semibold mt-3 first:mt-0",
  h3: "text-[0.95rem] font-semibold mt-3 first:mt-0",
  h4: "text-[0.9rem] font-semibold mt-3 first:mt-0",
  h5: "text-[0.875rem] font-semibold mt-3 first:mt-0",
  h6: "text-[0.85rem] font-semibold mt-3 first:mt-0",
  p: "my-1.5 first:mt-0 last:mb-0",
  quote:
    "border-l-2 border-primary/50 pl-3 my-2 text-muted-foreground italic",
  code: "my-2 rounded-lg bg-foreground/5 border border-border overflow-x-auto p-3 font-mono text-[0.8rem] leading-relaxed whitespace-pre",
} as const;

interface Block {
  kind: "text" | "code";
  /** When kind === "text", the block sub-type. */
  type?: keyof typeof BLOCK_TYPES;
  lines: string[];
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let fence: Block | null = null;
  let bullets: string[] = [];
  let ordered: string[] = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push({ kind: "text", type: "p", lines: bullets.map((b) => `• ${b}`) });
    bullets = [];
  };
  const flushOrdered = () => {
    if (!ordered.length) return;
    blocks.push({
      kind: "text",
      type: "p",
      lines: ordered.map((o, i) => `${i + 1}. ${o}`),
    });
    ordered = [];
  };
  const flushBoth = () => {
    flushBullets();
    flushOrdered();
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");

    // Fenced code — an unterminated fence (mid-stream) is rendered as-is.
    if (line.trimStart().startsWith("```")) {
      if (fence) {
        blocks.push(fence);
        fence = null;
      } else {
        flushBoth();
        fence = { kind: "code", lines: [] };
      }
      continue;
    }
    if (fence) {
      fence.lines.push(line);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      flushOrdered();
      bullets.push(line.replace(/^\s*[-*+]\s+/, ""));
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      flushBullets();
      ordered.push(line.replace(/^\s*\d+[.)]\s+/, ""));
      continue;
    }

    flushBoth();

    if (line.trim() === "") {
      blocks.push({ kind: "text", type: "p", lines: [""] });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      // Chat bubbles run small, so markdown h1 lands on <h4>, h2 on <h5>,
      // h3 and deeper on <h6>. Never a real <h1>/<h2> inside a widget.
      const level = Math.min(heading[1].length + 3, 6);
      blocks.push({
        kind: "text",
        type: (level === 4 ? "h4" : level === 5 ? "h5" : "h6") as "h4" | "h5" | "h6",
        lines: [heading[2]],
      });
      continue;
    }

    if (line.startsWith("> ")) {
      blocks.push({ kind: "text", type: "quote", lines: [line.slice(2)] });
      continue;
    }

    // Merge consecutive plain lines into one paragraph (soft wraps).
    const prev = blocks[blocks.length - 1];
    if (prev && prev.kind === "text" && prev.type === "p" && !/^\s*$/.test(prev.lines[prev.lines.length - 1])) {
      prev.lines.push(line);
    } else {
      blocks.push({ kind: "text", type: "p", lines: [line] });
    }
  }

  if (fence) blocks.push(fence);
  flushBoth();

  return blocks;
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  const blocks = parseBlocks(content);

  return (
    <div className={["text-sm leading-relaxed", className].filter(Boolean).join(" ")} dir="auto">
      {blocks.map((block, bi) => {
        if (block.kind === "code") {
          return (
            <pre key={`b${bi}`} className={BLOCK_TYPES.code}>
              <code>{block.lines.join("\n")}</code>
            </pre>
          );
        }

        const type = block.type ?? "p";

        // Code-fence-less plain text still needs links expanded.
        const contentNodes = renderInline(block.lines.join("\n"), `b${bi}`);

        if (type === "h4" || type === "h5" || type === "h6") {
          const Tag = type;
          return (
            <Tag key={`b${bi}`} className={`${BLOCK_TYPES[type]} font-heading`}>
              {contentNodes}
            </Tag>
          );
        }
        if (type === "quote") {
          return (
            <blockquote key={`b${bi}`} className={BLOCK_TYPES.quote}>
              {contentNodes}
            </blockquote>
          );
        }

        // Multi-line paragraphs render each line so newlines survive.
        if (block.lines.length > 1) {
          return (
            <p key={`b${bi}`} className={BLOCK_TYPES.p}>
              {block.lines.map((line, li) => (
                <Fragment key={li}>
                  {li > 0 ? <br /> : null}
                  {renderInline(line, `b${bi}-l${li}`)}
                </Fragment>
              ))}
            </p>
          );
        }

        if (block.lines[0] === "") return <div key={`b${bi}`} className="h-2" />;
        return (
          <p key={`b${bi}`} className={BLOCK_TYPES.p}>
            {contentNodes}
          </p>
        );
      })}
    </div>
  );
}
