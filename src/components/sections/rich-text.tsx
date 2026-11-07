import React, { Fragment } from "react";

/**
 * A small, safe Markdown renderer for project body copy.
 *
 * It builds React elements only — never an HTML string, never fed to
 * `dangerouslySetInnerHTML` — so admin-entered content cannot inject markup.
 * Unlike the chat bubble renderer it emits real page heading levels (h2–h4),
 * because this content lives under the page's single h1.
 *
 * Supported: h2/h3/h4, paragraphs, bullets, ordered lists, blockquotes,
 * fenced code, bold, italic, inline code, links, hard line breaks.
 */

/** Absolute http(s), site-relative, or mailto. Everything else is dropped. */
function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (/^https?:\/\//i.test(href)) return href;
  if (/^mailto:[^\s]+$/i.test(href)) return href;
  if (/^\/(?!\/)[^\s]*$/.test(href)) return href;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return null; // javascript:, data:, …
  return href.length > 0 ? href : null;
}

const INLINE_PATTERN = new RegExp(
  [
    "(`[^`\\n]+`)",
    "(\\*\\*[^*\\n]+\\*\\*)",
    "(__[^_\\n]+__)",
    "(\\*[^*\\n]+\\*)",
    "(\\[[^\\]\\n]+\\]\\([^)\\s]+\\))",
    "(https?://[^\\s<>()]+)",
  ].join("|"),
  "g"
);

const LINK_CLASS =
  "font-medium text-primary underline underline-offset-2 hover:opacity-80";

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
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {token.slice(1, -1)}
        </code>
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
            className={LINK_CLASS}
            {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer noopener" } : {})}
          >
            {label}
          </a>
        ) : (
          <Fragment key={key}>{label}</Fragment>
        )
      );
    } else {
      out.push(
        <a key={key} href={token} target="_blank" rel="noreferrer noopener" className={`${LINK_CLASS} break-all`}>
          {token}
        </a>
      );
    }

    last = match.index + token.length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}

const BLOCK_CLASS = {
  h2: "font-heading text-2xl font-bold mt-10 first:mt-0 mb-3",
  h3: "font-heading text-lg font-semibold mt-8 mb-2",
  h4: "font-heading text-base font-semibold mt-6 mb-2",
  p: "my-3 first:mt-0 last:mb-0",
  quote: "border-l-2 border-primary/50 pl-4 my-4 text-muted-foreground italic",
} as const;

type BlockType = keyof typeof BLOCK_CLASS;

interface Block {
  kind: "text" | "code";
  type?: BlockType;
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
    blocks.push({ kind: "text", type: "p", lines: bullets.map((entry) => `• ${entry}`) });
    bullets = [];
  };
  const flushOrdered = () => {
    if (!ordered.length) return;
    blocks.push({
      kind: "text",
      type: "p",
      lines: ordered.map((entry, index) => `${index + 1}. ${entry}`),
    });
    ordered = [];
  };
  const flushBoth = () => {
    flushBullets();
    flushOrdered();
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");

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
      const level = Math.min(heading[1].length, 4);
      blocks.push({
        kind: "text",
        type: (level <= 2 ? "h2" : level === 3 ? "h3" : "h4") as BlockType,
        lines: [heading[2]],
      });
      continue;
    }

    if (line.startsWith("> ")) {
      blocks.push({ kind: "text", type: "quote", lines: [line.slice(2)] });
      continue;
    }

    const previous = blocks[blocks.length - 1];
    if (
      previous &&
      previous.kind === "text" &&
      previous.type === "p" &&
      !/^\s*$/.test(previous.lines[previous.lines.length - 1])
    ) {
      previous.lines.push(line);
    } else {
      blocks.push({ kind: "text", type: "p", lines: [line] });
    }
  }

  if (fence) blocks.push(fence);
  flushBoth();

  return blocks;
}

export function RichText({ content, className }: { content: string; className?: string }) {
  if (!content.trim()) return null;
  const blocks = parseBlocks(content);

  return (
    <div className={["text-foreground/90 leading-relaxed", className].filter(Boolean).join(" ")}>
      {blocks.map((block, index) => {
        if (block.kind === "code") {
          return (
            <pre
              key={`b${index}`}
              className="my-4 rounded-xl bg-foreground/5 border border-border overflow-x-auto p-4 font-mono text-[0.8rem] leading-relaxed whitespace-pre"
            >
              <code>{block.lines.join("\n")}</code>
            </pre>
          );
        }

        const type = block.type ?? "p";

        if (type === "h2" || type === "h3" || type === "h4") {
          const Tag = type;
          return (
            <Tag key={`b${index}`} className={BLOCK_CLASS[type]}>
              {renderInline(block.lines[0], `b${index}`)}
            </Tag>
          );
        }

        if (type === "quote") {
          return (
            <blockquote key={`b${index}`} className={BLOCK_CLASS.quote}>
              {renderInline(block.lines[0], `b${index}`)}
            </blockquote>
          );
        }

        if (block.lines.length > 1) {
          return (
            <p key={`b${index}`} className={BLOCK_CLASS.p}>
              {block.lines.map((line, lineIndex) => (
                <Fragment key={lineIndex}>
                  {lineIndex > 0 ? <br /> : null}
                  {renderInline(line, `b${index}-l${lineIndex}`)}
                </Fragment>
              ))}
            </p>
          );
        }

        if (block.lines[0] === "") return <div key={`b${index}`} className="h-3" />;
        return (
          <p key={`b${index}`} className={BLOCK_CLASS.p}>
            {renderInline(block.lines[0], `b${index}`)}
          </p>
        );
      })}
    </div>
  );
}
