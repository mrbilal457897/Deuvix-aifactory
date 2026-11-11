"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CharReveal } from "@/components/split-text";
import Image from "next/image";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const steps = [
  {
    step: "01",
    title: "Manufacture",
    description:
      "Use AI Coding Agents to build your domain expertise into deployable agents with spec-driven development.",
  },
  {
    step: "02",
    title: "Package",
    description:
      "Bundle into production-ready Digital FTEs with OpenAI or Anthropic Agent SDKs. Complete with SKILL.md logic.",
  },
  {
    step: "03",
    title: "Deploy",
    description:
      "Launch your AI workers to production. They operate 24/7, 168 hours a week with predictable 99%+ consistency.",
  },
  {
    step: "04",
    title: "Monetize",
    description:
      "Sell as managed subscriptions, success fees, or enterprise licenses. Generate recurring revenue while you sleep.",
  },
];

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    gsap.fromTo(
      sectionRef.current.querySelectorAll(".step-card"),
      { x: -40, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        duration: 0.6,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          toggleActions: "play none none none",
        },
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative py-16 md:py-24 overflow-hidden">
      {/* Background image + gradient overlay (keeps text at AA contrast in both themes) */}
      <Image
        src="/images/building.jpg"
        alt=""
        fill
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-surface/95 via-surface/85 to-surface/70" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-left mb-16">
          <p className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">
            How It Works
          </p>
          <h2 className="font-heading h2-lg mb-4">
            <CharReveal>
              Simple Steps to <span className="text-gradient">AI Success</span>
            </CharReveal>
          </h2>
          <p className="max-w-2xl text-muted-foreground text-base">
            How we take a workflow from a rough brief to a reliable agent — one gated step at a time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={step.step} className="step-card relative">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(50%+32px)] w-[calc(100%-24px)] h-px bg-border" />
              )}
              <div className="relative p-6 rounded-xl backdrop-blur-md bg-card/85 border border-border text-center">
                <div className="inline-flex items-center justify-center size-16 rounded-full bg-secondary/10 border border-secondary/30 mb-4">
                  <span className="font-heading text-lg font-bold text-secondary">
                    {step.step}
                  </span>
                </div>
                <h3 className="font-heading h3-sm mb-2 text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
