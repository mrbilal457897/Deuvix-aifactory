"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicProject } from "@/lib/live-work/types";
import { hostnameFromUrl } from "@/lib/live-work/mapping";
import { DeviceStage } from "./live-work-device";
import "@/app/live-work.css";

/**
 * One standalone project block: text on one side, device stage on the other.
 *
 * Every project renders its own block — there is no carousel, pager or
 * autoplay anywhere in this file. Blocks reveal once as they scroll into view.
 */

/** True when the visitor asked for reduced motion. */
function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export interface ProjectBlockProps {
  project: PublicProject;
  /** Position in the list; drives the chip's float phase. */
  index?: number;
  /** Preview-only flip (context left, devices right) — the site renders devices left. */
  mirrored?: boolean;
  /** Above-the-fold blocks preload their images. */
  priority?: boolean;
  /** Set false where a hidden initial state would be wrong (detail page hero). */
  reveal?: boolean;
  /** The detail page renders the project name as its own h1 instead. */
  hideName?: boolean;
  className?: string;
}

export function ProjectBlock({
  project,
  index = 0,
  mirrored = false,
  priority = false,
  reveal = true,
  hideName = false,
  className = "",
}: ProjectBlockProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(!reveal);

  useEffect(() => {
    if (!reveal || revealed) return;
    const node = ref.current;
    if (!node) return;

    const THRESHOLD = 0.12;
    /** How often the safety net re-checks when observers are unavailable. */
    const POLL_MS = 300;
    const POLL_LIMIT_MS = 60_000;

    /** True when at least 12% of the block is inside the viewport. */
    const isVisible = (): boolean => {
      const rect = node.getBoundingClientRect();
      const height = window.innerHeight || document.documentElement.clientHeight;
      const shown = Math.min(rect.bottom, height) - Math.max(rect.top, 0);
      return rect.height > 0 ? shown / rect.height >= THRESHOLD : shown > 0;
    };

    let done = false;
    let observer: IntersectionObserver | null = null;
    let poll = 0;
    let pollStop = 0;

    const teardown = () => {
      if (done) return;
      done = true;
      observer?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (poll) window.clearInterval(poll);
      if (pollStop) window.clearTimeout(pollStop);
    };

    const show = () => {
      setRevealed(true);
      teardown();
    };

    function onScroll() {
      if (!done && isVisible()) show();
    }

    // Reduced motion, or a browser without IntersectionObserver: show at once.
    // A timer (not requestAnimationFrame) — rAF never runs in a background tab.
    if (typeof IntersectionObserver === "undefined" || reducedMotion()) {
      const timer = window.setTimeout(show, 0);
      return () => window.clearTimeout(timer);
    }

    // Already on screen: reveal now rather than waiting for an observer
    // callback, which some environments defer indefinitely.
    if (isVisible()) {
      const timer = window.setTimeout(show, 0);
      return () => window.clearTimeout(timer);
    }

    // Primary path: reveal once at threshold .12, then unobserve.
    observer = new IntersectionObserver(
      (entries) => {
        if (!done && entries.some((entry) => entry.isIntersecting)) show();
      },
      { threshold: THRESHOLD }
    );
    observer.observe(node);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    // Safety net: observers and scroll events can be throttled to nothing in a
    // tab that is not painting. Poll until it is on screen, then stop; the
    // observer stays attached either way.
    poll = window.setInterval(() => {
      if (isVisible()) show();
    }, POLL_MS);
    pollStop = window.setTimeout(() => window.clearInterval(poll), POLL_LIMIT_MS);

    return teardown;
  }, [reveal, revealed]);

  const stats = project.stats.slice(0, 3);
  const tags = project.tags.slice(0, 4);
  const caseStudyHref = project.caseStudyUrl?.trim() || `/projects/${project.slug}`;

  return (
    <article
      ref={ref}
      className={[
        "lw-block",
        mirrored ? "lw-block-mirrored" : "",
        reveal ? "lw-reveal" : "",
        revealed ? "lw-revealed" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...(hideName ? {} : { "aria-labelledby": `lw-name-${project.id}` })}
    >
      <div className="lw-block-text">
        {!hideName && (
          <p className="lw-name" id={`lw-name-${project.id}`}>
            <span className="lw-name-dot" aria-hidden="true" />
            {project.name}
            {project.unitId ? <span className="lw-unit"> {project.unitId}</span> : null}
          </p>
        )}

        <p className="lw-desc">{project.description}</p>

        {stats.length > 0 && (
          <dl className="lw-stats">
            {stats.map((stat) => (
              <div key={stat.label} className="lw-stat">
                <dt className="lw-stat-label">{stat.label}</dt>
                <dd className="lw-stat-value">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {tags.length > 0 && (
          <ul className="lw-tags" aria-label="Technologies">
            {tags.map((tag) => (
              <li key={tag} className="lw-tag">
                {tag}
              </li>
            ))}
          </ul>
        )}

        <div className="lw-ctas">
          {project.liveUrl && (
            <a
              className="lw-cta lw-cta-primary"
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View live site
              <span className="lw-cta-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          )}
          <a className="lw-cta lw-cta-secondary" href={caseStudyHref}>
            Read case study
          </a>
        </div>
      </div>

      <div className="lw-block-stage">
        <DeviceStage
          desktop={project.desktopThumbnail}
          mobile={project.mobileThumbnail}
          browserUrlLabel={project.browserUrlLabel ?? hostnameFromUrl(project.liveUrl)}
          chipTitle={project.chipTitle}
          chipSubtitle={project.chipSubtitle ?? (project.unitId ? `${project.unitId} · just now` : undefined)}
          mirrored={mirrored}
          priority={priority}
          chipDelay={-index * 2}
        />
      </div>
    </article>
  );
}
