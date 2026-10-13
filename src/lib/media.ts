import { supabase } from "./supabase";

export interface MediaItem {
  id: string;
  filename: string;
  url: string;
  uploadedAt: string;
}

const BUCKET = "deux";

function rowToMedia(row: Record<string, unknown>): MediaItem {
  return {
    id: row.id as string,
    filename: row.filename as string,
    url: row.url as string,
    uploadedAt: row.uploaded_at as string,
  };
}

export async function listMedia(limit = 100): Promise<MediaItem[]> {
  const { data } = await supabase
    .from("media")
    .select("*")
    .order("uploaded_at", { ascending: false })
    .limit(limit);
  if (!data) return [];
  return data.map(rowToMedia);
}

/** Removes the storage object and its media row. Returns false when the id is unknown. */
export async function deleteMedia(id: string): Promise<boolean> {
  const { data: item } = await supabase.from("media").select("filename").eq("id", id).single();
  if (!item) return false;

  await supabase.storage.from(BUCKET).remove([item.filename as string]);
  const { error } = await supabase.from("media").delete().eq("id", id);
  return !error;
}
