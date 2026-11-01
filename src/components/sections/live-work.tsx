"use client";

/**
 * "Our live Work" — live-project showcase with a CSS-only device stage
 * (MacBook + phone) rendering a miniature of the DEUX home page.
 *
 * Design tokens are mapped to the site's existing CSS variables in
 * @/app/live-work.css, so the section follows the current light/dark theme.
 * All copy, stats and screen content live in ./live-work-data.ts.
 *
 * Reused on the home page (after Features) and on /projects.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  liveWorkProjects,
  type LiveWorkProject,
} from "./live-work-data";
import "@/app/live-work.css";

/** Bar heights (percent) for the mini agent chart; values > 75 render as accent. */
const BAR_HEIGHTS = [40, 62, 48, 80, 56, 90, 70, 100, 64, 86] as const;

const AUTOPLAY_MS = 8000;

interface LiveWorkProps {
  /** Override the default projects (e.g. when reused on /projects). */
  projects?: LiveWorkProject[];
  /** Optional extra class on the <section>. */
  className?: string;
}

export function LiveWork({ projects = liveWorkProjects, className }: LiveWorkProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const sectionRef = useRef<HTMLElement | null>(null);

  const count = projects.length;
  const project = projects[Math.min(active, count - 1)];

  // "user" = fade-in plays (spec: clicking a pager pill fades the left column);
  // "auto" = autoplay switches silently (keeps the fade from re-running, which
  // also prevents accessibility audits from sampling mid-fade blended colors).
  const [source, setSource] = useState<"user" | "auto">("auto");

  // Autoplay: 8s, paused while the pointer is over the section, disabled for
  // reduced-motion users.
  useEffect(() => {
    if (paused || count < 2) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const id = window.setInterval(() => {
      setSource("auto");
      setActive((i) => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, count]);

  const select = useCallback((index: number) => {
    setSource("user");
    setActive(index);
  }, []);

  // Roving-tabindex keyboard support for the pager (WAI-ARIA tabs pattern).
  const onPagerKeyDown = (event: React.KeyboardEvent) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();

    let next = active;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (active + 1) % count;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (active - 1 + count) % count;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = count - 1;
    }

    setActive(next);
    setSource("user");
    tabRefs.current[next]?.focus();
  };

  return (
    <section
      ref={sectionRef}
      aria-labelledby="live-work-heading"
      className={`lw-section ${className ?? ""}`.trim()}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="lw-inner">
        <h2 id="live-work-heading" className="lw-heading font-heading">
          Our live Work
        </h2>

        <div className="lw-grid">
          {/* ---------- Left column: project details ---------- */}
          <div className="lw-left">
            {/* key remounts the panel so the fade-in plays on every user switch */}
            <div
              key={project.id}
              className={source === "user" ? "lw-panel" : undefined}
              role="tabpanel"
              id={`lw-panel-${project.id}`}
              aria-labelledby={`lw-tab-${project.id}`}
            >
              <p className="lw-name">
                <span className="lw-name-dot" aria-hidden="true" />
                {project.name}
              </p>

              <p className="lw-desc">{project.description}</p>

              <dl className="lw-stats">
                {project.stats.map((stat) => (
                  <div key={stat.label} className="lw-stat">
                    <dt className="lw-stat-label">{stat.label}</dt>
                    <dd className="lw-stat-value">{stat.value}</dd>
                  </div>
                ))}
              </dl>

              <ul className="lw-tags" aria-label="Technologies">
                {project.tags.map((tag) => (
                  <li key={tag} className="lw-tag">
                    {tag}
                  </li>
                ))}
              </ul>

              <div className="lw-ctas">
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
                <a
                  className="lw-cta lw-cta-secondary"
                  href={project.caseStudyUrl}
                >
                  Read case study
                </a>
              </div>
            </div>

            <div
              className="lw-pager"
              role="tablist"
              aria-label="Live projects"
              aria-orientation="horizontal"
              onKeyDown={onPagerKeyDown}
            >
              {projects.map((item, index) => (
                <button
                  key={item.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`lw-tab-${item.id}`}
                  aria-controls={`lw-panel-${item.id}`}
                  aria-selected={index === active}
                  tabIndex={index === active ? 0 : -1}
                  className="lw-pager-btn"
                  onClick={() => select(index)}
                >
                  {item.pager}
                </button>
              ))}
            </div>
          </div>

          {/* ---------- Right column: device stage ---------- */}
          {/* Decorative mock of the live site; hidden from assistive tech. */}
          <div className="lw-stage" aria-hidden="true">
            {/* MacBook (screen only) */}
            <div className="lw-mac">
              <div className="lw-mac-lid">
                <div className="lw-mac-screen">
                  {/* window bar */}
                  <div className="lw-winbar">
                    <span
                      className="lw-winbar-dot"
                      style={{ background: "#ff5f57" }}
                    />
                    <span
                      className="lw-winbar-dot"
                      style={{ background: "#febc2e" }}
                    />
                    <span
                      className="lw-winbar-dot"
                      style={{ background: "#28c840" }}
                    />
                    <span className="lw-winbar-url">{project.screen.url}</span>
                  </div>

                  {/* nav */}
                  <div className="lw-nav">
                    <span className="lw-nav-logo">
                      <span className="lw-nav-mark">D</span>
                      DEUX
                    </span>
                    <span className="lw-nav-links">
                      <span>Home</span>
                      <span>Services</span>
                      <span>Projects</span>
                      <span>About</span>
                    </span>
                    <span className="lw-nav-cta">Book a Call</span>
                  </div>

                  {/* hero */}
                  <div className="lw-hero">
                    <div>
                      <span className="lw-hero-badge">
                        {project.screen.badge}
                      </span>
                      <h3 className="lw-hero-h1">{project.screen.h1}</h3>
                      <p className="lw-hero-p">{project.screen.paragraph}</p>
                      <div className="lw-hero-btns">
                        <span className="lw-hero-btn-dark">Book a Call →</span>
                        <span className="lw-hero-btn-outline">
                          See Projects
                        </span>
                      </div>
                    </div>

                    {/* agent card */}
                    <div className="lw-agent-card">
                      <div className="lw-agent-top">
                        <span>{project.screen.agentCode}</span>
                        <span className="lw-agent-status">● Running</span>
                      </div>
                      <div className="lw-agent-title">
                        {project.screen.agentTitle}
                      </div>
                      <div className="lw-agent-big">
                        {project.screen.bigNumber}
                      </div>
                      <div className="lw-agent-caption">
                        {project.screen.bigCaption}
                      </div>
                      <div className="lw-bars">
                        {BAR_HEIGHTS.map((height, index) => (
                          <span
                            key={index}
                            className={`lw-bar${height > 75 ? " lw-bar-on" : ""}`}
                            style={{ height: `${height}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* stats strip */}
                  <div className="lw-strip">
                    {project.screen.strip.map((item) => (
                      <span key={item.label}>
                        <b>{item.value}</b>
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="lw-phone">
              <div className="lw-phone-screen">
                <span className="lw-phone-island" />
                <div className="lw-phone-body">
                  <div className="lw-phone-nav">
                    <span className="lw-phone-logo">DEUX</span>
                    <span className="lw-phone-menu">☰</span>
                  </div>
                  <div className="lw-phone-hero">
                    <span className="lw-phone-badge">{project.screen.badge}</span>
                    <h3 className="lw-phone-h1">{project.screen.h1}</h3>
                    <p className="lw-phone-p">{project.screen.paragraph}</p>
                    <span className="lw-phone-btn">Book a Call →</span>
                  </div>
                  <div className="lw-phone-card">
                    <div className="lw-phone-card-top">
                      <span>{project.screen.agentCode}</span>
                      <span className="lw-phone-card-status">● Running</span>
                    </div>
                    <div className="lw-phone-card-big">
                      {project.screen.bigNumber}
                    </div>
                    <div className="lw-phone-card-caption">
                      {project.screen.bigCaption}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating glass chip */}
            <div className="lw-chip">
              <span className="lw-chip-icon">✓</span>
              <span>
                <span className="lw-chip-title" style={{ display: "block" }}>
                  {project.chip.title}
                </span>
                <span className="lw-chip-sub" style={{ display: "block" }}>
                  {project.chip.sub}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
