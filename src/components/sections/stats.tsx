"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const stats = [
  { value: 168, suffix: "hrs/wk", label: "Digital FTE Uptime" },
  { value: 85, suffix: "%", label: "Cost Savings per Task" },
  { value: 99, suffix: "%+", label: "Task Consistency" },
  { value: 4, suffix: "x", label: "More Output vs Human" },
];

function AnimatedCounter({
  value,
  suffix,
}: {
  value: number;
  suffix: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    if (!ref.current) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: ref.current,
        start: "top 95%",
        once: true,
        onEnter: () => {
          if (animated.current) return;
          animated.current = true;
          gsap.to(
            { val: 0 },
            {
              val: value,
              duration: 2,
              ease: "power2.out",
              onUpdate: function () {
                const v = this.targets()[0].val;
                setCount(
                  Number.isInteger(value)
                    ? Math.round(v)
                    : parseFloat(v.toFixed(1))
                );
              },
            }
          );
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [value]);

  return (
    <div ref={ref} className="font-heading text-3xl sm:text-4xl font-bold text-primary whitespace-nowrap">
      {count}
      {suffix}
    </div>
  );
}

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
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
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
