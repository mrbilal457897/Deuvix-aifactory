"use client";

import Link from "next/link";
import type { PublicProject } from "@/lib/live-work/types";
import { ProjectBlock } from "./project-block";
import "@/app/live-work.css";

/**
 * "Our live Work" — a stack of independent project blocks.
 *
 * This used to be a one-at-a-time carousel with a pager, autoplay timer and
 * hover-switching. All of that is gone: every published project is rendered at
 * once, in `order`, and nothing swaps in place.
 */

export interface LiveWorkProps {
  /** Published projects, already sorted by `order`. */
  projects: PublicProject[];
  /** Shown only when more projects exist than are displayed. */
  showViewAll?: boolean;
  className?: string;
}

export function LiveWork({ projects, showViewAll = false, className = "" }: LiveWorkProps) {
  // Zero projects → the section disappears entirely, with no empty shell.
  if (projects.length === 0) return null;

  return (
    <section
      className={`lw-section ${className}`.trim()}
      aria-labelledby="live-work-heading"
    >
      <div className="lw-inner">
        <h2 id="live-work-heading" className="lw-heading font-heading">
          Our live Work
        </h2>

        <div className="lw-blocks">
          {projects.map((project, index) => (
            <ProjectBlock
              key={project.id}
              project={project}
              index={index}
              priority={index === 0}
            />
          ))}
        </div>

        {showViewAll && (
          <div className="lw-more">
            <Link className="lw-more-link" href="/projects">
              View all projects
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
