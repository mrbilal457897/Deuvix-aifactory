import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Resize images to at most 1920px wide when sharp is available.
    let outBuffer: Buffer = buffer;
    if (/^(png|jpe?g|webp)$/i.test(ext)) {
      try {
        const { default: sharp } = await import("sharp");
        const meta = await sharp(buffer, { failOn: "none" }).metadata();
        if (meta.width && meta.width > 1920) {
          outBuffer = await sharp(buffer, { failOn: "none" })
            .resize({ width: 1920, withoutEnlargement: true })
            .toBuffer();
        }
      } catch {
        // sharp unavailable — upload the original bytes.
      }
    }

    const { error } = await supabase.storage
      .from("deuvix")
      .upload(filename, outBuffer, { contentType: file.type });

    if (error) throw error;

    const { data: urlData } = supabase.storage.from("deuvix").getPublicUrl(filename);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
