"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Intro hero for /projects — a calm lead-in above the published work blocks.
 * Transparent robot cutout sits directly on the page background in both themes.
 */
export function ProjectsIntro() {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      /* slow vertical float — ±8px */
      gsap.to(".projs-robot-float", {
        y: "8px",
        duration: 3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });

      /* gentle scroll parallax on the cutout */
      gsap.fromTo(
        ".projs-robot-parallax",
        { yPercent: 10 },
        {
          yPercent: -10,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        },
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      aria-labelledby="projects-intro-title"
      className="relative flex items-center overflow-clip bg-background"
      style={{ minHeight: "86vh" }}
    >
      {/* soft radial glow behind the cutout — token-based, theme-aware */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-10%] top-1/2 -translate-y-1/2 size-[34rem] rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--secondary) 18%, transparent) 0%, transparent 68%)",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16 lg:px-8 lg:py-24">
        {/* left — copy */}
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-secondary">
            Selected work
          </p>
          <h1
            id="projects-intro-title"
            className="mt-5 font-heading font-bold tracking-[-0.03em] text-foreground"
            style={{ fontSize: "clamp(2.6rem, 6vw, 4.75rem)", lineHeight: 1.02 }}
          >
            Built to run.
            <br />
            Proven in production.
          </h1>
          <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
            Every project below is a live system: AI workers, platforms and agents our clients use
            today. See what we shipped and how it performs.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/book-a-call"
              className={cn(buttonVariants({ variant: "default", size: "lg" }), "font-semibold")}
            >
              Book a Call
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a
              href="#projects-list"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "font-semibold")}
            >
              Browse the work
            </a>
          </div>
        </div>

        {/* right — transparent robot cutout */}
        <div className="relative mx-auto flex w-full max-w-[26rem] justify-center sm:max-w-[30rem] lg:max-w-none">
          {/* soft contact shadow / grounding glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[-4%] left-1/2 h-16 w-3/4 -translate-x-1/2 blur-2xl"
            style={{ background: "radial-gradient(ellipse, var(--secondary), transparent 70%)", opacity: 0.22 }}
          />
          <div
            className="projs-robot-float projs-robot-parallax relative"
            style={{ willChange: "transform" }}
          >
            <Image
              src="/images/deuvix-robot.png"
              alt="Deuvix AI Factory humanoid bust, facing upward — the mark of production-ready AI workers"
              width={896}
              height={1175}
              priority
              sizes="(max-width: 1024px) 80vw, 34vw"
              className="h-auto w-full select-none object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
