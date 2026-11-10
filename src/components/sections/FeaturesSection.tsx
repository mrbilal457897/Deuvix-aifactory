"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const FEATURES = [
  {
    title: "Spec-Driven Development",
    phrase: "spec-driven development",
    description:
      "Write specifications that both humans and AI understand. Specs become executable blueprints for intelligent systems.",
  },
  {
    title: "Co-Learning Partnership",
    phrase: "co-learning",
    description:
      "You and AI teach each other through iteration. Not just using AI as a tool, but co-creating where both learn together.",
  },
  {
    title: "Production-Ready Architecture",
    phrase: "production-ready architecture",
    description:
      "Cloud-native deployment with Docker, Kubernetes, and Dapr. Scalable, secure, fault-tolerant systems from day one.",
  },
  {
    title: "Dual Language Mastery",
    phrase: "Python and TypeScript",
    description:
      "Python for reasoning and intelligence, TypeScript for interaction and UI. Master the bilingual AI-native stack.",
  },
  {
    title: "Agentic AI Systems",
    phrase: "agentic AI systems",
    description:
      "Build with OpenAI Agents SDK and Google ADK. Create agents that reason, act, and collaborate autonomously.",
  },
  {
    title: "Digital FTE Deployment",
    phrase: "Digital FTE deployment",
    description:
      "Deploy AI workers that operate 24/7, 168 hours a week. Scale from one agent to an entire AI workforce instantly.",
  },
] as const;

const SENTENCE_PARTS: Array<string | number> = [
  "We begin with ",
  0,
  ", grow through ",
  1,
  ", ship on ",
  2,
  ", write in ",
  3,
  ", build ",
  4,
  ", and finish with ",
  5,
  ".",
];

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Six drawings, copied 1:1 from the reference export (viewBox 0 0 240 240). */
function DrawingSpec() {
  return (
    <>
      <rect className="d" pathLength={1} x="50" y="30" width="100" height="140" rx="3" />
      <path className="d" pathLength={1} d="M70 70H130M70 90H130M70 110H110" />
      <path className="d" pathLength={1} d="M156 100H170" />
      <path className="d a" pathLength={1} d="M175 105l22-11 22 11v40l-22 11-22-11zM175 105l22 11 22-11M197 116v40" />
    </>
  );
}

function DrawingCoLearning() {
  return (
    <>
      <circle className="d" pathLength={1} cx="90" cy="120" r="55" />
      <circle className="d" pathLength={1} cx="150" cy="120" r="55" />
      <path className="lens f" d="M120 75a55 55 0 0 1 0 90a55 55 0 0 1 0-90z" opacity="0.25" />
      <text className="f" x="62" y="125" fontSize="13">You</text>
      <text className="f" x="178" y="125" fontSize="13">AI</text>
    </>
  );
}

function DrawingProduction() {
  return (
    <>
      <rect className="d" pathLength={1} x="40" y="160" width="160" height="30" rx="2" />
      <rect className="d" pathLength={1} x="40" y="115" width="160" height="30" rx="2" />
      <rect className="d a" pathLength={1} x="40" y="70" width="160" height="30" rx="2" />
      <circle className="f" cx="58" cy="175" r="3" />
      <circle className="f" cx="58" cy="130" r="3" />
      <circle className="f" cx="58" cy="85" r="3" />
      <path className="f" d="M120 30V66" strokeDasharray="3 5" />
    </>
  );
}

function DrawingDualLanguage() {
  return (
    <>
      <rect className="d" pathLength={1} x="30" y="80" width="70" height="80" rx="3" />
      <rect className="d" pathLength={1} x="140" y="80" width="70" height="80" rx="3" />
      <path className="d" pathLength={1} d="M100 130H140" />
      <path className="d a" pathLength={1} d="M100 100Q120 62 140 100" />
      <text className="f" x="65" y="128" fontSize="20">Py</text>
      <text className="f" x="175" y="128" fontSize="20">TS</text>
    </>
  );
}

function DrawingAgentic() {
  return (
    <>
      <path className="d" pathLength={1} d="M120 120L50 50M120 120L190 50M120 120L50 190M120 120L190 190" />
      <circle className="d a" pathLength={1} cx="120" cy="120" r="14" />
      <circle className="d" pathLength={1} cx="50" cy="50" r="9" />
      <circle className="d" pathLength={1} cx="190" cy="50" r="9" />
      <circle className="d" pathLength={1} cx="50" cy="190" r="9" />
      <circle className="d" pathLength={1} cx="190" cy="190" r="9" />
      <circle className="f" cx="120" cy="120" r="100" strokeDasharray="2 6" />
    </>
  );
}

function DrawingDigitalFte() {
  return (
    <>
      <circle className="d a" pathLength={1} cx="120" cy="120" r="92" />
      <circle className="f" cx="120" cy="120" r="76" strokeWidth="8" strokeDasharray="1 1.8" opacity="0.5" />
      <text className="f" x="120" y="130" fontSize="42">168</text>
      <text className="f" x="120" y="154" fontSize="12">hours a week</text>
    </>
  );
}

const DRAWINGS = [
  DrawingSpec,
  DrawingCoLearning,
  DrawingProduction,
  DrawingDualLanguage,
  DrawingAgentic,
  DrawingDigitalFte,
];

export function FeaturesSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const inViewRef = useRef(true);
  const intervalRef = useRef<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const select = useCallback((index: number) => {
    setActive(index);
  }, []);

  /* Auto-advance every 5.5s, paused on hover/focus or off-screen. */
  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (!inView || paused) return;
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % FEATURES.length);
    }, 5500);
    intervalRef.current = id;
    return () => {
      window.clearInterval(id);
      intervalRef.current = null;
    };
  }, [inView, paused, active]);

  /* IntersectionObserver — pause auto-advance off-screen. */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        inViewRef.current = visible;
        setInView(visible);
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const sentenceNodes: ReactNode[] = [];
  for (const part of SENTENCE_PARTS) {
    if (typeof part === "number") {
      const feature = FEATURES[part];
      sentenceNodes.push(
        <button
          key={feature.phrase}
          type="button"
          className="features-phrase"
          aria-pressed={active === part}
          onClick={() => select(part)}
          onMouseEnter={() => select(part)}
          onFocus={() => select(part)}
        >
          {feature.phrase}
        </button>,
      );
    } else {
      sentenceNodes.push(<span key={`text-${part}`}>{part}</span>);
    }
  }

  const feature = FEATURES[active];

  return (
    <section
      ref={sectionRef}
      className="features-section"
      aria-label="Everything you need to build AI-native"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div className="features-inner">
        <h2 className="features-heading">Everything you need to build AI-native</h2>
        <p className="features-sentence">{sentenceNodes}</p>

        <div className="features-panel" aria-live="polite">
          <div className="features-drawing">
            {/* Remount on activation re-runs the stroke-dash draw animation. */}
            <svg
              key={active}
              viewBox="0 0 240 240"
              role="img"
              aria-hidden="true"
            >
              {DRAWINGS.map((D, index) => (
                <g key={index} className={index === active ? "on" : undefined}>
                  <D />
                </g>
              ))}
            </svg>
          </div>
          <div className="features-copy" key={`copy-${active}`}>
            <h3 className="features-title">{feature.title}</h3>
            <p className="features-description features-description-swap">{feature.description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
