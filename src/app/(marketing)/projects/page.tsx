import { LiveWork } from "@/components/sections/live-work";
import { ProjectsIntro } from "@/components/projects/ProjectsIntro";
import { listPublishedProjectsWithHealth } from "@/lib/projects";
import { JsonLd } from "@/lib/jsonld";
import { breadcrumbJsonLd, creativeWorkJsonLd, graph } from "@/lib/json-ld";

export const revalidate = 3600;

/**
 * The listing page shows EVERY published project as the same stacked block
 * used on the home page — no grid, no client-side fetch.
 */
export default async function ProjectsPage() {
  const { projects, degraded } = await listPublishedProjectsWithHealth();

  const jsonLd = graph([
    breadcrumbJsonLd([
      { label: "Home", href: "/" },
      { label: "Work" },
    ]),
    ...projects.map((project) =>
      creativeWorkJsonLd({
        slug: project.slug,
        name: project.name,
        description: project.description,
        image: project.desktopThumbnail?.url,
        tags: project.tags,
        updatedAt: project.updatedAt,
      })
    ),
  ]);

  return (
    <div>
      <JsonLd data={jsonLd} />

      {/* Intro hero */}
      <ProjectsIntro />

      {/* Every published project, stacked. */}
      <div id="projects-list" className="scroll-mt-24">
        <LiveWork projects={projects} degraded={degraded} />
      </div>
    </div>
  );
}
