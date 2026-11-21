/**
 * Mapping between public page paths and their Markdown source path.
 * Edge-safe: no data imports, so middleware can use it without pulling in
 * Supabase, fonts or page components.
 */

/** Content routes that have (or may have) a Markdown builder. */
const CONTENT_PREFIXES = ["/", "/products", "/projects", "/about", "/contact", "/blog"] as const;

/**
 * Return the original page pathname for a request, or null when the request is
 * not a content page (API, internals, static files, dashboards).
 *
 * Also accepts the optional `.md` form: /index.md -> /, /products.md ->
 * /products, /projects/foo.md -> /projects/foo.
 */
export function markdownSourcePath(pathname: string): string | null {
  let path = pathname;
  let dotMd = false;

  if (path.endsWith(".md")) {
    path = path.slice(0, -3);
    if (path === "" || path === "/index") path = "/";
    dotMd = true;
  }

  if (path.startsWith("/api") || path.startsWith("/_next")) return null;
  // Files with an extension are assets, not pages (except the .md form above).
  if (!dotMd && /\.[a-z0-9]+$/i.test(path)) return null;

  const known = CONTENT_PREFIXES.some(
    (prefix) => path === prefix || (prefix !== "/" && path.startsWith(prefix + "/")),
  );
  return known ? path : null;
}
