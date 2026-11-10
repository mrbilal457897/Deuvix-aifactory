"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import styles from "./hero.module.css";

/**
 * FDE delivery roadmap — dark panel, landscape wheel (left) + phase copy (right).
 * 4 phases, auto-advance every 3.6s, pause on hover / when Sara tab is active,
 * click node or segment to jump, ArrowLeft / ArrowRight to change phase.
 */

type Phase = {
  label: string;
  title: string;
  problem: string;
  description: string;
  output: string;
};

const PHASES: Phase[] = [
  {
    label: "Set Direction",
    title: "Set Direction",
    problem: "Specs live in someone's head.",
    description:
      "We extract the domain knowledge from your workflows, interviews and tickets, then turn it into an executable spec for AI workers.",
    output: "Signed-off blueprint",
  },
  {
    label: "Build Workers",
    title: "Build Workers",
    problem: "Agents improvise and drift.",
    description:
      "Digital FTEs built strictly from the signed spec — spec-driven, human-gated, tuned to your stack and tools.",
    output: "Working FDE",
  },
  {
    label: "Verify & Govern",
    title: "Verify & Govern",
    problem: "Nobody trusts the agent.",
    description:
      "Loop engineering: policy gates, audit logs, rollback and continuous eval — humans in the loop for every exception.",
    output: "Verification report",
  },
  {
    label: "Deploy & Scale",
    title: "Deploy & Scale",
    problem: "Demo works, production doesn't.",
    description:
      "24/7 production runs with observability, SLAs and a monetization model — subscriptions, success fees or licenses.",
    output: "Production FDE",
  },
];

const NODE_POSITIONS = [
  { x: 110, y: 18 },
  { x: 202, y: 110 },
  { x: 110, y: 202 },
  { x: 18, y: 110 },
] as const;

export function FdeRoadmap({ active = true }: { active?: boolean }) {
  const [phase, setPhase] = useState(0);
  const hovering = useRef(false);
  const autoplay = useRef<number | null>(null);

  const stopAutoplay = useCallback(() => {
    if (autoplay.current) {
      window.clearInterval(autoplay.current);
      autoplay.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    if (autoplay.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    autoplay.current = window.setInterval(() => {
      if (hovering.current) return;
      setPhase((p) => (p + 1) % PHASES.length);
    }, 3600);
  }, []);

  // auto-advance only while this tab is visible/active
  useEffect(() => {
    if (active && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      startAutoplay();
    } else {
      stopAutoplay();
    }
    return stopAutoplay;
  }, [active, startAutoplay, stopAutoplay]);

  const goto = useCallback((i: number) => {
    setPhase(((i % PHASES.length) + PHASES.length) % PHASES.length);
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goto(phase - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goto(phase + 1);
      }
    },
    [goto, phase]
  );

  const current = PHASES[phase];

  // arc path: pick two points on the ring and arc between them
  const arcPath = `M ${NODE_POSITIONS[3].x} ${NODE_POSITIONS[3].y} A 92 92 0 0 1 ${NODE_POSITIONS[0].x} ${NODE_POSITIONS[0].y} A 92 92 0 0 1 ${NODE_POSITIONS[1].x} ${NODE_POSITIONS[1].y} A 92 92 0 0 1 ${NODE_POSITIONS[2].x} ${NODE_POSITIONS[2].y}`;

  return (
    <section
      className={`${styles.roadmap}`}
      role="tabpanel"
      aria-label="FDE delivery roadmap"
      onKeyDown={onKeyDown}
      tabIndex={0}
      onMouseEnter={() => (hovering.current = true)}
      onMouseLeave={() => (hovering.current = false)}
    >
      {/* wheel (left half) */}
      <div className={styles.wheelWrap}>
        <svg
          className={styles.wheel}
          viewBox="0 0 220 220"
          role="group"
          aria-label="Roadmap wheel with 4 phases"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="fdeArc" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2EC5FF" stopOpacity="0.2" />
              <stop offset="45%" stopColor="#2EC5FF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0A84FF" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* rotating dashed ring */}
          <g className={styles.wheelRing}>
            <circle className={styles.dash} cx="110" cy="110" r="92" />
          </g>

          {/* progress arc */}
          <path className={styles.wheelArc} d={arcPath} />

          {/* spokes */}
          {NODE_POSITIONS.map((n, i) => (
            <line
              key={`spoke-${i}`}
              className={styles.wheelSpoke}
              x1="110"
              y1="110"
              x2={n.x}
              y2={n.y}
            />
          ))}

          {/* core */}
          <circle className={styles.wheelCore} cx="110" cy="110" r="34" />
          <text className={styles.wheelCoreText} x="110" y="113" textAnchor="middle">
            FDE
          </text>
          <text className={styles.wheelCoreSub} x="110" y="129" textAnchor="middle">
            LOOP
          </text>

          {/* nodes (clickable) */}
          {NODE_POSITIONS.map((pos, i) => {
            const isActive = i === phase;
            const isDone = i < phase;
            const cls = [
              styles.nodeCircleOuter,
              isActive ? styles.nodeActive : "",
              isDone ? styles.nodeDone : "",
            ]
              .filter(Boolean)
              .join(" ");
            const textCls = [
              styles.nodeText,
              isActive ? styles.nodeActiveText : "",
              isDone ? styles.nodeDoneText : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <g key={`node-${i}`}>
                {/* invisible 48px hit target for touch */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={24}
                  fill="transparent"
                  cursor="pointer"
                  onClick={() => goto(i)}
                />
                <circle
                  className={cls}
                  cx={pos.x}
                  cy={pos.y}
                  r={isActive ? 15 : 13}
                  onClick={() => goto(i)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Go to phase ${i + 1}: ${PHASES[i].title}`}
                  aria-current={isActive ? "step" : undefined}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      goto(i);
                    }
                  }}
                />
                <text className={textCls} x={pos.x} y={pos.y + 4} textAnchor="middle">
                  0{i + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* phase text (right half) */}
      <div className={styles.phasePanel}>
        <div className={styles.phaseCounter}>
          Phase 0{phase + 1} / 04
        </div>
        <div className={styles.phaseLabel}>{current.label}</div>
        <h3 className={styles.phaseTitle}>{current.title}</h3>
        <p className={styles.phaseProblem}>{current.problem}</p>
        <p className={styles.phaseDesc}>{current.description}</p>
        <span className={styles.outputChip}>{current.output}</span>

        {/* progress segments */}
        <div className={styles.segments} role="presentation">
          {PHASES.map((p, i) => (
            <button
              key={p.title}
              type="button"
              className={`${styles.segment} ${i < phase ? styles.segmentDone : ""} ${
                i === phase ? styles.segmentActive : ""
              }`}
              onClick={() => goto(i)}
              aria-label={`Phase ${i + 1}: ${p.title}`}
              aria-current={i === phase ? "step" : undefined}
            />
          ))}
        </div>

        <Link href="/book-a-call" className={styles.bookSmall}>
          Book a Call
          <ArrowUpRight size={12} strokeWidth={2.5} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
