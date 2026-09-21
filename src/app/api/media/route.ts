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

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  let buffer: Buffer;
  let filename: string;
  let contentTypeStr: string;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const ext = file.name.split(".").pop() || "jpg";
    filename = `${Date.now()}.${ext}`;
    buffer = Buffer.from(await file.arrayBuffer());
    contentTypeStr = file.type;
  } else if (contentType.includes("application/json")) {
    const body = await request.json();
    const base64Image = body.image as string | undefined;
    if (!base64Image) return NextResponse.json({ error: "No image data" }, { status: 400 });

    const matches = base64Image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return NextResponse.json({ error: "Invalid image format" }, { status: 400 });

    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    filename = `${Date.now()}.${ext}`;
    buffer = Buffer.from(matches[2], "base64");
    contentTypeStr = `image/${matches[1]}`;
  } else {
    return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
  }

  const { error: uploadError } = await supabase.storage
    .from("deux")
    .upload(filename, buffer, { contentType: contentTypeStr });

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
