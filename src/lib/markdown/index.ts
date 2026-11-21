/** Dispatch a page pathname to its Markdown builder. Returns null when the
 * path has no builder (the API route then serves the normal HTML page). */
import {
  aboutMarkdown,
  blogMarkdown,
  blogPostMarkdown,
  contactMarkdown,
  homeMarkdown,
  productsMarkdown,
  projectMarkdown,
  projectsMarkdown,
} from "./builders";

export async function buildMarkdown(pathname: string): Promise<string | null> {
  if (pathname === "/") return homeMarkdown();
  if (pathname === "/products") return productsMarkdown();
  if (pathname === "/projects") return projectsMarkdown();
  if (pathname.startsWith("/projects/")) return projectMarkdown(pathname.slice("/projects/".length));
  if (pathname === "/about") return aboutMarkdown();
  if (pathname === "/contact") return contactMarkdown();
  if (pathname === "/blog") return blogMarkdown();
  if (pathname.startsWith("/blog/")) return blogPostMarkdown(pathname.slice("/blog/".length));
  return null;
}
