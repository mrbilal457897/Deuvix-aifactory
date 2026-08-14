"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Save, ImageIcon } from "lucide-react";
import ImagePicker from "@/components/admin/image-picker";
import { SLOT_LABELS, SLOT_KEYS } from "@/lib/site-config";

interface SiteConfig {
  [slot: string]: string;
}

const DEFAULTS: SiteConfig = {
  logo: "/images/logo.png",
  "hero-bg": "/images/hero-bg.jpg",
  "cta-bg": "/images/cta-bg.jpg",
  "about-main": "/images/about1.jpg",
  "about-secondary": "/images/about2.jpg",
  "team-bilal": "/images/bilal.jpg",
  "team-asad": "/images/asad.jpg",
  "product-bg": "/images/product-bg.jpg",
  "contact-bg": "/images/hero-bg.jpg",
};

export default function ImagesSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [config, setConfig] = useState<SiteConfig>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/site-config");
      if (res.ok && !cancelled) setConfig(await res.json());
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const handleSelect = (url: string) => {
    if (activeSlot) {
      setConfig((prev) => ({ ...prev, [activeSlot]: url }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/site-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const handleReset = () => {
    setConfig({ ...DEFAULTS });
  };

  if (status === "loading" || !session) {
    return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold mb-2">Image Settings</h1>
          <p className="text-muted-foreground text-sm">Assign images to different parts of your website.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="size-4" />
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SLOT_KEYS.map((slot) => {
          const url = config[slot] || DEFAULTS[slot];
          return (
            <div key={slot} className="border border-border rounded-xl overflow-hidden bg-card">
              <div className="relative aspect-video bg-muted">
                {url ? (
                  <Image src={url} alt={SLOT_LABELS[slot]} fill className="object-cover" sizes="400px" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="size-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{SLOT_LABELS[slot]}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">{url}</p>
                </div>
                <button
                  onClick={() => { setActiveSlot(slot); setPickerOpen(true); }}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
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
      />
    </div>
  );
}
