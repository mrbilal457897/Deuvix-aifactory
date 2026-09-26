import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  uploadedAt: string;
}

function rowToMedia(row: Record<string, unknown>): MediaItem {
  return {
    id: row.id as string,
    filename: row.filename as string,
    url: row.url as string,
    uploadedAt: row.uploaded_at as string,
  };
}

export async function GET() {
  const { data } = await supabase.from("media").select("*").order("uploaded_at", { ascending: false });
  if (!data) return NextResponse.json([]);
  return NextResponse.json(data.map(rowToMedia));
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

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

  return NextResponse.json(rowToMedia(item), { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data: item } = await supabase.from("media").select("filename").eq("id", id).single();
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await supabase.storage.from("deux").remove([item.filename]);
  await supabase.from("media").delete().eq("id", id);

  return NextResponse.json({ success: true });
}
