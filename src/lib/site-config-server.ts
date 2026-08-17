import { supabase } from "./supabase";
import { DEFAULTS, type SiteConfig } from "./site-config";

export async function readSiteConfig(): Promise<SiteConfig> {
  const { data } = await supabase.from("site_config").select("value").eq("key", "config").single();
  if (!data?.value) return { ...DEFAULTS };
  return { ...DEFAULTS, ...(data.value as SiteConfig) };
}

export async function writeSiteConfig(config: SiteConfig): Promise<void> {
  await supabase
    .from("site_config")
    .upsert({ key: "config", value: config }, { onConflict: "key" });
}
