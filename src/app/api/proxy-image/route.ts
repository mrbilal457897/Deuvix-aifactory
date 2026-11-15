import { NextResponse } from "next/server";

const PRIVATE_HOST =
  /^(localhost|127\.|0\.0\.0\.0|::1$|\[::1\]|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|fc|fd|metadata\.google\.internal)/i;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_HOST.test(hostname);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url || !/^https?:\/\//i.test(url)) {
    return new NextResponse("Missing url", { status: 400 });
  }

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }
  if (isPrivateHost(hostname)) {
    // SSRF guard: never fetch loopback/link-local/private ranges.
    return new NextResponse("Host not allowed", { status: 403 });
  }

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) {
      return new NextResponse("Failed to fetch", { status: 502 });
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    if (!/^image\//i.test(contentType)) {
      return new NextResponse("URL did not return an image", { status: 415 });
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) {
      return new NextResponse("Image exceeds the 5MB limit", { status: 413 });
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Proxy error", { status: 502 });
  }
}
