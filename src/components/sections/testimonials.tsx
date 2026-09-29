"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Star, Quote } from "lucide-react";
import { CharReveal } from "@/components/split-text";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const testimonials = [
  {
    name: "Sarah Chen",
    role: "CTO, TechFlow Inc",
    content:
      "DEUX AI Factory's Digital FTEs replaced 3 manual workflows in our ops team. 85% cost savings and the agents run 24/7 without fatigue.",
    rating: 5,
  },
  {
    name: "Marcus Rodriguez",
    role: "VP Engineering, DataSphere",
    content:
      "The FDE team deployed our AI agent stack in under a week. Spec-driven approach meant we had production-ready systems from day one.",
    rating: 5,
  },
  {
    name: "Aisha Patel",
    role: "Founder, GreenTech AI",
    content:
      "As a startup, we needed scalable AI solutions. DEUX AI Factory gave us enterprise-level Digital FTEs at a fraction of hiring human engineers.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    gsap.fromTo(
      sectionRef.current.querySelectorAll(".testimonial-card"),
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <section ref={sectionRef} className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Testimonials
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            <CharReveal>Trusted by{" "}
              <span className="text-gradient">Industry Leaders</span></CharReveal>
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground text-lg">
            See what our clients say about working with DEUX AI Factory.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="testimonial-card p-6 rounded-xl card-solid relative"
            >
              <Quote className="absolute top-4 right-4 size-8 text-primary/10" />
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="size-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                &quot;{testimonial.content}&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  {testimonial.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="font-semibold text-sm">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
