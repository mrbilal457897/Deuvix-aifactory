/**
 * Shared JSON-LD renderer.
 *
 * A tiny, dependency-free component that emits a server-rendered
 * <script type="application/ld+json"> block. Using one helper everywhere keeps
 * the escaping consistent (a literal "<" must be escaped so a value can never
 * close the script tag early and break JSON.parse for validators).
 *
 * This is a plain function component with no client-side interactivity, so it
 * is safe to render from both server and client components (client components
 * are still server-rendered by Next.js, which puts the script in the raw HTML).
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
