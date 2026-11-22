"use client";

/**
 * FDE loop — an interactive 3D-looking orbit shown in the hero's right panel.
 * Canvas is 2D only; every animated value lives in refs so React re-renders
 * only when the visible phase / badge / counter actually changes.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import styles from "./hero.module.css";

/** Editable copy — kept as one array so the text is easy to change. */
export type FdePhase = {
  node: string;
  title: string;
  tagline: string;
  description: string;
  cta: string;
};

export const FDE_PHASES: FdePhase[] = [
  {
    node: "Specify",
    title: "Set Direction",
    tagline: "Specs live in someone's head.",
    description:
      "We extract the domain knowledge from your workflows, interviews and tickets, then turn it into an executable spec for AI workers.",
    cta: "Signed-off blueprint",
  },
  {
    node: "Build",
    title: "Build Workers",
    tagline: "Agents improvise and drift.",
    description:
      "Digital FTEs built strictly from the signed spec — spec-driven, human-gated, tuned to your stack and tools.",
    cta: "Working FDE",
  },
  {
    node: "Verify",
    title: "Verify & Govern",
    tagline: "Nobody trusts the agent.",
    description:
      "Loop engineering: policy gates, audit logs, rollback and continuous eval — humans in the loop for every exception.",
    cta: "Verification report",
  },
  {
    node: "Deploy",
    title: "Deploy & Scale",
    tagline: "Demo works, production doesn't.",
    description:
      "24/7 production runs with observability, SLAs and a monetization model — subscriptions, success fees or licenses.",
    cta: "Production FDE",
  },
];

const PHASE_MS = 6500;
const PACKET_SPEED = (34 * Math.PI) / 180; // radians per second
const BASE_ANGLES = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
const FRONT_ANGLE = Math.PI / 2; // active node sits at the front-bottom of the ring

const TAU = Math.PI * 2;
const mod = (a: number) => ((a % TAU) + TAU) % TAU;
const shortest = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Did a packet angle pass `target` between two frames (handles wrap-around)? */
function crossed(prev: number, next: number, target: number): boolean {
  const from = mod(prev);
  const to = mod(next);
  const t = mod(target);
  if (to >= from) return t > from && t <= to;
  return t > from || t <= to;
}

type TokenColors = {
  fontFamily: string;
  labelWeight: string;
  accent: string;
  navy: string;
  text: string;
  muted: string;
  warm: string;
};

function readTokens(root: HTMLElement, label: HTMLElement | null): TokenColors {
  const cs = getComputedStyle(root);
  const labelCs = label ? getComputedStyle(label) : null;
  return {
    fontFamily: cs.fontFamily,
    labelWeight: labelCs?.fontWeight ?? "400",
    // The card is intentionally dark in both themes: these are the existing
    // panel values, read from the site tokens where a token exists.
    accent: getComputedStyle(document.documentElement).getPropertyValue("--secondary").trim() || "#4299e1",
    navy: "#0C1016",
    text: "#F2F4F7",
    muted: "#C9CED6",
    warm: "#FFB3B3",
  };
}

export function FdeRoadmap({ active = true }: { active?: boolean }) {
  const [phase, setPhaseState] = useState(0);
  const [loops, setLoops] = useState(0);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const barRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const phaseRef = useRef(0);
  const activeRef = useRef(active);
  const pausedRef = useRef(false);
  const visibleRef = useRef(true);
  const nodesRef = useRef<Array<{ x: number; y: number }>>([]);
  const hoverNodeRef = useRef<number | null>(null);
  const parallaxRef = useRef({ x: 0, y: 0 });

  const setPhase = useCallback((next: number) => {
    phaseRef.current = ((next % FDE_PHASES.length) + FDE_PHASES.length) % FDE_PHASES.length;
    setPhaseState(phaseRef.current);
  }, []);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  /* ---- canvas scene ----------------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const panel = panelRef.current;
    if (!canvas || !panel) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tokens = readTokens(panel, labelRef.current);

    let w = 0;
    let h = 0;
    let raf = 0;
    let last = performance.now();
    let rotation = FRONT_ANGLE - BASE_ANGLES[0];
    let phaseElapsed = 0;
    let flashAt = -Infinity;
    let badgeUntil = 0;
    let gateBadge: { text: string; kind: "good" | "human" } | null = null;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const packets = [
      { angle: 0.4, pauseUntil: 0 },
      { angle: Math.PI + 0.4, pauseUntil: 0 },
    ];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const io = new IntersectionObserver((entries) => {
      visibleRef.current = entries[0]?.isIntersecting ?? true;
    });
    io.observe(panel);

    const onVisibility = () => {
      visibleRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    const draw = (now: number, dt: number) => {
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2 + pointer.x * 9;
      const cy = h * 0.5 + pointer.y * 6;
      const rx = Math.min(w * 0.37, 150);
      const ry = h * 0.24 * (1 + pointer.y * 0.1);

      // background stars
      ctx.save();
      for (let i = 0; i < 18; i += 1) {
        const sx = ((i * 67 + 23) % 100) / 100 * w;
        const sy = ((i * 41 + 11) % 100) / 100 * h;
        const twinkle = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(now / 700 + i));
        ctx.fillStyle = `rgba(242,244,247,${twinkle})`;
        ctx.beginPath();
        ctx.arc(sx, sy, i % 5 === 0 ? 1.3 : 0.8, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      // faint dashed outer orbit
      ctx.save();
      ctx.setLineDash([3, 7]);
      ctx.strokeStyle = "rgba(201,206,214,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 1.16, ry * 1.18, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();

      // ring back / front halves
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(46,197,255,0.18)";
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, TAU);
      ctx.stroke();
      ctx.strokeStyle = "rgba(46,197,255,0.55)";
      ctx.shadowColor = tokens.accent;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
      ctx.stroke();
      ctx.restore();

      // glowing accent arc from phase 1 up to the active phase
      const activeIndex = phaseRef.current;
      const arcStart = mod(BASE_ANGLES[0] + rotation);
      const arcEnd = FRONT_ANGLE;
      if (activeIndex > 0) {
        ctx.save();
        ctx.lineWidth = 3;
        ctx.strokeStyle = tokens.accent;
        ctx.shadowColor = tokens.accent;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, arcStart, arcEnd);
        ctx.stroke();
        ctx.restore();
      }

      // ring flash when a packet is gated
      const flashAge = now - flashAt;
      if (flashAge >= 0 && flashAge < 900) {
        const p = flashAge / 900;
        ctx.save();
        ctx.strokeStyle = `rgba(46,197,255,${(1 - p) * 0.7})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * (1 + p * 0.28), ry * (1 + p * 0.28), 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      const nodePos = BASE_ANGLES.map((base) => {
        const a = base + rotation;
        return {
          a,
          x: cx + rx * Math.cos(a),
          y: cy + ry * Math.sin(a),
          depth: (Math.sin(a) + 1) / 2,
        };
      });
      nodesRef.current = nodePos.map((n) => ({ x: n.x, y: n.y }));

      // dotted beam from hub to the active node
      const target = nodePos[activeIndex];
      ctx.save();
      ctx.setLineDash([3, 5]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = tokens.accent;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
      ctx.restore();

      // hub with slow pulse
      const pulse = reduce.matches ? 0.5 : 0.5 + 0.5 * Math.sin(now / 900);
      ctx.save();
      ctx.strokeStyle = `rgba(46,197,255,${0.25 + pulse * 0.25})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 30 + pulse * 8, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "rgba(12,16,22,0.92)";
      ctx.shadowColor = tokens.accent;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = tokens.accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = tokens.text;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${tokens.labelWeight} 12px ${tokens.fontFamily}`;
      ctx.fillText("FDE", cx, cy - 5);
      ctx.fillStyle = tokens.accent;
      ctx.font = `${tokens.labelWeight} 10px ${tokens.fontFamily}`;
      ctx.fillText("loop", cx, cy + 9);
      ctx.restore();

      // nodes, back ones first
      const order = [0, 1, 2, 3].sort((a, b) => nodePos[a].depth - nodePos[b].depth);
      for (const i of order) {
        const n = nodePos[i];
        const isActive = i === activeIndex;
        const isDone = i < activeIndex;
        const r = 13 + n.depth * 5 + (isActive ? 3 : 0);
        ctx.save();
        ctx.globalAlpha = 0.45 + n.depth * 0.55;
        ctx.fillStyle = isActive || isDone ? "rgba(46,197,255,0.22)" : "rgba(242,244,247,0.08)";
        ctx.strokeStyle = isActive ? tokens.accent : "rgba(201,206,214,0.6)";
        ctx.lineWidth = isActive ? 2 : 1;
        if (isActive) {
          ctx.shadowColor = tokens.accent;
          ctx.shadowBlur = 14;
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = isActive ? tokens.text : tokens.muted;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${tokens.labelWeight} ${11 + n.depth * 2}px ${tokens.fontFamily}`;
        ctx.fillText(isDone ? "✓" : String(i + 1), n.x, n.y + 0.5);
        // label under the node
        ctx.font = `${tokens.labelWeight} 10px ${tokens.fontFamily}`;
        ctx.fillStyle = isActive ? tokens.accent : tokens.muted;
        ctx.fillText(FDE_PHASES[i].node, n.x, n.y + r + 11);
        if (hoverNodeRef.current === i) {
          ctx.strokeStyle = tokens.accent;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 6, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
      }

      // packets with comet trails
      if (!reduce.matches) {
        for (const packet of packets) {
          const a = mod(packet.angle);
          const px = cx + rx * Math.cos(a);
          const py = cy + ry * Math.sin(a);
          ctx.save();
          for (let t = 1; t <= 8; t += 1) {
            const ta = a - t * 0.05;
            const tx = cx + rx * Math.cos(ta);
            const ty = cy + ry * Math.sin(ta);
            ctx.fillStyle = `rgba(46,197,255,${0.45 * (1 - t / 9)})`;
            ctx.beginPath();
            ctx.arc(tx, ty, 3.2 - t * 0.25, 0, TAU);
            ctx.fill();
          }
          ctx.fillStyle = "#8FE1FF";
          ctx.shadowColor = tokens.accent;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(px, py, 3.4, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      }

      // gate badge above the Verify node
      if (gateBadge && now < badgeUntil) {
        const v = nodePos[2];
        const text = gateBadge.text;
        ctx.save();
        ctx.font = `${tokens.labelWeight} 10px ${tokens.fontFamily}`;
        const tw = ctx.measureText(text).width + 16;
        const bx = v.x - tw / 2;
        const by = v.y - 42;
        ctx.fillStyle = gateBadge.kind === "good" ? "rgba(76,175,125,0.9)" : "rgba(245,158,11,0.9)";
        ctx.fillRect(bx, by, tw, 20);
        ctx.fillStyle = "#0C1016";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, v.x, by + 10);
        ctx.restore();
      }
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      if (activeRef.current && visibleRef.current && !pausedRef.current) {
        if (!reduce.matches) {
          // rotation eases to the shortest path so the active node leads at front-bottom
          const targetRotation = FRONT_ANGLE - BASE_ANGLES[phaseRef.current];
          rotation += shortest(targetRotation - rotation) * Math.min(1, dt * 4);

          for (const packet of packets) {
            if (now < packet.pauseUntil) continue;
            const prev = packet.angle;
            const next = prev + PACKET_SPEED * dt;
            const verifyAngle = BASE_ANGLES[2] + rotation;
            const specifyAngle = BASE_ANGLES[0] + rotation;
            if (crossed(prev, next, verifyAngle)) {
              packet.angle = next;
              packet.pauseUntil = now + 1500;
              flashAt = now;
              const human = Math.random() < 0.5;
              gateBadge = {
                text: human ? "Human approves" : "Gate passed",
                kind: human ? "human" : "good",
              };
              badgeUntil = now + 1500;
            } else if (crossed(prev, next, specifyAngle)) {
              setLoops((n) => n + 1);
              packet.angle = next;
            } else {
              packet.angle = next;
            }
          }

          phaseElapsed += dt * 1000;
          if (phaseElapsed >= PHASE_MS) {
            phaseElapsed = 0;
            setPhase(phaseRef.current + 1);
          }
        } else {
          rotation = FRONT_ANGLE - BASE_ANGLES[phaseRef.current];
        }
      }

      pointer.tx = parallaxRef.current.x;
      pointer.ty = parallaxRef.current.y;
      pointer.x = lerp(pointer.x, pointer.tx, Math.min(1, dt * 6));
      pointer.y = lerp(pointer.y, pointer.ty, Math.min(1, dt * 6));

      barRefs.current.forEach((bar, i) => {
        if (!bar) return;
        const fill =
          i < phaseRef.current ? 1 : i === phaseRef.current ? (reduce.matches ? 1 : phaseElapsed / PHASE_MS) : 0;
        bar.style.transform = `scaleX(${Math.max(0, Math.min(1, fill))})`;
      });

      draw(now, dt);
      if (activeRef.current && visibleRef.current) raf = requestAnimationFrame(tick);
    };

    if (activeRef.current && visibleRef.current) raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, setPhase]);

  /* ---- interaction ------------------------------------------------------ */
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    parallaxRef.current = {
      x: ((e.clientX - r.left) / r.width) * 2 - 1,
      y: ((e.clientY - r.top) / r.height) * 2 - 1,
    };
  }, []);

  const onCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const hit = nodesRef.current.findIndex(
        (n) => Math.hypot(n.x - x, n.y - y) <= 30,
      );
      if (hit >= 0) setPhase(hit);
    },
    [setPhase],
  );

  const onCanvasMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = nodesRef.current.findIndex((n) => Math.hypot(n.x - x, n.y - y) <= 30);
    hoverNodeRef.current = hit >= 0 ? hit : null;
    e.currentTarget.style.cursor = hit >= 0 ? "pointer" : "default";
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPhase(phaseRef.current - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPhase(phaseRef.current + 1);
      }
    },
    [setPhase],
  );

  const current = FDE_PHASES[phase];

  return (
    <div
      ref={panelRef}
      className={styles.roadmap}
      role="tabpanel"
      aria-label="FDE delivery roadmap"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerEnter={() => (pausedRef.current = true)}
      onPointerLeave={() => (pausedRef.current = false)}
      onFocusCapture={() => (pausedRef.current = true)}
      onBlurCapture={() => (pausedRef.current = false)}
      onPointerMove={onPointerMove}
    >
      {/* HUD */}
      <div className={styles.loopHud}>
        <span className={styles.loopHudLeft}>
          <span className={styles.loopDot} aria-hidden="true" />
          FDE loop running
        </span>
        <span className={styles.loopHudRight}>
          Loops completed <span className={styles.loopCount}>{loops}</span>
        </span>
      </div>

      {/* Canvas scene */}
      <canvas
        ref={canvasRef}
        className={styles.loopCanvas}
        aria-label="Animated FDE loop with four phases: Specify, Build, Verify and Deploy. Select a node or use the phase buttons below."
        onClick={onCanvasClick}
        onPointerMove={onCanvasMove}
        onPointerLeave={() => (hoverNodeRef.current = null)}
      />

      {/* Copy block */}
      <div key={phase} className={styles.loopCopy} aria-live="polite">
        <span ref={labelRef} className={styles.loopEyebrow}>
          Phase {phase + 1} of {FDE_PHASES.length}
        </span>
        <h3 className={styles.loopTitle}>{current.title}</h3>
        <p className={styles.loopTagline}>{current.tagline}</p>
        <p className={styles.loopDesc}>{current.description}</p>
        <div className={styles.loopCtaRow}>
          <button type="button" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), styles.loopGhost)}>
            {current.cta}
          </button>
          <Link href="/book-a-call" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), styles.loopPrimary)}>
            Book a call
            <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Phase progress buttons */}
      <div className={styles.loopBars}>
        {FDE_PHASES.map((p, i) => (
          <button
            key={p.node}
            type="button"
            className={styles.loopBar}
            onClick={() => setPhase(i)}
            aria-label={`Show phase ${i + 1}: ${p.title}`}
            aria-current={i === phase ? "step" : undefined}
          >
            <span
              ref={(el) => {
                barRefs.current[i] = el;
              }}
              className={styles.loopBarFill}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
