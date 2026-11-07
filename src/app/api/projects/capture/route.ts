import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/ai/auth";
import { readImageSize } from "@/lib/live-work/image-size";
import { supabase } from "@/lib/supabase";

const BUCKET = "deuvix";
const FOLDER = "projects";
/** Free screenshot services are slow the first time a site is requested. */
const TIMEOUT_MS = 30_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------- sources -- */

interface Source {
  name: string;
  buildUrl: (target: string) => string;
  /** Pause before a retry: rate limits need to cool down, mShots renders async. */
  retryDelayMs: number;
  /** mShots answers instantly with a placeholder on a cold URL — discard it. */
  discardFirst?: boolean;
}

/** thum.io: 1200×1200 viewport → crop N px tall → resize to `width`.
 *  `crop/750` at `width/1600` therefore lands on exactly 1600×1000 (16:10). */
const thum = (width: number, crop: number) => (target: string) =>
  `https://image.thum.io/get/width/${width}/crop/${crop}/noanimate/${target}`;

/** microlink: honours the viewport at DPR 2, so 450×960 comes back 900×1920 —
 *  the phone body's ratio. Free tier rate-limits in bursts (HTTP 429). */
const microlink = (width: number, height: number) => (target: string) =>
  `https://api.microlink.io/?url=${encodeURIComponent(target)}` +
  `&meta=false&screenshot=true&embed=screenshot.url&viewport.width=${width}&viewport.height=${height}`;

/** WordPress mShots: generous limits, but caps the height at 960 px. */
const mshots = (target: string) =>
  `https://s.wordpress.com/mshots/v1/${encodeURIComponent(target)}?w=450&h=960`;

const SOURCES: Record<"desktop" | "mobile", Source[]> = {
  desktop: [
    { name: "thum.io", buildUrl: thum(1600, 750), retryDelayMs: 2_000 },
    { name: "microlink", buildUrl: microlink(800, 500), retryDelayMs: 6_000 },
  ],
  mobile: [
    { name: "microlink", buildUrl: microlink(450, 960), retryDelayMs: 6_000 },
    { name: "mShots", buildUrl: mshots, retryDelayMs: 1_500, discardFirst: true },
  ],
};

type ShotKey = keyof typeof SOURCES;

/* ------------------------------------------------------------- capture -- */

interface Shot {
  buffer: Buffer;
  width: number;
  height: number;
  ext: string;
}

function extensionFor(contentType: string | null): string {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  return "png";
}

async function fetchImage(source: Source, target: string): Promise<Shot> {
  const response = await fetch(source.buildUrl(target), {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`${source.name} responded ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const size = readImageSize(buffer);
  if (!size || size.width < 1 || size.height < 1) {
    throw new Error(`${source.name} did not return a usable image`);
  }
  return {
    buffer,
    width: size.width,
    height: size.height,
    ext: extensionFor(response.headers.get("content-type")),
  };
}

/** Tries each source twice (rate limits / async rendering), best first. */
async function captureShot(key: ShotKey, target: string): Promise<Shot> {
  const failures: string[] = [];
  for (const source of SOURCES[key]) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const shot = await fetchImage(source, target);
        // A cold mShots URL answers instantly with a placeholder — wait for
        // the real render and ask once more.
        if (source.discardFirst && attempt === 0) {
          await sleep(source.retryDelayMs);
          continue;
        }
        return shot;
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
        if (attempt === 0) await sleep(source.retryDelayMs);
      }
    }
  }
  throw new Error(`Could not capture the ${key} screenshot (${failures.join(", ")})`);
}

/**
 * Captures the live project's hero (first section) for both devices and stores
 * the files in the `deuvix` bucket, so they behave exactly like a manual upload:
 * next/image optimises them and deleting the project removes them.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error || "Unauthorized" }, { status: admin.status ?? 401 });
  }

  try {
    const body = (await request.json()) as { url?: unknown };
    const raw = typeof body.url === "string" ? body.url.trim() : "";
    if (!raw) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    let target: URL;
    try {
      target = new URL(raw);
    } catch {
      return NextResponse.json({ error: "That does not look like a valid URL" }, { status: 400 });
    }
    if (target.protocol !== "https:" && target.protocol !== "http:") {
      return NextResponse.json({ error: "Only http(s) URLs can be captured" }, { status: 400 });
    }

    const results = await Promise.allSettled(
      (Object.keys(SOURCES) as ShotKey[]).map(async (key) => ({
        key,
        shot: await captureShot(key, target.toString()),
      }))
    );

    const failed = results.find((result) => result.status === "rejected");
    if (failed && failed.status === "rejected") {
      const message = failed.reason instanceof Error ? failed.reason.message : "Capture failed";
      return NextResponse.json({ error: message }, { status: 422 });
    }

    const stamp = Date.now();
    const payload = {} as Record<ShotKey, { url: string; path: string; width: number; height: number; alt: string }>;

    let index = 0;
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const { key, shot } = result.value;
      const path = `${FOLDER}/${stamp}-${randomBytes(4).toString("hex")}-${index}.${shot.ext}`;
      index += 1;

      const { error } = await supabase.storage.from(BUCKET).upload(path, shot.buffer, {
        contentType: `image/${shot.ext === "jpg" ? "jpeg" : shot.ext}`,
        upsert: false,
      });
      if (error) throw new Error(`Could not store the ${key} screenshot: ${error.message}`);

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      payload[key] = {
        url: data.publicUrl,
        path,
        width: shot.width,
        height: shot.height,
        alt: "",
      };
    }

    if (!payload.desktop || !payload.mobile) {
      return NextResponse.json({ error: "Capture produced no images" }, { status: 422 });
    }

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Capture failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
