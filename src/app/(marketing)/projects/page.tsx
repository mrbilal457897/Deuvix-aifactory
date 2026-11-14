import { LiveWork } from "@/components/sections/live-work";
import { ProjectsIntro } from "@/components/projects/ProjectsIntro";
import { listPublishedProjects } from "@/lib/projects";

/**
 * The listing page shows EVERY published project as the same stacked block
 * used on the home page — no grid, no client-side fetch.
 */
export default async function ProjectsPage() {
  const projects = await listPublishedProjects();

  return (
    <div>
      {/* Intro hero */}
      <ProjectsIntro />

      {/* Every published project, stacked. */}
      <div id="projects-list" className="scroll-mt-24">
        <LiveWork projects={projects} />
      </div>
    </div>
  );
}
