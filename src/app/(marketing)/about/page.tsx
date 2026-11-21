import { AboutClient } from "./about-client";
import { readSiteConfig } from "@/lib/site-config-server";
import { SiteConfigProvider } from "@/components/site-config-context";
import { JsonLd } from "@/lib/jsonld";
import { aboutPageJsonLd, breadcrumbJsonLd, graph } from "@/lib/json-ld";

export const revalidate = 3600;

export default async function AboutPage() {
  const config = await readSiteConfig();
  const jsonLd = graph([
    breadcrumbJsonLd([
      { label: "Home", href: "/" },
      { label: "About" },
    ]),
    aboutPageJsonLd(),
  ]);

  return (
    <SiteConfigProvider config={config}>
      <JsonLd data={jsonLd} />
      <AboutClient />
    </SiteConfigProvider>
  );
}
