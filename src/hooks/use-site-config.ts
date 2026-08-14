"use client";

import { useState, useEffect } from "react";
import { getImageUrl, type SiteConfig } from "@/lib/site-config";

export function useSiteConfig() {
  const [config, setConfig] = useState<SiteConfig>({});

  useEffect(() => {
    fetch("/api/site-config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  const img = (slot: string) => getImageUrl(slot, config);
  return { config, img };
}
