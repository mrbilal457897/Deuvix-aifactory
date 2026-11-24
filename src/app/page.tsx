import dynamic from "next/dynamic";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { countPublishedProjects, listPublishedProjectsWithHealth } from "@/lib/projects";
import { HOME_LIMIT } from "@/lib/live-work/types";
import { readSiteConfig } from "@/lib/site-config-server";
import { SiteConfigProvider } from "@/components/site-config-context";

export const revalidate = 3600;

/**
 * Below-the-fold sections are client-only: they are not needed for first paint
 * and must not take part in initial React hydration (largest TBT contributor).
 */
const LiveWork = dynamic(
  () => import("@/components/sections/live-work").then((m) => ({ default: m.LiveWork })),
  { ssr: true }
);
const HowItWorksSection = dynamic(
  () => import("@/components/sections/how-it-works").then((m) => ({ default: m.HowItWorksSection })),
  { ssr: true }
);
const MethodologySection = dynamic(
  () => import("@/components/sections/methodology").then((m) => ({ default: m.MethodologySection })),
  { ssr: true }
);
const StatsSection = dynamic(
  () => import("@/components/sections/stats").then((m) => ({ default: m.StatsSection })),
  { ssr: true }
);
const TestimonialsBento = dynamic(
  () => import("@/components/sections/testimonials-bento").then((m) => m.TestimonialsBento),
  { ssr: true }
);
const FoundersSection = dynamic(
  () => import("@/components/sections/founders").then((m) => ({ default: m.FoundersSection })),
  { ssr: true }
);
const CTASection = dynamic(
  () => import("@/components/sections/cta").then((m) => ({ default: m.CTASection })),
  { ssr: true }
);

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

