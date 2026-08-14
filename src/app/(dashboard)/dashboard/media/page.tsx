"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, Trash2, Copy, ImageIcon } from "lucide-react";

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  uploadedAt: string;
}

export default function MediaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [images, setImages] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/media");
      if (res.ok && !cancelled) setImages(await res.json());
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/media", { method: "POST", body: form });
      if (res.ok) {
        const item = await res.json();
        setImages((prev) => [item, ...prev]);
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this image permanently?")) return;
    const res = await fetch(`/api/media?id=${id}`, { method: "DELETE" });
    if (res.ok) setImages((prev) => prev.filter((i) => i.id !== id));
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dropRef.current?.classList.remove("border-primary");
    handleUpload(e.dataTransfer.files);
  };

  if (status === "loading" || !session) {
    return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold mb-2">Media Library</h1>
        <p className="text-muted-foreground text-sm">Upload and manage images for your website.</p>
      </div>

      <div
        ref={dropRef}
        onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add("border-primary"); }}
        onDragLeave={() => dropRef.current?.classList.remove("border-primary")}
        onDrop={handleDrop}
        className="mb-6 p-8 border-2 border-dashed border-border rounded-xl text-center hover:border-primary/50 transition-colors"
      >
        <ImageIcon className="size-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-3">Drag & drop images here, or</p>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Upload className="size-4" />
          {uploading ? "Uploading..." : "Browse Files"}
        </button>
      </div>

      {images.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ImageIcon className="size-12 mx-auto mb-3 opacity-50" />
          <p>No images uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-square rounded-xl border border-border overflow-hidden bg-muted">
              <Image src={img.url} alt={img.filename} fill className="object-cover" sizes="300px" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => handleCopy(img.url)}
                  className="p-2 rounded-full bg-white/90 text-black hover:bg-white transition-colors"
                  title="Copy URL"
                >
                  {copied === img.url ? <span className="text-xs font-bold">Copied!</span> : <Copy className="size-4" />}
                </button>
                <button
                  onClick={() => handleDelete(img.id)}
                  className="p-2 rounded-full bg-red-500/90 text-white hover:bg-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate">
                {img.filename}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
