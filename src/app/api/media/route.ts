import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const MEDIA_PATH = path.join(DATA_DIR, "media.json");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  uploadedAt: string;
}

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function readMedia(): Promise<MediaItem[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(MEDIA_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeMedia(items: MediaItem[]) {
  await ensureDataDir();
  await fs.writeFile(MEDIA_PATH, JSON.stringify(items, null, 2));
}

export async function GET() {
  const items = await readMedia();
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext = path.extname(file.name) || ".jpg";
  const filename = `${Date.now()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }

  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);

  const item: MediaItem = {
    id: Date.now().toString(),
    filename,
    url: `/uploads/${filename}`,
    uploadedAt: new Date().toISOString(),
  };

  const items = await readMedia();
  items.unshift(item);
  await writeMedia(items);

  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const items = await readMedia();
  const item = items.find((i) => i.id === id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete file from disk
  const filePath = path.join(UPLOAD_DIR, item.filename);
  try {
    await fs.unlink(filePath);
  } catch {
    // file may not exist
  }

  const filtered = items.filter((i) => i.id !== id);
  await writeMedia(filtered);

  return NextResponse.json({ success: true });
}
