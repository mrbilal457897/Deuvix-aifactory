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
  /**
   * True when the read failed (e.g. Supabase paused on the free plan) rather
   * than "no projects published" — renders a friendly notice instead of
   * disappearing silently or showing broken blanks.
   */
  degraded?: boolean;
}

export function LiveWork({ projects, showViewAll = false, className = "", degraded = false }: LiveWorkProps) {
  // Read failed (Supabase down/paused): friendly fallback, never a broken page.
  if (projects.length === 0 && degraded) {
    return (
      <section
        className={`lw-section ${className}`.trim()}
        aria-labelledby="live-work-heading"
      >
        <div className="lw-inner">
          <h2 id="live-work-heading" className="lw-heading font-heading">
            Our live Work
          </h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
            Our live Work gallery is being refreshed — please check back in a few minutes,
            or see the highlights on the{" "}
            <Link className="font-medium text-foreground underline underline-offset-4" href="/projects">
              work page
            </Link>
            .
          </p>
        </div>
      </section>
    );
  }

  // Zero projects — the section disappears entirely, with no empty shell.
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
              View all work
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
