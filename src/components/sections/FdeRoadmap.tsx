"use client";

import { useEffect, useRef } from "react";
import styles from "./fde-roadmap.module.css";

/** Editable stage captions — the bench artwork mirrors these six stages. */
const STAGES = [
  {
    title: "Spec-driven development",
    subtitle: "Write what done looks like in words both humans and AI can read.",
  },
  {
    title: "Co-learning",
    subtitle: "Your team and our engineer shape the same spec together.",
  },
  {
    title: "Production-ready architecture",
    subtitle: "The sentence becomes a system with a check before every action.",
  },
  {
    title: "Python and TypeScript",
    subtitle: "Plain code your own engineers can read and change.",
  },
  {
    title: "Agentic AI systems",
    subtitle: "One agent builds, another checks, a person decides the risky calls.",
  },
  {
    title: "Digital FTE deployment",
    subtitle: "The worker goes live and carries the workload around the clock.",
  },
] as const;

const SLIDE_MS = 800;
const INTERVAL_MS = 4000;

function ease(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

type Api = {
  drawValue: (p: number) => void;
  animateTo: (target: number, ms: number) => void;
  pause: () => void;
  resume: () => void;
  getPos: () => number;
  setHover: (value: boolean) => void;
  setFocus: (value: boolean) => void;
  setActive: (value: boolean) => void;
};

export function FdeRoadmap({ active = true }: { active?: boolean }) {
  const rootRef = useRef<HTMLElement | null>(null);
  const layerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const numRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLSpanElement | null>(null);
  const subRef = useRef<HTMLParagraphElement | null>(null);
  const rangeRef = useRef<HTMLInputElement | null>(null);
  const tickRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const apiRef = useRef<Api | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = { value: mq.matches };
    const state = {
      hover: false,
      focus: false,
      hidden: document.hidden,
      offscreen: false,
      active: true,
    };
    let pos = 0;
    let lastK = -1;
    let raf: number | null = null;
    let timer: number | null = null;

    const clearTimer = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    const draw = (p: number) => {
      pos = p;
      layerRefs.current.forEach((el, i) => {
        if (!el) return;
        const d = Math.abs(p - i);
        const opacity = Math.max(0, 1 - d * 1.7);
        el.style.opacity = String(opacity);
        el.style.visibility = opacity > 0 ? "visible" : "hidden";
        el.style.transform = `translateX(${(i - p) * 44}px) scale(${1 - Math.min(d, 1) * 0.05})`;
        el.style.filter = d > 0.04 ? `blur(${Math.min(d * 5, 7)}px)` : "none";
      });

      const k = Math.min(STAGES.length - 1, Math.round(p));
      if (k !== lastK) {
        lastK = k;
        if (numRef.current) numRef.current.textContent = String(k + 1);
        if (titleRef.current) titleRef.current.textContent = STAGES[k].title;
        if (subRef.current) subRef.current.textContent = STAGES[k].subtitle;
        tickRefs.current.forEach((button, i) => button?.classList.toggle(styles.on, i === k));
      }
      if (rangeRef.current) {
        rangeRef.current.value = String(p);
        rangeRef.current.style.setProperty("--f", `${(p / (STAGES.length - 1)) * 100}%`);
      }
    };

    const animateTo = (target: number, ms: number, done?: () => void) => {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      if (reduce.value || ms === 0) {
        draw(target);
        done?.();
        return;
      }
      const from = pos;
      const t0 = performance.now();
      const step = (t: number) => {
        const x = Math.min(1, (t - t0) / ms);
        draw(from + (target - from) * ease(x));
        if (x < 1) raf = requestAnimationFrame(step);
        else {
          raf = null;
          done?.();
        }
      };
      raf = requestAnimationFrame(step);
    };

    const pauseInternal = () => {
      clearTimer();
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };

    const canAuto = () =>
      state.active && !state.hover && !state.focus && !state.hidden && !state.offscreen && !reduce.value;

    const scheduleNext = (delay: number) => {
      clearTimer();
      if (!canAuto()) return;
      timer = window.setTimeout(() => {
        timer = null;
        const current = Math.round(pos);
        if (current >= STAGES.length - 1) {
          // Wrap forward: slide past the last node, then land on stage 1
          // instead of animating backwards through the earlier stages.
          animateTo(STAGES.length, SLIDE_MS, () => {
            draw(0);
            scheduleNext(INTERVAL_MS - SLIDE_MS);
          });
        } else {
          animateTo(current + 1, SLIDE_MS, () => scheduleNext(INTERVAL_MS - SLIDE_MS));
        }
      }, delay);
    };

    const resume = () => scheduleNext(INTERVAL_MS);

    apiRef.current = {
      drawValue: draw,
      animateTo,
      pause: pauseInternal,
      resume,
      getPos: () => pos,
      setHover: (value) => {
        state.hover = value;
        if (value) pauseInternal();
        else resume();
      },
      setFocus: (value) => {
        state.focus = value;
        if (value) pauseInternal();
        else resume();
      },
      setActive: (value) => {
        state.active = value;
        if (value) resume();
        else pauseInternal();
      },
    };

    draw(0);
    scheduleNext(INTERVAL_MS);

    const onReduceChange = () => {
      reduce.value = mq.matches;
      if (reduce.value) pauseInternal();
      else resume();
    };
    const onVisibility = () => {
      state.hidden = document.hidden;
      if (state.hidden) pauseInternal();
      else resume();
    };

    const root = rootRef.current;
    let observer: IntersectionObserver | null = null;
    if (root && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          state.offscreen = !entries[0]?.isIntersecting;
          if (state.offscreen) pauseInternal();
          else resume();
        },
        { threshold: 0.1 },
      );
      observer.observe(root);
    }

    mq.addEventListener("change", onReduceChange);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      apiRef.current = null;
      clearTimer();
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      observer?.disconnect();
      mq.removeEventListener("change", onReduceChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    apiRef.current?.setActive(active);
  }, [active]);

  return (
    <section
      ref={rootRef}
      className={styles.rm}
      aria-label="FDE roadmap"
      onMouseEnter={() => apiRef.current?.setHover(true)}
      onMouseLeave={() => apiRef.current?.setHover(false)}
      onFocusCapture={(e) => {
        // Pointer clicks focus the slider too; only keyboard focus pauses.
        if ((e.target as HTMLElement | null)?.matches(":focus-visible")) {
          apiRef.current?.setFocus(true);
        }
      }}
      onBlurCapture={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        apiRef.current?.setFocus(false);
      }}
    >
      <div className={styles.hd}>
        <h2>FDE Roadmap</h2>
        <span>Drag to follow one sentence from idea to live worker</span>
      </div>

      <div className={styles.bench} aria-hidden="true">
        <div
          className={styles.L}
          ref={(el) => {
            layerRefs.current[0] = el;
          }}
          style={{ opacity: 1, visibility: "visible" }}
        >
          <p className={styles.big}>
            Handle our <mark>refund tickets</mark>.
          </p>
          <div className={styles.ann}>
            <b>Done when:</b> reopen rate stays under 2%
          </div>
          <div className={`${styles.ann} ${styles.ghost}`}>
            <b>Human gate:</b> refunds above $200
          </div>
        </div>

        <div
          className={styles.L}
          ref={(el) => {
            layerRefs.current[1] = el;
          }}
          style={{ opacity: 0, visibility: "hidden" }}
        >
          <p className={styles.big}>
            Handle our refund tickets
            <span className={styles.cur}>
              &nbsp;<i>You</i>
            </span>
            , but only within 30 days of the order
            <span className={`${styles.cur} ${styles.f}`}>
              &nbsp;<i>FDE</i>
            </span>
          </p>
        </div>

        <div
          className={styles.L}
          ref={(el) => {
            layerRefs.current[2] = el;
          }}
          style={{ opacity: 0, visibility: "hidden" }}
        >
          <div className={styles.flow}>
            <div className={styles.nd}>
              Intake<small>ticket in</small>
            </div>
            <span className={styles.ar}>&rarr;</span>
            <div className={styles.nd}>
              Decide<small>policy</small>
            </div>
            <span className={styles.ar}>&rarr;</span>
            <div className={styles.nd}>
              Act<small>your tools</small>
            </div>
            <span className={styles.ar}>&rarr;</span>
            <div className={`${styles.nd} ${styles.v}`}>
              Verify<small>eval gate</small>
            </div>
          </div>
          <div className={styles.gate}>
            over $200<span className={styles.ar}>&darr;</span>
            <b>Human approval</b>
          </div>
        </div>

        <div
          className={styles.L}
          ref={(el) => {
            layerRefs.current[3] = el;
          }}
          style={{ opacity: 0, visibility: "hidden" }}
        >
          <pre className={styles.code}>
            <span className={styles.m}># agent.py</span>
            {`\n`}
            <span className={styles.k}>def</span> handle(ticket):
            {`\n    plan = agent.plan(ticket, spec)\n    `}
            <span className={styles.k}>if</span> plan.amount &gt; <span className={styles.s}>200</span>:
            {`\n        `}
            <span className={styles.k}>return</span> human.review(plan)
            {`\n    `}
            <span className={styles.k}>return</span> checker.verify(plan)
          </pre>
        </div>

        <div
          className={`${styles.L} ${styles.msgs}`}
          ref={(el) => {
            layerRefs.current[4] = el;
          }}
          style={{ opacity: 0, visibility: "hidden" }}
        >
          <div className={styles.msg}>
            <small>Maker agent</small>Refund $42 for order 1182.
          </div>
          <div className={`${styles.msg} ${styles.r}`}>
            <small>Checker agent</small>Matches policy. Approved.
          </div>
          <div className={`${styles.msg} ${styles.h}`}>
            <small>Human</small>Refund $480 is waiting for you.
          </div>
        </div>

        <div
          className={styles.L}
          ref={(el) => {
            layerRefs.current[5] = el;
          }}
          style={{ opacity: 0, visibility: "hidden" }}
        >
          <div className={styles.hrs}>
            <strong>168</strong>
            <span>hours a week, under human oversight</span>
          </div>
          <div className={styles.feed}>
            <div className={styles.fr}>
              <span>Refund 1182</span>
              <b>Resolved</b>
            </div>
            <div className={styles.fr}>
              <span>Refund 1183</span>
              <b>Resolved</b>
            </div>
            <div className={`${styles.fr} ${styles.w}`}>
              <span>Refund 1184</span>
              <b>Waiting for approval</b>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.cap} aria-live="polite">
        <h3>
          <em ref={numRef}>1</em>
          <span ref={titleRef}>{STAGES[0].title}</span>
        </h3>
        <p ref={subRef}>{STAGES[0].subtitle}</p>
      </div>

      <div className={styles.sc}>
        <input
          ref={rangeRef}
          className={styles.range}
          type="range"
          min={0}
          max={5}
          step={0.01}
          defaultValue={0}
          aria-label="Roadmap stage"
          onPointerDown={() => apiRef.current?.pause()}
          onKeyDown={() => apiRef.current?.pause()}
          onInput={() => {
            const api = apiRef.current;
            const range = rangeRef.current;
            if (!api || !range) return;
            const value = Number.parseFloat(range.value);
            api.drawValue(Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0);
          }}
          onPointerUp={() => {
            const api = apiRef.current;
            if (!api) return;
            api.animateTo(Math.round(api.getPos()), 240);
            api.resume();
          }}
          onKeyUp={() => {
            const api = apiRef.current;
            if (!api) return;
            api.animateTo(Math.round(api.getPos()), 240);
            api.resume();
          }}
        />
        <div className={styles.tk}>
          {STAGES.map((stage, i) => (
            <button
              key={stage.title}
              ref={(el) => {
                tickRefs.current[i] = el;
              }}
              type="button"
              aria-label={stage.title}
              className={i === 0 ? styles.on : undefined}
              onClick={() => {
                const api = apiRef.current;
                if (!api) return;
                api.pause();
                api.animateTo(i, 500);
                api.resume();
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <div className={styles.ends}>
          <span>Your sentence</span>
          <span>Live worker</span>
        </div>
      </div>
    </section>
  );
}
