"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Badge } from "@/components/ui/badge";
import { Target, Heart, Lightbulb, Users, Mail } from "lucide-react";
import Image from "next/image";
import { CharReveal } from "@/components/split-text";
import GridRevealImage from "@/components/grid-reveal-image";
import { useSiteConfig } from "@/hooks/use-site-config";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const values = [
  { icon: Target, title: "Mission-Driven", description: "AI should empower everyone, not just the technically privileged." },
  { icon: Heart, title: "People First", description: "Technology serves people. Every solution starts with human needs." },
  { icon: Lightbulb, title: "Innovation", description: "We push boundaries daily, exploring what's possible with AI." },
  { icon: Users, title: "Collaboration", description: "The best solutions come from diverse perspectives." },
];

const timeline = [
  { year: "2021", title: "Founded", description: "DEUX AI Factory started as an AI research project." },
  { year: "2022", title: "First Agent", description: "Deployed our first Digital FTE, serving early adopters." },
  { year: "2023", title: "FDE Launch", description: "Launched Forward Deployed Engineer services for enterprise clients." },
  { year: "2024", title: "AI E-books", description: "Published the AI Agent Factory guide, reaching 10,000+ readers." },
  { year: "2025", title: "Platform Growth", description: "Complete platform with FTE deployment, FDE consulting, and web apps." },
  { year: "2026", title: "Next Chapter", description: "Pioneering Digital FTE monetization at scale." },
];

const leaders = [
  {
    name: "Bilal Ali",
    role: "Co-founder & CEO",
    description: "Turns AI research into revenue — architect of DEUX AI Factory's Manufacture-Deploy-Monetize model and the strategy behind every Digital FTE that ships to production.",
    slot: "team-bilal",
  },
  {
    name: "Asadullah",
    role: "Co-founder & CTO",
    description: "Architect of Loop Engineering — builds the spec-driven, human-gated systems that let AI agents run production workloads 24/7 without losing human oversight.",
    slot: "team-asad",
  },
];

export default function AboutPage() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const { img } = useSiteConfig();

  useEffect(() => {
    if (!timelineRef.current) return;

    gsap.fromTo(
      timelineRef.current.querySelectorAll(".timeline-item"),
      { x: -30, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: timelineRef.current,
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
    <div className="pt-24">
      <section className="py-16 text-center px-6 bg-hero-pattern relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">About Us</Badge>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">
          <CharReveal>
            Building the <span className="text-gradient">DEUX AI Factory</span>
          </CharReveal>
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground text-lg">
          We help businesses manufacture, deploy, and monetize Digital FTEs — the AI workers that run the next generation of enterprises.
        </p>
      </section>

      <section className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-6">
                <CharReveal>Our <span className="text-gradient">Story</span></CharReveal>
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>DEUX AI Factory was born from a simple observation: the most powerful AI technologies were locked behind walls of complexity.</p>
                <p>We set out to change that. Our platform helps businesses manufacture, deploy, and monetize Digital FTEs — AI workers that operate 24/7 at a fraction of human cost.</p>
                <p>From spec-driven development to production-ready deployment, we build the AI workforce your company needs to thrive in the agent era.</p>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-3 rounded-2xl border-2 border-primary/10" />
              <GridRevealImage
                src={img("about-main")}
                alt="DEUX AI Factory story"
                className="relative aspect-[4/3] rounded-2xl border border-border overflow-hidden"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute -bottom-4 -right-4 size-28 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm overflow-hidden">
                <Image
                  src={img("about-secondary")}
                  alt="DEUX AI Factory award"
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-section">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Our <span className="text-gradient">Values</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <div key={value.title} className="p-6 rounded-xl card-solid text-center">
                <div className="inline-flex items-center justify-center size-11 rounded-xl bg-primary/5 border border-primary/10 mb-4">
                  <value.icon className="size-5 text-primary" />
                </div>
                <h3 className="font-heading font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Leadership <span className="text-gradient">Team</span>
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground text-lg">
              The minds behind DEUX AI Factory.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start justify-center gap-12 max-w-3xl mx-auto">
            {/* Bilal Card with Social Icons */}
            <div className="relative flex items-start gap-4">
              {/* Floating Social Icons - Left Side */}
              <div className="flex flex-col items-center gap-3 pt-4">
                <a
                  href="https://www.linkedin.com/in/bilal-alee-6769462ba/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="size-10 rounded-full bg-[#0A66C2] flex items-center justify-center text-white hover:scale-110 transition-transform duration-200 shadow-lg"
                >
                  <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a
                  href="https://www.instagram.com/mr_sheikh123/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="size-10 rounded-full bg-gradient-to-tr from-[#F56040] via-[#C13584] to-[#833AB4] flex items-center justify-center text-white hover:scale-110 transition-transform duration-200 shadow-lg"
                >
                  <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a
                  href="https://github.com/mrbilal457897"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="size-10 rounded-full bg-[#181717] flex items-center justify-center text-white hover:scale-110 transition-transform duration-200 shadow-lg"
                >
                  <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <a
                  href="mailto:sobber.id@gmail.com"
                  className="size-10 rounded-full bg-[#EA4335] flex items-center justify-center text-white hover:scale-110 transition-transform duration-200 shadow-lg"
                >
                  <Mail className="size-5" />
                </a>

                <div className="w-px h-4 bg-border" />

                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground leading-tight">sobber.id@gmail.com</p>
                </div>
              </div>

              {/* Bilal Profile Card */}
              <div className="p-6 rounded-xl card-solid text-center group">
                <div className="relative size-28 rounded-full mx-auto mb-4 overflow-hidden bg-surface border-2 border-border">
                  <Image
                    src={img(leaders[0].slot)}
                    alt={leaders[0].name}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                </div>
                <h3 className="font-heading font-medium text-lg">{leaders[0].name}</h3>
                <p className="text-sm text-primary mb-2">{leaders[0].role}</p>
                <p className="text-xs text-muted-foreground">{leaders[0].description}</p>
              </div>
            </div>

            {/* Asad Card */}
            <div className="flex items-start gap-4">
              {/* Asad Profile Card */}
              <div className="p-6 rounded-xl card-solid text-center group">
                <div className="relative size-28 rounded-full mx-auto mb-4 overflow-hidden bg-surface border-2 border-border">
                  <Image
                    src={img(leaders[1].slot)}
                    alt={leaders[1].name}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                </div>
                <h3 className="font-heading font-medium text-lg">{leaders[1].name}</h3>
                <p className="text-sm text-primary mb-2">{leaders[1].role}</p>
                <p className="text-xs text-muted-foreground">{leaders[1].description}</p>
              </div>

              {/* Floating Social Icons - Right Side */}
              <div className="flex flex-col items-center gap-3 pt-4">
                <a
                  href="https://www.linkedin.com/company/145184855/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="size-10 rounded-full bg-[#0A66C2] flex items-center justify-center text-white hover:scale-110 transition-transform duration-200 shadow-lg"
                >
                  <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="size-10 rounded-full bg-gradient-to-tr from-[#F56040] via-[#C13584] to-[#833AB4] flex items-center justify-center text-white hover:scale-110 transition-transform duration-200 shadow-lg"
                >
                  <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="size-10 rounded-full bg-[#181717] flex items-center justify-center text-white hover:scale-110 transition-transform duration-200 shadow-lg"
                >
                  <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <a
                  href="mailto:sharshab007@gmail.com"
                  className="size-10 rounded-full bg-[#EA4335] flex items-center justify-center text-white hover:scale-110 transition-transform duration-200 shadow-lg"
                >
                  <Mail className="size-5" />
                </a>

                <div className="w-px h-4 bg-border" />

                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground leading-tight">sharshab007@gmail.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-section overflow-hidden">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Our <span className="text-gradient">Journey</span>
            </h2>
          </div>
          <div ref={timelineRef} className="relative">
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-border" />
            {timeline.map((item, i) => (
              <div
                key={item.year}
                className={`timeline-item relative flex items-start gap-8 mb-10 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
              >
                <div className="hidden md:block md:w-1/2" />
                <div className="absolute left-6 md:left-1/2 -translate-x-1/2 size-3 rounded-full bg-primary border-2 border-background z-10" />
                <div className="ml-14 md:ml-0 md:w-1/2 md:px-8">
                  <div className="text-sm font-bold text-primary mb-1">{item.year}</div>
                  <h3 className="font-heading text-base font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
