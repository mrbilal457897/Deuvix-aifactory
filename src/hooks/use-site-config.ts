"use client";

import { getImageUrl, type SiteConfig } from "@/lib/site-config";
import { useSiteConfigValue } from "@/components/site-config-context";

/**
 * Reads the site config from the server-rendered context — no fetch is
 * issued from the browser, so images render on the first paint.
 */
export function useSiteConfig() {
  const config = useSiteConfigValue();
  const img = (slot: string) => getImageUrl(slot, config);
  return { config, img };
}

/**
 * Admin-image-settings flow calls this after a save. Kept as the historic
 * export so the admin page compiles unchanged; the real invalidation is now
 * server-side via revalidateTag("site-config") inside writeSiteConfig().
 */
export function invalidateSiteConfig() {
  /* no-op — server revalidates the cache tag on save */
}
