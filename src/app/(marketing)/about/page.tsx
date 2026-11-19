import { AboutClient } from "./about-client";
import { readSiteConfig } from "@/lib/site-config-server";
import { SiteConfigProvider } from "@/components/site-config-context";

export const revalidate = 3600;

export default async function AboutPage() {
  const config = await readSiteConfig();
  return (
    <SiteConfigProvider config={config}>
      <AboutClient />
    </SiteConfigProvider>
  );
}
