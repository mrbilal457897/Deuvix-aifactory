"use client";

import { useEffect, useState } from "react";
import { getImageUrl, type SiteConfig } from "@/lib/site-config";

let sharedConfig: SiteConfig | null = null;
let inFlight: Promise<SiteConfig> | null = null;

function loadConfig(): Promise<SiteConfig> {
  if (sharedConfig) return Promise.resolve(sharedConfig);
  if (inFlight) return inFlight;
  inFlight = fetch("/api/site-config")
    .then((r) => (r.ok ? r.json() : {}))
    .then((data) => {
      sharedConfig = data as SiteConfig;
      return sharedConfig;
    })
    .catch(() => sharedConfig || {})
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function invalidateSiteConfig() {
  sharedConfig = null;
  inFlight = null;
}

export function useSiteConfig() {
  const [config, setConfig] = useState<SiteConfig>(sharedConfig || {});

  useEffect(() => {
    let cancelled = false;
    loadConfig().then((data) => {
      if (!cancelled) setConfig(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const img = (slot: string) => getImageUrl(slot, config);
  return { config, img };
}
