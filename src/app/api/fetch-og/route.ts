import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

async function saveImageBuffer(buffer: Buffer, contentType: string): Promise<string> {
  const ext = (contentType.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "");
  const filename = `${Date.now()}.${ext || "jpg"}`;

  await supabase.storage
    .from("uploads")
    .upload(filename, buffer, { contentType });

  const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(filename);
  return urlData.publicUrl;
}

async function saveScreenshot(url: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://image.thum.io/get/width/800/crop/500/${url}`,
      {
        signal: AbortSignal.timeout(20000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
      }
    );
    if (res.ok && res.headers.get("content-type")?.startsWith("image/")) {
      const buffer = Buffer.from(await res.arrayBuffer());
      return await saveImageBuffer(buffer, res.headers.get("content-type") || "image/jpeg");
    }
  } catch {}
  return null;
}

async function fetchOgImage(url: string, parsedUrl: URL): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ThumbnailBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const html = await res.text();

    const ogMatch = html.match(
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
    ) || html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i
    );
    if (ogMatch?.[1]) return resolveUrl(parsedUrl, decodeHtmlEntities(ogMatch[1]));

    const twitterMatch = html.match(
      /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i
    ) || html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i
    );
    if (twitterMatch?.[1]) return resolveUrl(parsedUrl, decodeHtmlEntities(twitterMatch[1]));

    const linkMatch = html.match(
      /<link[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i
    ) || html.match(
      /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']image_src["']/i
    );
    if (linkMatch?.[1]) return resolveUrl(parsedUrl, decodeHtmlEntities(linkMatch[1]));

    const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch?.[1]) return resolveUrl(parsedUrl, decodeHtmlEntities(imgMatch[1]));

  } catch {}
  return null;
}

async function saveMetaImage(url: string, parsedUrl: URL): Promise<string | null> {
  const metaImage = await fetchOgImage(url, parsedUrl);
  if (!metaImage) return null;
  try {
    const res = await fetch(metaImage, {
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    if (res.ok && res.headers.get("content-type")?.startsWith("image/")) {
      const buffer = Buffer.from(await res.arrayBuffer());
      return await saveImageBuffer(buffer, res.headers.get("content-type") || "image/jpeg");
    }
  } catch {}
  return null;
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const metaImage = await saveMetaImage(parsedUrl.toString(), parsedUrl);
    if (metaImage) {
      return NextResponse.json({ image: metaImage });
    }

    const screenshot = await saveScreenshot(parsedUrl.toString());
    if (screenshot) {
      return NextResponse.json({ image: screenshot });
    }

    return NextResponse.json({ image: null });
  } catch {
    return NextResponse.json({ image: null });
  }
}

function resolveUrl(base: URL, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}
