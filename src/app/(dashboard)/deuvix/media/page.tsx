"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, Trash2, Copy, ImageIcon, Grid3X3, List, Check } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";

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
  const [view, setView] = useState<"grid" | "list">("grid");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
    return () => { cancelled = true; };
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

  if (status === "loading" || !session) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Media Library</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload and manage images for your website.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView("grid")} className={`p-2 rounded-lg transition-colors ${view === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
            <Grid3X3 className="size-4" />
          </button>
          <button onClick={() => setView("list")} className={`p-2 rounded-lg transition-colors ${view === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
            <List className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatCard label="Total Files" value={images.length} icon={ImageIcon} />
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
        className={`mb-6 p-8 border-2 border-dashed rounded-2xl text-center transition-all duration-200 ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/30 bg-card"
        }`}
      >
        <div className={`size-12 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-colors ${dragOver ? "bg-primary/20" : "bg-muted"}`}>
          <Upload className={`size-6 transition-colors ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <p className="text-sm text-muted-foreground mb-3">Drag & drop images here, or</p>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-sm font-medium hover:from-primary/90 hover:to-primary/70 transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
          <Upload className="size-4" />
          {uploading ? "Uploading..." : "Browse Files"}
        </button>
      </div>

      {images.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-card border border-border">
          <ImageIcon className="size-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No images uploaded yet.</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-square rounded-2xl border border-border overflow-hidden bg-card hover:border-primary/30 transition-all">
              <Image src={img.url} alt={img.filename} fill className="object-cover" sizes="300px" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-xs font-medium truncate mb-2">{img.filename}</p>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleCopy(img.url)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white text-[10px] font-medium hover:bg-white/20 transition-colors">
                      {copied === img.url ? <><Check className="size-3" /> Copied</> : <><Copy className="size-3" /> Copy URL</>}
                    </button>
                    <button onClick={() => handleDelete(img.id)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/20 backdrop-blur-sm text-red-300 text-[10px] font-medium hover:bg-red-500/30 transition-colors">
                      <Trash2 className="size-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-[11px] text-muted-foreground uppercase tracking-wider font-medium">File</th>
                <th className="px-5 py-3 text-left text-[11px] text-muted-foreground uppercase tracking-wider font-medium hidden md:table-cell">Uploaded</th>
                <th className="px-5 py-3 text-right text-[11px] text-muted-foreground uppercase tracking-wider font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {images.map((img) => (
                <tr key={img.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors group">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl overflow-hidden bg-muted border border-border shrink-0">
                        <Image src={img.url} alt={img.filename} width={40} height={40} className="size-10 object-cover" />
                      </div>
                      <span className="text-foreground text-sm truncate">{img.filename}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell text-muted-foreground text-xs">{new Date(img.uploadedAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleCopy(img.url)} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors" title="Copy URL">
                        {copied === img.url ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                      </button>
                      <button onClick={() => handleDelete(img.id)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors" title="Delete">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
