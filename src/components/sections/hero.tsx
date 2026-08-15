"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import Link from "next/link";
import Image from "next/image";
import { BlurReveal } from "@/components/split-text";
import { useSiteConfig } from "@/hooks/use-site-config";
import { RotatingBadge } from "./rotating-badge";

const leaderDefs = [
  { name: "Bilal", role: "FOUNDER / LEAD", slot: "team-bilal" },
  { name: "Asad", role: "CO-LEAD / OPS", slot: "team-asad" },
];

const ticks = [6, 26, 46, 66, 86];

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const { img } = useSiteConfig();

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".hero-badge", { y: 20, opacity: 0, duration: 0.5 })
        .from(".hero-eyebrow", { y: 20, opacity: 0, duration: 0.5 }, "-=0.35")
        .from(headingRef.current, { y: 40, opacity: 0, duration: 0.8 }, "-=0.4")
        .from(subRef.current, { y: 30, opacity: 0, duration: 0.6 }, "-=0.45")
        .from(ctaRef.current, { y: 20, opacity: 0, duration: 0.5 }, "-=0.4")
        .from(".hero-rail", { opacity: 0, scaleY: 0, duration: 0.6, transformOrigin: "top center" }, "-=0.5")
        .from(".agent-card", { y: 40, opacity: 0, duration: 0.6 }, "-=0.3")
        .from(".team-card", { y: 40, opacity: 0, scale: 0.96, duration: 0.55, stagger: 0.15 }, "-=0.5")
        .from(".trust-badge", { scale: 0.7, opacity: 0, duration: 0.6, ease: "back.out(1.6)" }, "-=0.4");
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center overflow-hidden pt-16 bg-background"
    >
      <div className="relative mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-14 w-full py-16 lg:py-20">
        <div className="flex flex-col lg:flex-row items-stretch">
          {/* Assembly rail */}
          <div className="hidden lg:block hero-rail w-10 mr-7 relative">
            <div className="absolute left-1.5 top-6 bottom-6 w-px bg-gradient-to-b from-primary via-primary/40 to-transparent opacity-55" />
            {ticks.map((top) => (
              <div
                key={top}
                className="absolute left-0 w-3 h-px bg-primary opacity-55"
                style={{ top: `${top}%` }}
              />
            ))}
          </div>

          {/* Left column */}
          <div className="lg:w-[68%] lg:pr-12">
            <div className="hero-badge inline-flex items-center gap-2 border border-border dark:border-primary/25 text-primary text-[11px] sm:text-xs tracking-[0.1em] sm:tracking-[0.15em] px-3.5 py-2 rounded-[4px] mb-7 uppercase font-semibold leading-relaxed">
              <span className="size-1.5 rounded-full bg-primary" />
              AI Factory — Now Accepting Clients
            </div>

            <p className="hero-eyebrow text-[11px] sm:text-[13px] tracking-[0.25em] sm:tracking-[0.4em] text-muted-foreground uppercase mb-[18px] leading-relaxed">
              Manufacture / Deploy / Monetize
            </p>

            <h1
              ref={headingRef}
              className="font-heading text-[38px] sm:text-[48px] lg:text-[56px] xl:text-[64px] font-semibold tracking-tight leading-[1.06] text-foreground mb-[26px]"
            >
              <BlurReveal>
                Build your <span className="text-primary">AI<br />workforce</span>, unit by unit.
              </BlurReveal>
            </h1>

            <p
              ref={subRef}
              className="text-[18px] leading-[1.6] text-muted-foreground max-w-[560px] mb-9"
            >
              We design, manufacture, and deploy Digital FTEs — AI workers built to run
              production lines, not demos. Round-the-clock output, a fraction of the headcount
              cost, engineered for your business from spec to shipment.
            </p>

            <div ref={ctaRef} className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link href="/products">
                <span className="inline-flex items-center justify-center bg-primary text-primary-foreground font-bold text-[15px] px-[26px] py-[14px] rounded-[4px] hover:bg-primary/90 transition-all duration-200 cursor-pointer">
                  Get Started
                </span>
              </Link>
              <Link href="/projects">
                <span className="inline-flex items-center justify-center bg-transparent text-foreground font-semibold text-[15px] px-[26px] py-[14px] rounded-[4px] border border-border dark:border-primary/30 hover:bg-primary/5 hover:border-primary/40 transition-all duration-200 cursor-pointer">
                  See Projects
                </span>
              </Link>
              <div className="trust-badge">
                <RotatingBadge className="size-16 sm:size-20" />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:w-[29%] flex flex-col gap-5 mt-12 lg:mt-0">
            <div className="agent-card bg-card border border-border rounded-[6px] px-4 py-3.5">
              <div className="flex items-center justify-between text-[10px] tracking-[0.1em] text-muted-foreground uppercase mb-2">
                <span>FTE-004 / Sales Ops</span>
                <span className="inline-flex items-center gap-1.5 text-primary font-medium">
                  <span className="size-1.5 rounded-full bg-primary" />
                  Running
                </span>
              </div>
              <h3 className="text-[15px] font-normal text-foreground mb-1.5 tracking-[0.1em]">
                Outbound Qualification Agent
              </h3>
              <p className="text-xs leading-[1.45] text-muted-foreground">
                Screens inbound leads, books qualified calls, and logs every touch to CRM —
                zero downtime since deployment.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {leaderDefs.map((leader) => (
                <div
                  key={leader.name}
                  className="team-card bg-card border border-border rounded-[6px] px-4 pt-4 pb-5 text-center"
                >
                  <div className="relative w-full aspect-[7/6] rounded-[4px] overflow-hidden bg-gradient-to-br from-secondary to-border mb-3.5">
                    <Image
                      src={img(leader.slot)}
                      alt={leader.name}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 1024px) 45vw, 200px"
                    />
                  </div>
                  <p className="text-[15px] font-bold text-foreground mb-1">{leader.name}</p>
                  <p className="text-[11px] tracking-[0.1em] uppercase text-primary font-medium">
                    {leader.role}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
