"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Users, Clock, Zap, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookCallButton } from "@/components/book-call-button";
import Link from "next/link";
import { CountUp } from "@/components/animations/count-up";
import { company } from "@config/company";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const stats = [
  { icon: Users, value: 168, suffix: "hrs/wk", label: "FTE Uptime" },
  { icon: Clock, value: 85, suffix: "%", label: "Cost Savings" },
  { icon: Zap, value: 4, suffix: "x", label: "More Output" },
  { icon: Headphones, value: 24, suffix: "/7", label: "Support" },
];

export function CTASection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".cta-stat",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".cta-content",
        { x: 40, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
            toggleActions: "play none none none",
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      {/* Background - covers stats + video + headline content */}
      <div className="absolute inset-0 bg-primary/10 dark:bg-[#aab5af] h-[calc(100%-6rem)] sm:h-[calc(100%-8rem)]" />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-6 lg:px-8 pt-24 sm:pt-32">
        {/* Stats Row */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-0">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`cta-stat text-center py-8 px-4 ${
                i < stats.length - 1 ? "md:border-r border-primary/20 dark:border-white/20" : ""
              } ${i === 0 ? "border-b md:border-b-0 border-primary/20 dark:border-white/20 md:border-r" : ""} ${i === 1 ? "border-b md:border-b-0 border-primary/20 dark:border-white/20 md:border-r" : ""} ${i === 2 ? "border-b md:border-b-0 border-primary/20 dark:border-white/20 md:border-r" : ""}`}
            >
              <stat.icon className="size-6 sm:size-8 text-primary/70 dark:text-white/80 mx-auto mb-3" />
              <div className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary dark:text-white mb-1">
                <CountUp value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm text-muted-foreground dark:text-white/70 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Video + Headline Row */}
        <div className="relative z-10 mt-4 sm:mt-6 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Video - Left side */}
          <div className="cta-stat flex-1 w-full">
            <div className="relative w-full max-w-2xl aspect-video border-4 border-border rounded-2xl overflow-hidden">
              <video
                className="h-full w-full object-cover"
                src="/uploads/deux.mp4"
                controls
                preload="metadata"
                poster="/uploads/deux-poster.jpg"
              />
            </div>
          </div>

          {/* Headline + CTA - Right side */}
          <div className="cta-content lg:w-[400px] text-center lg:text-left lg:-mt-20">
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground dark:text-white mb-4 leading-tight">
              Start Your <span className="text-foreground/80 dark:text-white/80">AI Journey</span>
            </h2>
            <p className="text-muted-foreground dark:text-white/70 text-base sm:text-lg mb-8">
              Join businesses building AI-Native companies with DEUX AI Factory.
              Manufacture, deploy, and monetize Digital FTEs.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <BookCallButton
                icon={null}
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 py-6 text-base rounded-xl shadow-lg shadow-black/10"
              >
                Book a Consultation
                <ArrowRight className="size-5 ml-2" />
              </BookCallButton>
              <Link href="/products">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-border dark:border-white/30 text-foreground dark:text-white hover:bg-muted dark:hover:bg-white/10 font-semibold px-8 py-6 text-base rounded-xl"
                >
                  View Services
                </Button>
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted-foreground dark:text-white/60">
              Prefer email? Reach us at{" "}
              <a
                href={`mailto:${company.businessEmail}`}
                className="font-medium text-primary dark:text-white hover:underline"
              >
                {company.businessEmail}
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-24 sm:h-32" />
    </section>
  );
}
