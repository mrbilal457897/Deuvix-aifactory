"use client";

import { Star } from "lucide-react";
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BookCallButton } from "@/components/book-call-button";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const testimonials = [
  {
    name: "Sarah Chen",
    role: "CTO, TechFlow Inc",
    quote:
      "Deuvix AI Factory's Digital FTEs replaced 3 manual workflows in our ops team. 85% cost savings and the agents run 24/7 without fatigue.",
    highlight: "85% cost savings",
    initials: "SC",
  },
  {
    name: "Marcus Rodriguez",
    role: "VP Engineering, DataSphere",
    quote:
      "The FDE team deployed our AI agent stack in under a week. Spec-driven approach meant we had production-ready systems from day one.",
    highlight: "Live in under a week",
    initials: "MR",
  },
  {
    name: "Aisha Patel",
    role: "Founder, GreenTech AI",
    quote:
      "As a startup, we needed scalable AI solutions. Deuvix AI Factory gave us enterprise-level Digital FTEs at a fraction of hiring human engineers.",
    highlight: "Enterprise-level at a fraction of the cost",
    initials: "AP",
  },
] as const;

export function TestimonialsBento({ showStars = true }: { showStars?: boolean }) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".bento-card",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 88%",
            once: true,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="testimonials-heading"
      className="relative py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-surface overflow-hidden"
    >
      <div className="relative mx-auto max-w-7xl w-full">
        {/* Header */}
        <div className="mb-10 md:mb-16">
          <span className="block text-xs font-semibold tracking-[0.24em] uppercase text-secondary mb-4">
            Testimonials
          </span>
          <h2
            id="testimonials-heading"
            className="font-heading h2-lg text-foreground"
          >
            Don&rsquo;t take our word for it.{" "}
            <span className="text-gradient">Take theirs.</span>
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground mt-4 max-w-2xl">
            See what our clients say about working with Deuvix AI Factory.
          </p>
        </div>

        {/* Unified testimonial cards — one identical layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="bento-card flex h-full flex-col space-y-3 rounded-xl border border-border bg-card p-6"
            >
              <figcaption className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-12 shrink-0 items-center justify-center rounded-full border border-secondary/40 bg-secondary/10 text-base font-bold text-secondary"
                >
                  {t.initials}
                </span>
                <span>
                  <span className="block text-base font-semibold leading-tight text-foreground">
                    {t.name}
                  </span>
                  <span className="mt-0.5 block text-sm leading-tight text-muted-foreground">
                    {t.role}
                  </span>
                </span>
              </figcaption>

              {showStars ? (
                <div className="flex gap-1" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="size-4 fill-secondary text-secondary" />
                  ))}
                </div>
              ) : null}

              <blockquote className="text-base leading-relaxed text-foreground">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {t.highlight ? (
                <span className="mt-auto inline-flex w-max rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
                  {t.highlight}
                </span>
              ) : null}
            </figure>
          ))}
        </div>

        {/* Closing CTA band */}
        <div className="bento-card mt-6 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg font-heading font-semibold leading-snug text-foreground">
            Your story is next. Build your AI workforce,{" "}
            <span className="text-gradient">unit by unit.</span>
          </p>
          <BookCallButton
            icon={null}
            size="md"
            className="shrink-0 font-semibold text-sm"
          >
            Book a Call
          </BookCallButton>
        </div>
      </div>

    </section>
  );
}
