"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Save, ImageIcon, RotateCcw, Check } from "lucide-react";
import ImagePicker from "@/components/admin/image-picker";
import { invalidateSiteConfig } from "@/hooks/use-site-config";
import { SLOT_LABELS, SLOT_KEYS } from "@/lib/site-config";

interface SiteConfig {
  [slot: string]: string;
}

const DEFAULTS: SiteConfig = {
  logo: "/images/finallogo.png",
  "hero-bg": "/images/hero-bg.jpg",
  "cta-bg": "/images/cta-bg.jpg",
  "about-main": "/images/about1.jpg",
  "about-secondary": "/images/about2.jpg",
  "team-bilal": "/images/bilal.jpg",
  "team-asad": "/images/asad.jpg",
  "product-bg": "/images/product-bg.jpg",
  "contact-bg": "/images/hero-bg.jpg",
};

const SLOT_ASPECT_RATIOS: Record<string, number> = {
  logo: 1,
  "hero-bg": 16 / 9,
  "cta-bg": 16 / 9,
  "about-main": 4 / 3,
  "about-secondary": 1,
  "team-bilal": 1,
  "team-asad": 1,
  "product-bg": 16 / 9,
  "contact-bg": 16 / 9,
};

export default function ImagesSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [config, setConfig] = useState<SiteConfig>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const savedRef = useRef<SiteConfig>({});

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/site-config");
      if (res.ok && !cancelled) {
        const json = await res.json();
        setConfig(json);
        savedRef.current = json;
      }
    })();
    return () => { cancelled = true; };
  }, [session]);

  const handleSelect = (url: string) => {
    if (activeSlot) setConfig((prev) => ({ ...prev, [activeSlot]: url }));
  };

  const cleanupOrphanedUploads = async (previous: SiteConfig, next: SiteConfig) => {
    const stillUsed = new Set(Object.values(next).filter((v): v is string => typeof v === "string"));
    const SUPABASE_STORAGE = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const isUploadedUrl = (v: string) => v.startsWith("/uploads/") || (SUPABASE_STORAGE.length > 0 && v.startsWith(SUPABASE_STORAGE));
    const orphans = [...new Set(Object.values(previous).filter((v): v is string => typeof v === "string" && isUploadedUrl(v)))].filter((url) => !stillUsed.has(url));
    if (orphans.length === 0) return;
    const res = await fetch("/api/media");
    if (!res.ok) return;
    const items: { id: string; url: string }[] = await res.json();
    for (const url of orphans) {
      const item = items.find((i) => i.url === url);
      if (item) await fetch(`/api/media?id=${item.id}`, { method: "DELETE" });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const previous = savedRef.current;
    const res = await fetch("/api/site-config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
    if (res.ok) {
      await cleanupOrphanedUploads(previous, config);
      savedRef.current = config;
      invalidateSiteConfig();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  if (status === "loading" || !session) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Image Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Assign images to different parts of your website.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setConfig({ ...DEFAULTS })} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <RotateCcw className="size-4" />
            Reset
          </button>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-sm font-medium hover:from-primary/90 hover:to-primary/70 transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
            {saving ? <div className="size-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : saved ? <Check className="size-4" /> : <Save className="size-4" />}
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SLOT_KEYS.map((slot) => {
          const url = config[slot] || DEFAULTS[slot];
          return (
            <div key={slot} className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all group">
              <div
                className="relative bg-muted"
                style={{ aspectRatio: SLOT_ASPECT_RATIOS[slot] || 1 }}
              >
                {url ? (
                  <Image src={url} alt={SLOT_LABELS[slot]} fill className="object-cover" sizes="400px" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="size-8 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="p-3.5 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground">{SLOT_LABELS[slot]}</p>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[180px] mt-0.5">{url}</p>
                </div>
                <button
                  onClick={() => { setActiveSlot(slot); setPickerOpen(true); }}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 ml-3"
                >
                  Change
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ImagePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelect}
        aspectRatio={activeSlot ? SLOT_ASPECT_RATIOS[activeSlot] : 1}
      />
    </div>
  );
}
