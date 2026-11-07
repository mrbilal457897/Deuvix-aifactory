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
    <section ref={sectionRef} className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background Image */}
      <Image
        src="/images/building.jpg"
        alt=""
        fill
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-background/85 dark:bg-background/80" />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-6 lg:px-8">
        <div className="text-left mb-16">
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">
            How It Works
          </p>
          <h2 className="font-heading text-[48px] font-bold mb-4">
            <CharReveal>
              Simple Steps to <span className="text-gradient">AI Success</span>
            </CharReveal>
          </h2>
          <p className="max-w-2xl text-muted-foreground text-base">
            The spec-driven, human-supervised process for building AI-Native companies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={step.step} className="step-card relative">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(50%+32px)] w-[calc(100%-24px)] h-px bg-border" />
              )}
              <div className="relative p-6 rounded-xl backdrop-blur-md bg-card/60 dark:bg-white/10 border border-border dark:border-white/15 text-center">
                <div className="inline-flex items-center justify-center size-16 rounded-full bg-primary/10 dark:bg-white/10 border border-primary/20 dark:border-white/20 mb-4">
                  <span className="font-heading text-xl font-bold text-primary">
                    {step.step}
                  </span>
                </div>
                <h3 className="font-heading text-base font-semibold mb-2 text-foreground dark:text-white">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground dark:text-white/70 leading-relaxed">
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
