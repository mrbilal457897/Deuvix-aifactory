import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { deleteMedia, listMedia } from "@/lib/media";

const MAX_MEDIA = 1000;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function GET() {
  return NextResponse.json(await listMedia(MAX_MEDIA));
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported image format" }, { status: 415 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image exceeds the 10MB limit" }, { status: 413 });
  }

  const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const filename = `${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("deux")
    .upload(filename, buffer, { contentType: file.type });

  if (uploadError) {
    console.error("Upload failed:", uploadError.message);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("deux").getPublicUrl(filename);

  const item = {
    id: Date.now().toString(),
    filename,
    url: urlData.publicUrl,
    uploaded_at: new Date().toISOString(),
  };

  await supabase.from("media").insert(item);

  return NextResponse.json(
    { id: item.id, filename: item.filename, url: item.url, uploadedAt: item.uploaded_at },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const ok = await deleteMedia(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
