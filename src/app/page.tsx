import dynamic from "next/dynamic";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { LiveWork } from "@/components/sections/live-work";
import { HowItWorksSection } from "@/components/sections/how-it-works";
import { MethodologySection } from "@/components/sections/methodology";
import { StatsSection } from "@/components/sections/stats";
import { FoundersSection } from "@/components/sections/founders";
import { CTASection } from "@/components/sections/cta";
import { countPublishedProjects, listPublishedProjectsWithHealth } from "@/lib/projects";
import { HOME_LIMIT } from "@/lib/live-work/types";
import { readSiteConfig } from "@/lib/site-config-server";
import { SiteConfigProvider } from "@/components/site-config-context";

export const revalidate = 3600;

/**
 * Testimonials are below the fold: the JS chunk loads after the critical
 * sections while the HTML is still server-rendered (no shift, no SEO loss).
 */
const TestimonialsBento = dynamic(
  () => import("@/components/sections/testimonials-bento").then((m) => m.TestimonialsBento),
  { ssr: true },
);

/**
 * The home page shows featured + published projects, capped at HOME_LIMIT.
 * Data is read on the server so there is no client-side fetch flash; the admin
 * invalidates this route through `revalidateProjectSite`.
 */
export default async function HomePage() {
  const [projectsHealth, total, config] = await Promise.all([
    listPublishedProjectsWithHealth({ featured: true, limit: HOME_LIMIT }),
    countPublishedProjects(),
    readSiteConfig(),
  ]);
  const { projects, degraded } = projectsHealth;

  return (
    <SiteConfigProvider config={config}>
      <HeroSection />
      <FeaturesSection />
      <LiveWork projects={projects} showViewAll={total > projects.length} degraded={degraded} />
      <HowItWorksSection />
      <MethodologySection />
      <StatsSection />
      <TestimonialsBento />
      <FoundersSection />
      <CTASection />
    </SiteConfigProvider>
  );
}
