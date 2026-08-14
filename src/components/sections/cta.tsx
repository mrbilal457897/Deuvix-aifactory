"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Users, Clock, Zap, Headphones, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useSiteConfig } from "@/hooks/use-site-config";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const stats = [
  { icon: Users, value: 168, suffix: "hrs/wk", label: "FTE Uptime" },
  { icon: Clock, value: 85, suffix: "%", label: "Cost Savings" },
  { icon: Zap, value: 4, suffix: "x", label: "More Output" },
  { icon: Headphones, value: 24, suffix: "/7", label: "Support" },
];

function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!ref.current) return;

    const trigger = ScrollTrigger.create({
      trigger: ref.current,
      start: "top 85%",
      onEnter: () => {
        if (hasAnimated.current) return;
        hasAnimated.current = true;

        const isDecimal = value % 1 !== 0;
        const duration = 1500;
        const startTime = performance.now();

        const animate = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = eased * value;
          setCount(isDecimal ? parseFloat(current.toFixed(1)) : Math.floor(current));
          if (progress < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
      },
    });

    return () => trigger.kill();
  }, [value]);

  return (
    <span ref={ref}>
      {count}{suffix}
    </span>
  );
}

export function CTASection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { img } = useSiteConfig();

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
    <section ref={sectionRef} className="relative">
      {/* Background - covers stats + top 2/3 of video */}
      <div className="absolute inset-0 bg-primary/10 dark:bg-[#aab5af]" style={{ height: "75%" }} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32">
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
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
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
            <div className="relative h-64 sm:h-80 md:h-96 border-4 border-border rounded-2xl overflow-hidden">
              <Image
                src={img("cta-bg")}
                alt="Video background"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/40" />
              
              {/* Play Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Link
                  href="/contact"
                  aria-label="Book a free consultation"
                  className="group relative size-20 sm:size-24 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all duration-300 hover:scale-110"
                >
                  {/* Pulse ring */}
                  <div className="absolute inset-0 rounded-full bg-white/10 animate-ping" />
                  <Play className="size-8 sm:size-10 text-white ml-1" fill="currentColor" />
                </Link>
              </div>

              {/* Label */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <p className="text-white/80 text-sm font-medium">Book a Consultation</p>
              </div>
            </div>
          </div>

          {/* Headline + CTA - Right side */}
          <div className="cta-content lg:w-[400px] text-center lg:text-left -mt-16 lg:-mt-20">
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground dark:text-white mb-4 leading-tight">
              Start Your <span className="text-foreground/80 dark:text-white/80">AI Journey</span>
            </h2>
            <p className="text-muted-foreground dark:text-white/70 text-base sm:text-lg mb-8">
              Join businesses building AI-Native companies with Deux.
              Manufacture, deploy, and monetize Digital FTEs.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Link href="/contact">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 py-6 text-base rounded-xl shadow-lg shadow-black/10"
                >
                  Book a Consultation
                  <ArrowRight className="size-5 ml-2" />
                </Button>
              </Link>
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
          </div>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-24 sm:h-32" />
    </section>
  );
}
