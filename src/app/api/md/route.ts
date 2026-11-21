import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

async function handle(request: NextRequest) {
  const raw = request.headers.get("x-md-path") || request.nextUrl.searchParams.get("path") || "/";
  const pathname = raw.startsWith("/") ? raw : `/${raw}`;
  const markdown = await buildMarkdown(pathname);

  // No builder for this path: serve the normal HTML page instead of a 404/406.
  if (markdown === null) {
    const upstream = await fetch(new URL(pathname, request.nextUrl.origin), {
      headers: { accept: "text/html" },
      redirect: "follow",
    });
    const body = upstream.status === 204 || upstream.status === 304 ? null : await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "text/html; charset=utf-8",
        vary: "Accept",
        "cache-control": upstream.headers.get("cache-control") || CACHE,
      },
    });
  }

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      vary: "Accept",
      "cache-control": CACHE,
      "x-markdown-tokens": String(Math.round(markdown.length / 4)),
    },
  });
}

export const GET = handle;
export const HEAD = handle;
