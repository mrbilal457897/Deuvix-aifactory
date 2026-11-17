import { supabase } from "./supabase";
import { DEFAULTS, type SiteConfig } from "./site-config";

/**
 * 5-minute in-memory cache for the public site config. The values are public
 * (image URLs, socials, trading info) — never tokens or secrets. The cache is
 * invalidated by writeSiteConfig(), so admin edits still go live immediately.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: { value: SiteConfig; expiresAt: number } | null = null;

export async function readSiteConfig(): Promise<SiteConfig> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return { ...cached.value };
  }
  const { data } = await supabase.from("site_config").select("value").eq("key", "config").single();
  const value = data?.value
    ? { ...DEFAULTS, ...(data.value as SiteConfig) }
    : { ...DEFAULTS };
  cached = { value, expiresAt: now + CACHE_TTL_MS };
  return { ...value };
}

export async function writeSiteConfig(config: SiteConfig): Promise<void> {
  await supabase
    .from("site_config")
    .upsert({ key: "config", value: config }, { onConflict: "key" });
  // Invalidate so the admin's own next read sees the new config.
  cached = null;
}
