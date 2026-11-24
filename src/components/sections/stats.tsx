"use client";

import { useEffect, useState } from "react";
import { CountUp } from "@/components/animations/count-up";

const stats = [
  { value: 168, suffix: "hrs/wk", label: "Availability — 24/7" },
  { value: 85, suffix: "%", label: "Up to 85% cost savings" },
  { value: 99, suffix: "%+", label: "First-pass consistency, supervised" },
  { value: 4, suffix: "x", label: "Hours available vs full-time" },
];

export function StatsSection() {
  // The marquee copies are decorative: add them only after hydration so the
  // server HTML contains the four stats once, not three times.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const renderStat = (stat: (typeof stats)[number], decorative: boolean, key: string) => (
    <div
      key={key}
      className="flex items-center gap-3 shrink-0"
      {...(decorative ? { "aria-hidden": true, inert: true } : {})}
    >
      <CountUp
        value={stat.value}
        suffix={stat.suffix}
        className="font-heading text-2xl md:text-[2rem] font-bold text-primary whitespace-nowrap"
      />
      <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">{stat.label}</span>
      <div className="w-px h-8 bg-border ml-6" />
    </div>
  );

  return (
    <section className="relative py-8 overflow-hidden bg-background" aria-label="Key metrics">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(100,116,139,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(100,116,139,0.15) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            animation: "gridMove 20s linear infinite",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
      </div>

      <div className="relative z-10">
        <div className={`marquee-track flex items-center gap-12 sm:gap-16 ${ready ? "is-ready" : ""}`}>
          {stats.map((stat) => renderStat(stat, false, stat.label))}
          {ready && [...stats, ...stats].map((stat, i) => renderStat(stat, true, `${stat.label}-copy-${i}`))}
        </div>
      </div>

      <style jsx>{`
        @keyframes gridMove {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(60px, 60px);
          }
        }

        .marquee-track {
          width: max-content;
          will-change: transform;
        }

        .marquee-track.is-ready {
          animation: marqueeScroll 25s linear infinite;
        }

        .marquee-track.is-ready:hover {
          animation-play-state: paused;
        }

        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation: none;
            flex-wrap: wrap;
            justify-content: center;
            width: auto;
          }
        }

        @keyframes marqueeScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
      `}</style>
    </section>
  );
}
