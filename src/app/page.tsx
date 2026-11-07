import { HeroSection } from "@/components/sections/hero";
import { FeaturesSection } from "@/components/sections/features";
import { LiveWork } from "@/components/sections/live-work";
import { HowItWorksSection } from "@/components/sections/how-it-works";
import { StatsSection } from "@/components/sections/stats";
import { TestimonialsBento } from "@/components/sections/testimonials-bento";
import { FoundersSection } from "@/components/sections/founders";
import { CTASection } from "@/components/sections/cta";
import { countPublishedProjects, listPublishedProjects } from "@/lib/projects";
import { HOME_LIMIT } from "@/lib/live-work/types";

/**
 * The home page shows featured + published projects, capped at HOME_LIMIT.
 * Data is read on the server so there is no client-side fetch flash; the admin
 * invalidates this route through `revalidateProjectSite`.
 */
export default async function HomePage() {
  const [projects, total] = await Promise.all([
    listPublishedProjects({ featured: true, limit: HOME_LIMIT }),
    countPublishedProjects(),
  ]);

  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <LiveWork projects={projects} showViewAll={total > projects.length} />
      <HowItWorksSection />
      <StatsSection />
      <TestimonialsBento />
      <FoundersSection />
      <CTASection />
    </>
  );
}
