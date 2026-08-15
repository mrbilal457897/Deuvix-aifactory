"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Brain,
  Zap,
  Shield,
  BarChart3,
  Cpu,
  Globe,
} from "lucide-react";
import { CharReveal } from "@/components/split-text";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const features = [
  {
    icon: Brain,
    title: "Spec-Driven Development",
    description:
      "Write specifications that both humans and AI understand. Specs become executable blueprints for intelligent systems.",
    color: "#2F6B46",
    glow: "rgba(47,107,70,0.15)",
  },
  {
    icon: Zap,
    title: "Co-Learning Partnership",
    description:
      "You and AI teach each other through iteration. Not just using AI as a tool, but co-creating where both learn together.",
    color: "#3D8A5C",
    glow: "rgba(245,158,11,0.15)",
  },
  {
    icon: Shield,
    title: "Production-Ready Architecture",
    description:
      "Cloud-native deployment with Docker, Kubernetes, and Dapr. Scalable, secure, fault-tolerant systems from day one.",
    color: "#10b981",
    glow: "rgba(16,185,129,0.15)",
  },
  {
    icon: BarChart3,
    title: "Dual Language Mastery",
    description:
      "Python for reasoning and intelligence, TypeScript for interaction and UI. Master the bilingual AI-native stack.",
    color: "#ec4899",
    glow: "rgba(236,72,153,0.15)",
  },
  {
    icon: Cpu,
    title: "Agentic AI Systems",
    description:
      "Build with OpenAI Agents SDK and Google ADK. Create agents that reason, act, and collaborate autonomously.",
    color: "#f97316",
    glow: "rgba(249,115,22,0.15)",
  },
  {
    icon: Globe,
    title: "Digital FTE Deployment",
    description:
      "Deploy AI workers that operate 24/7, 168 hours a week. Scale from one agent to an entire AI workforce instantly.",
    color: "#8b5cf6",
    glow: "rgba(139,92,246,0.15)",
  },
];

export function FeaturesSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !panelsRef.current) return;

    const ctx = gsap.context(() => {
      const panels = panelsRef.current?.querySelectorAll(".feature-panel") || [];
      const total = panels.length;

      gsap.set(panels, { opacity: 0, y: 60 });

      // Unified scroll-driven sequence (mobile + desktop): the sticky wrapper
      // holds the panels in view while scrolling advances each feature panel.
      // Explicit fromTo states keep every step deterministic.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scrollRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.8,
          onUpdate: (self) => {
            const progress = self.progress;
            const index = Math.min(Math.floor(progress * total), total - 1);
            setActive(index);
          },
        },
      });

      for (let i = 0; i < total - 1; i++) {
        tl.fromTo(
          panels[i],
          { opacity: 1, y: 0 },
          { opacity: 0, y: -60, duration: 1, ease: "power2.inOut" },
          i
        );
        tl.fromTo(
          panels[i + 1],
          { opacity: 0, y: 60 },
          { opacity: 1, y: 0, duration: 1, ease: "power2.inOut" },
          i
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="bg-section">
      <div className="text-center pt-24 sm:pt-32 pb-8">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          Features
        </p>
        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
          <CharReveal>
            Everything You Need to <span className="text-gradient">Build AI-Native</span>
          </CharReveal>
        </h2>
      </div>

      <div
        ref={scrollRef}
        className="relative"
        style={{ height: `${features.length * 100}vh` }}
      >
        <div ref={containerRef} className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 pointer-events-none">
          {features.map((f, i) => (
            <div key={f.title} className="flex items-center gap-2">
              <div
                className={`rounded-full transition-all duration-500 ${
                  active === i
                    ? "w-3 h-3 shadow-[0_0_10px_var(--glow)]"
                    : "w-2 h-2 opacity-40"
                }`}
                style={{
                  backgroundColor: f.color,
                  ["--glow" as string]: f.glow,
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
          <span
            className="font-heading text-[12rem] sm:text-[16rem] lg:text-[20rem] font-bold opacity-[0.04] leading-none transition-colors duration-700"
            style={{ color: features[active].color }}
          >
            {String(active + 1).padStart(2, "0")}
          </span>
        </div>

        <div ref={panelsRef} className="relative h-full">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="feature-panel absolute inset-0 flex items-center justify-center"
            >
              <div className="text-center px-4 max-w-2xl mx-auto">
                <div className="relative inline-flex items-center justify-center mb-8">
                  <div
                    className="absolute w-32 h-32 rounded-full blur-2xl transition-colors duration-700"
                    style={{ backgroundColor: feature.glow }}
                  />
                  <div
                    className="relative size-20 sm:size-24 rounded-2xl flex items-center justify-center border transition-all duration-700"
                    style={{
                      backgroundColor: `${feature.color}10`,
                      borderColor: `${feature.color}30`,
                    }}
                  >
                    <feature.icon
                      className="size-10 sm:size-12 transition-colors duration-700"
                      style={{ color: feature.color }}
                    />
                  </div>
                </div>

                <h3
                  className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 transition-colors duration-700"
                  style={{ color: feature.color }}
                >
                  {feature.title}
                </h3>

                <p className="text-muted-foreground text-lg sm:text-xl leading-relaxed max-w-xl mx-auto">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>

      <div className="h-16" />
    </section>
  );
}
