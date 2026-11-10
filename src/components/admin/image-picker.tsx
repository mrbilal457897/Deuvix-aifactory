"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, Upload, Trash2, Check } from "lucide-react";
import ImageCropper from "./image-cropper";

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
  aspectRatio?: number;
}

export default function ImagePicker({ open, onClose, onSelect, aspectRatio = 1 }: ImagePickerProps) {
  const [images, setImages] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ src: string; name: string } | null>(null);
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

  const handleClose = useCallback(() => {
    setPending(null);
    setError(null);
    setUploading(false);
    onClose();
  }, [onClose]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file is not an image.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPending({ src: ev.target?.result as string, name: file.name });
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/media", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const item: MediaItem = await res.json();
      setImages((prev) => [item, ...prev]);
      setPending(null);
      onSelect(item.url);
      handleClose();
    } catch {
      setError("Upload failed. Please try again.");
      setPending(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSelectExisting = (url: string) => {
    onSelect(url);
    handleClose();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this image?")) return;
    const res = await fetch(`/api/media?id=${id}`, { method: "DELETE" });
    if (res.ok) setImages((prev) => prev.filter((i) => i.id !== id));
  };

  if (!open) return null;

  if (pending) {
    return (
      <ImageCropper
        src={pending.src}
        fileName={pending.name}
        onComplete={handleCropComplete}
        onCancel={() => setPending(null)}
        aspectRatio={aspectRatio}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleClose}>
      <div
        className="relative w-full max-w-3xl max-h-[80svh] bg-card border border-border rounded-xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-heading h3-sm">Select Image</h3>
          <button onClick={handleClose} className="btn-sharp p-1 rounded-none hover:bg-muted transition-colors" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-4 border-b border-border">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-sharp inline-flex items-center gap-2 px-4 py-2 rounded-none bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Upload className="size-4" />
            Upload New Image
          </button>
          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
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
                      onClick={() => handleSelectExisting(img.url)}
                      className="btn-sharp p-2 rounded-none bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
                      aria-label="Use this image"
                    >
                      <Check className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(img.id)}
                      className="btn-sharp p-2 rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-colors"
                      aria-label="Delete this image"
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