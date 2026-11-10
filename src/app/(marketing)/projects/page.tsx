import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { LiveWork } from "@/components/sections/live-work";
import { listPublishedProjects } from "@/lib/projects";

/**
 * The listing page shows EVERY published project as the same stacked block
 * used on the home page — no grid, no client-side fetch.
 */
export default async function ProjectsPage() {
  const projects = await listPublishedProjects();

  return (
    <div>
      {/* Hero */}
      <section className="pt-8 sm:pt-12 pb-16 bg-hero-pattern relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative mx-auto max-w-7xl px-6 sm:px-6 lg:px-8 text-center">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Work" }]}
          className="mb-4 sm:mb-6"
        />
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Portfolio</Badge>
        <h1 className="font-heading h1 mb-4">
          Our <span className="text-gradient">Work</span>
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground text-base">
          Selected work: websites and platforms we&apos;ve designed and shipped.
        </p>
        </div>
      </section>

      {/* Every published project, stacked. */}
      <LiveWork projects={projects} />
    </div>
  );
}
