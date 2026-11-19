import { unstable_cache, revalidateTag } from "next/cache";
import { supabase } from "./supabase";
import { DEFAULTS, type SiteConfig } from "./site-config";

/**
 * Public site config, cached at the DATA CACHE with a tag so it can be
 * invalidated instantly on admin saves (revalidateTag) instead of waiting
 * for an ISR window. The values are public (image URLs, socials, company
 * info) — never tokens or secrets.
 */
export const readSiteConfig = unstable_cache(
  async (): Promise<SiteConfig> => {
    const { data } = await supabase
      .from("site_config")
      .select("value")
      .eq("key", "config")
      .single();
    return data?.value
      ? { ...DEFAULTS, ...(data.value as SiteConfig) }
      : { ...DEFAULTS };
  },
  ["site-config"],
  { tags: ["site-config"] },
);

export async function writeSiteConfig(config: SiteConfig): Promise<void> {
  await supabase
    .from("site_config")
    .upsert({ key: "config", value: config }, { onConflict: "key" });
  // Push fresh config to every ISR page that rendered it.
  revalidateTag("site-config", "max");
}
