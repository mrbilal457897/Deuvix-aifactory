import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/ai/auth";
import { readImageSize } from "@/lib/live-work/image-size";
import { supabase } from "@/lib/supabase";

const BUCKET = "deuvix";
const FOLDER = "projects";
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const MAX_WIDTH = 1920;
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Validated screenshot upload for the "Our live Work" blocks.
 *
 * Type, size and real pixel dimensions are all checked server-side; the file
 * lands in the existing `deuvix` bucket under `projects/` so the path can be
 * stored alongside the URL and removed again on delete.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error || "Unauthorized" }, { status: admin.status ?? 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const extension = ALLOWED_TYPES[file.type];
    if (!extension) {
      return NextResponse.json(
        { error: "Only PNG, JPG or WEBP images are allowed" },
        { status: 415 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be 4 MB or smaller" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const size = readImageSize(buffer);
    if (!size || size.width < 1 || size.height < 1) {
      return NextResponse.json(
        { error: "Could not read the image dimensions — is it a valid PNG, JPG or WEBP?" },
        { status: 422 }
      );
    }

    // Resize to at most MAX_WIDTH wide. `sharp` ships with Next.js but may be
    // absent in some environments — degrade to the original file if it is.
    let outBuffer: Buffer = buffer;
    let outWidth = size.width;
    let outHeight = size.height;
    if (size.width > MAX_WIDTH) {
      try {
        const { default: sharp } = await import("sharp");
        const resized = await sharp(buffer, { failOn: "none" })
          .resize({ width: MAX_WIDTH, withoutEnlargement: true })
          .toBuffer();
        const resizedSize = readImageSize(resized);
        outBuffer = resized;
        outWidth = resizedSize?.width ?? Math.round((size.width / MAX_WIDTH) * MAX_WIDTH);
        outHeight = resizedSize?.height ?? Math.round((size.height * MAX_WIDTH) / size.width);
      } catch {
        // sharp unavailable or failed — keep the original bytes.
      }
    }

    const alt = typeof formData.get("alt") === "string" ? String(formData.get("alt")).slice(0, 200) : "";
    const path = `${FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, outBuffer, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({
      url: data.publicUrl,
      path,
      width: outWidth,
      height: outHeight,
      alt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
