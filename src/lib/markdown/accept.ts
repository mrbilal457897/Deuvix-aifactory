/**
 * Edge-safe Accept-header negotiation. No imports, no Node APIs — safe to call
 * from middleware (Edge runtime).
 *
 * A client only gets Markdown when `text/markdown` is explicitly listed with a
 * quality value greater than zero and at least as high as `text/html`. A plain
 * browser Accept (which contains text/html and no text/markdown) and a wildcard
 * media type both
 * keep getting HTML.
 */
export function wantsMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false;

  let markdown = 0;
  let html = 0;

  for (const entry of accept.split(",")) {
    const parts = entry.trim().split(";");
    const mediaType = parts[0]?.trim().toLowerCase();
    let q = 1;

    for (const parameter of parts.slice(1)) {
      const match = parameter.trim().match(/^q\s*=\s*([0-9.]+)$/i);
      if (match) {
        const value = Number(match[1]);
        q = Number.isFinite(value) ? value : 0;
      }
    }

    if (mediaType === "text/markdown") markdown = Math.max(markdown, q);
    else if (mediaType === "text/html") html = Math.max(html, q);
  }

  return markdown > 0 && markdown >= html;
}
