"use client";

import { CountUp } from "@/components/animations/count-up";

const stats = [
  { value: 168, suffix: "hrs/wk", label: "Digital FTE Uptime" },
  { value: 85, suffix: "%", label: "Cost Savings per Task" },
  { value: 99, suffix: "%+", label: "Task Consistency" },
  { value: 4, suffix: "x", label: "More Output vs Human" },
];

export function StatsSection() {
  return (
    <section className="relative py-8 overflow-hidden bg-background">
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
        <div className="marquee-track flex items-center gap-12 sm:gap-16">
          {[...stats, ...stats, ...stats].map((stat, i) => (
            <div key={`${stat.label}-${i}`} className="flex items-center gap-3 shrink-0">
              <CountUp
                value={stat.value}
                suffix={stat.suffix}
                className="font-heading text-3xl sm:text-4xl font-bold text-primary whitespace-nowrap"
              />
              <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
                {stat.label}
              </span>
              <div className="w-px h-8 bg-border ml-6" />
            </div>
          ))}
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
          animation: marqueeScroll 25s linear infinite;
          width: max-content;
          will-change: transform;
        }

        .marquee-track:hover {
          animation-play-state: paused;
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
