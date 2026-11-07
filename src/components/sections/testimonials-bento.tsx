"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const testimonials = [
  {
    name: "Sarah Chen",
    role: "CTO, TechFlow Inc",
    content:
      "Deuvix AI Factory's Digital FTEs replaced 3 manual workflows in our ops team. 85% cost savings and the agents run 24/7 without fatigue.",
    highlight: "85% cost savings",
    initials: "SC",
    image: undefined,
  },
  {
    name: "Marcus Rodriguez",
    role: "VP Engineering, DataSphere",
    content:
      "The FDE team deployed our AI agent stack in under a week. Spec-driven approach meant we had production-ready systems from day one.",
    highlight: "Live in under a week",
    initials: "MR",
    image: undefined,
  },
  {
    name: "Aisha Patel",
    role: "Founder, GreenTech AI",
    content:
      "As a startup, we needed scalable AI solutions. Deuvix AI Factory gave us enterprise-level Digital FTEs at a fraction of hiring human engineers.",
    highlight: null,
    initials: "AP",
    image: undefined,
  },
];

interface TestimonialsBentoProps {
  showStars?: boolean;
}

const statRows = [
  { label: "168hrs/wk", value: "uptime" },
  { label: "85%", value: "cost savings" },
];

export function TestimonialsBento({ showStars = true }: TestimonialsBentoProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".bento-card",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const InitialsAvatar = ({
    initials,
    size = 48,
    borderColor = "#4CAF7D",
    borderWidth = "2",
    style,
  }: {
    initials: string;
    size?: number;
    borderColor?: string;
    borderWidth?: string;
    style?: React.CSSProperties;
  }) => (
    <div
      className="flex items-center justify-center overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `${borderWidth}px solid ${borderColor}`,
        background: "#151813",
        color: "#0E100D",
        fontWeight: "700",
        fontSize: Math.round(size * 0.35),
        letterSpacing: "-0.05em",
      }}
    >
      {initials}
    </div>
  );

  const StarRow = ({ className }: { className?: string }) => (
    <div className={`flex gap-1 ${className ?? ""}`} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className="size-3 text-[#4CAF7D] fill-[#4CAF7D]" />
      ))}
    </div>
  );

  return (
    <section
      ref={sectionRef}
      aria-labelledby="testimonials-heading"
      className="relative py-[48px] px-[4vw] bg-background dark:bg-transparent overflow-hidden"
    >
      <div className="relative mx-auto max-w-[1320px] w-full">
        {/* Header */}
        <div className="text-left mb-[16px]">
          <span
            className="inline-block text-[11px] font-semibold tracking-[0.24em] uppercase text-primary border border-primary/30 rounded-full px-2.5 py-[5px] mb-[8px] block"
          >
            TESTIMONIALS
          </span>
          <h1
            id="testimonials-heading"
            className="font-heading text-[clamp(28px,5vw,48px)] leading-[1.05] text-foreground dark:text-white tracking-tight"
            style={{ fontWeight: 200 }}
          >
            Don't take our word for it.{" "}
            <span className="font-[700] text-primary">
              Take theirs.
            </span>
          </h1>
          <p className="text-[14px] leading-normal text-muted-foreground dark:text-white/70 mt-[8px] max-w-[720px]">
            See what our clients say about working with Deuvix AI Factory.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-12 gap-4 md:gap-8 lg:gap-16 items-start">
          {/* Row 1: Card A (span 5) */}
          <div className="col-span-12 lg:col-span-5 bento-card">
            <div className="rounded-[24px] bg-[#F2F2EC] dark:bg-[#151813] border border-[#0E100D] dark:border-[#232820] text-[#0E100D] dark:text-white overflow-hidden relative">
              <div className="relative p-3 lg:p-4">
                <div className="relative mb-[12px]">
                  <div className="relative w-[88px] h-[88px] lg:w-[110px] lg:h-[110px] rounded-full overflow-hidden border-3 border-white shadow-lg mb-0">
                    {testimonials[0].image ? (
                      <Image
                        src={testimonials[0].image}
                        alt={`${testimonials[0].name}, ${testimonials[0].role}`}
                        fill
                        className="object-cover bento-portrait"
                      />
                    ) : (
                      <InitialsAvatar
                        initials={testimonials[0].initials}
                        size={84}
                        borderColor="#4CAF7D"
                        borderWidth="3"
                      />
                    )}
                  </div>
                  <svg
                    className="absolute top-1 right-1 size-8 lg:size-12 text-[#0E100D]/15 dark:text-white/10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    aria-hidden="true"
                  >
                    <path d="M12 2l-1.67 9.76a1 1 0 01-1.79 0L9.67 2 8 12h7l-.67-9.76zM19 2l-1.67 9.76a1 1 0 01-1.79 0L16.67 2 15 12h7l-.67-9.76z" />
                  </svg>
                </div>
                {showStars && <StarRow className="mb-2" />}
                <blockquote className="text-[13px] lg:text-[16px] leading-[1.55] mb-3 font-light">
                  "Deuvix AI Factory's Digital FTEs replaced 3 manual workflows in our ops team. 85% cost savings and the agents run 24/7 without fatigue."
                </blockquote>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">Sarah Chen</p>
                    <p className="text-[10px] opacity-70">CTO, TechFlow Inc</p>
                  </div>
                  <span className="bg-[#0E100D] dark:bg-white text-[#4CAF7D] dark:text-[#4CAF7D] text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full">
                    85% cost savings
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 1: Card B (span 7) */}
          <div className="col-span-12 lg:col-span-7 bento-card">
            <div className="rounded-[24px] bg-[#171D16] border border-[#2B4A3A] text-foreground overflow-hidden relative p-0">
              <div className="p-3 lg:p-4">
                <div className="flex gap-1 mb-2">
                  {showStars && <StarRow className="mb-2" />}
                </div>
                <blockquote className="font-heading font-[300] text-[clamp(15px,2vw,22px)] leading-[1.4] mb-2">
                  "The FDE team deployed our AI agent stack in under a week. Spec-driven approach meant we had production-ready systems from day one."
                </blockquote>
                <span className="bg-[#0E100D] dark:bg-white text-[#4CAF7D] dark:text-[#4CAF7D] text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full inline-block mb-2">
                  Live in under a week
                </span>
              </div>
              {/* Speech bubble tail */}
              <div
                className="absolute bottom-[-10px] left-[12px] w-[16px] h-[16px] bg-[#171D16] border-b border-r border-[#2B4A3A] rotate-[45deg]"
              />
            </div>
            <div className="mt-[16px] flex flex-row gap-3 items-center">
              {testimonials[1].image ? (
                <Image
                  src={testimonials[1].image}
                  alt={testimonials[1].name}
                  width={52}
                  height={52}
                  className="rounded-full border-2 border-[#4CAF7D] object-cover bento-portrait"
                />
              ) : (
                <InitialsAvatar
                  initials={testimonials[1].initials}
                  size={52}
                  borderColor="#4CAF7D"
                  borderWidth="2"
                />
              )}
              <div>
                <p className="text-sm font-bold text-foreground dark:text-white">
                  Marcus Rodriguez
                </p>
                <p className="text-[10px] text-muted-foreground dark:text-white/60">
                  VP Engineering, DataSphere
                </p>
              </div>
            </div>
          </div>

          {/* Row 2: Card C (span 4) */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bento-card">
            <div className="rounded-[24px] bg-[#151813] border border-[#232820] text-foreground p-3 lg:p-4 overflow-hidden relative">
              <div className="flex items-center gap-2 mb-2">
                {testimonials[2].image ? (
                  <Image
                    src={testimonials[2].image}
                    alt={testimonials[2].name}
                    width={52}
                    height={52}
                    className="rounded-full border-2 border-[#4CAF7D] object-cover bento-portrait"
                  />
                ) : (
                  <InitialsAvatar
                    initials={testimonials[2].initials}
                    size={52}
                    borderColor="#4CAF7D"
                    borderWidth="2"
                  />
                )}
                <div>
                  <p className="text-sm font-bold text-foreground dark:text-white">
                    Aisha Patel
                  </p>
                  <p className="text-[10px] text-muted-foreground dark:text-white/60">
                    Founder, GreenTech AI
                  </p>
                </div>
              </div>
              <div className="flex gap-1 mb-2">
                {showStars && <StarRow className="mb-2" />}
              </div>
              <blockquote className="text-[12px] lg:text-[14px] leading-[1.6] text-muted-foreground dark:text-white/70 font-light">
                "As a startup, we needed scalable AI solutions. Deuvix AI Factory gave us enterprise-level Digital FTEs at a fraction of hiring human engineers."
              </blockquote>
            </div>
          </div>

          {/* Row 2: Card D (span 4) */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bento-card">
            <div className="rounded-[24px] bg-[#4FB783] text-[#0E100D] p-3 lg:p-4 overflow-hidden relative">
              <span className="text-[11px] font-semibold uppercase block mb-2">
                BY THE NUMBERS
              </span>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="font-heading font-[200] text-[clamp(32px,6vw,48px)] leading-none">
                  99%+
                </span>
                <span className="text-sm font-medium">Task consistency</span>
              </div>
              <div className="border-b border-[#0E100D]/30 mb-2" />
              <div className="flex gap-3 text-[11px] font-medium">
                {statRows.map((s) => (
                  <div key={s.label}>
                    <span className="block text-[9px] uppercase opacity-70">
                      {s.label}
                    </span>
                    <span className="block font-bold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Card E (span 4) */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bento-card">
            <div className="rounded-[24px] bg-[#151813] border border-[#232820] text-foreground p-3 lg:p-4 overflow-hidden relative">
              <div className="relative mb-3">
                {/* 3 overlapping initials avatars */}
                <InitialsAvatar
                  initials="SC"
                  size={36}
                  borderColor="#151813"
                  borderWidth="2"
                  style={{
                    marginLeft: 0,
                    position: "relative",
                    zIndex: 1,
                  }}
                />
                <InitialsAvatar
                  initials="MR"
                  size={36}
                  borderColor="#151813"
                  borderWidth="2"
                  style={{
                    marginLeft: -9,
                    position: "relative",
                    zIndex: 2,
                  }}
                />
                <InitialsAvatar
                  initials="AP"
                  size={36}
                  borderColor="#151813"
                  borderWidth="2"
                  style={{
                    marginLeft: -9,
                    position: "relative",
                    zIndex: 3,
                  }}
                />
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="font-heading font-[200] text-[clamp(24px,5vw,36px)] leading-none">
                  4x
                </span>
                <span className="text-sm font-medium">More output vs human</span>
              </div>
              <p className="font-heading font-[300] text-[14px] text-muted-foreground dark:text-white/70">
                Trusted by industry leaders.
              </p>
            </div>
          </div>

          {/* Row 3: CTA Band (span 12) */}
          <div className="col-span-12 bento-card">
            <div className="rounded-[24px] bg-[#F2F2EC] dark:bg-[#151813] border border-[#0E100D] dark:border-[#232820] text-[#0E100D] dark:text-white p-4 lg:p-5 flex flex-col lg:flex-row items-center justify-between gap-3">
              <div className="text-center lg:text-left">
                <p className="font-heading font-[300] text-[clamp(15px,2.5vw,18px)] leading-[1.4] mb-0">
                  Your story is next. Build your AI workforce,{" "}
                  <span className="font-bold">unit by unit.</span>
                </p>
              </div>
              <Link href="/book-a-call">
                <Button className="bg-[#0E100D] dark:bg-white text-[#F2F2EC] dark:text-[#0E100D] font-semibold px-4 py-2.5 lg:px-6 lg:py-3 rounded-xl hover:opacity-90 transition-opacity text-[11px] lg:text-sm">
                  Book a Call →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          .bento-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            will-change: transform;
            break-inside: avoid;
          }
          .bento-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(79, 183, 131, 0.12);
          }
          .bento-portrait {
            filter: grayscale(100%);
            transition: filter 0.4s ease;
          }
          .bento-card:hover .bento-portrait,
          .bento-card:focus-within .bento-portrait {
            filter: grayscale(0);
          }
          @media (hover: none) {
            .bento-portrait {
              filter: none !important;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .bento-card {
              transition: none !important;
              transform: none !important;
            }
            .bento-card:hover {
              transform: none !important;
              box-shadow: none !important;
            }
          }
        `}
      </style>
    </section>
  );
}
