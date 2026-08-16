"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { X, Upload, Trash2, Check } from "lucide-react";

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  uploadedAt: string;
}

interface ImagePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export default function ImagePicker({ open, onClose, onSelect }: ImagePickerProps) {
  const [images, setImages] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/media");
      if (res.ok && !cancelled) setImages(await res.json());
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/media", { method: "POST", body: form });
    if (res.ok) {
      const item = await res.json();
      setImages((prev) => [item, ...prev]);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this image?")) return;
    const res = await fetch(`/api/media?id=${id}`, { method: "DELETE" });
    if (res.ok) setImages((prev) => prev.filter((i) => i.id !== id));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl max-h-[80svh] bg-card border border-border rounded-xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-heading font-semibold text-lg">Select Image</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-4 border-b border-border">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Upload className="size-4" />
            {uploading ? "Uploading..." : "Upload New Image"}
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60svh]">
          {images.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No images uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {images.map((img) => (
                <div key={img.id} className="group relative aspect-square rounded-lg border border-border overflow-hidden bg-muted">
                  <Image src={img.url} alt={img.filename} fill className="object-cover" sizes="200px" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => { onSelect(img.url); onClose(); }}
                      className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
                    >
                      <Check className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(img.id)}
                      className="p-2 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-colors"
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
      </div>
    </div>
  );
}
