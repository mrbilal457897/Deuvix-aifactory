"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { CharReveal } from "@/components/split-text";
import { useSiteConfig } from "@/hooks/use-site-config";
import { company } from "@config/company";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const teamMembers = [
  {
    name: "Bilal Ali",
    role: "Co-founder & CEO",
    slot: "team-bilal",
    socials: {
      linkedin: "#",
      github: "#",
      email: `mailto:${company.businessEmail}`,
    },
  },
  {
    name: "Asadullah",
    role: "Co-founder & CTO",
    slot: "team-asad",
    socials: {
      linkedin: "#",
      github: "#",
      email: `mailto:${company.businessEmail}`,
    },
  },
];

export function TeamSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { img } = useSiteConfig();

  useEffect(() => {
    if (!sectionRef.current) return;

    const cards = sectionRef.current.querySelectorAll(".team-member");
    gsap.fromTo(
      cards,
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
    <section id="team" className="py-24 px-6 bg-surface dark:bg-transparent" ref={sectionRef}>
      {/* Section Title */}
      <div className="text-center mb-14">
        <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-3 text-foreground dark:text-white"><CharReveal>Team</CharReveal></h2>
        <p className="text-muted-foreground text-sm uppercase tracking-widest font-medium">
          Meet Our Team
        </p>
      </div>

      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 justify-items-center">
          {teamMembers.map((member) => (
            <div key={member.name} className="team-member relative w-full max-w-[260px]">
              {/* Image */}
              <div className="relative mb-[50px]">
                {/* Offset echo frame */}
                <div
                  className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-transparent"
                  aria-hidden="true"
                />

                {/* Gradient hairline frame */}
                <div className="relative aspect-square overflow-hidden rounded-2xl p-[2px] bg-gradient-to-br from-primary/70 via-primary/15 to-primary/55 shadow-2xl shadow-primary/45">
                  <Image
                    src={img(member.slot)}
                    alt={member.name}
                    width={260}
                    height={260}
                    className="h-full w-full object-cover"
                  />
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-white/5"
                    aria-hidden="true"
                  />
                </div>

                {/* Corner brackets */}
                <span
                  className="pointer-events-none absolute -left-2 -top-2 size-5 rounded-tl-md border-l-2 border-t-2 border-primary"
                  aria-hidden="true"
                />
                <span
                  className="pointer-events-none absolute -right-2 -top-2 size-5 rounded-tr-md border-r-2 border-t-2 border-primary"
                  aria-hidden="true"
                />
              </div>

              {/* Member Info - overlapping image bottom */}
              <div className="absolute bottom-0 left-5 right-5 backdrop-blur-md bg-background/80 dark:bg-black/60 border border-border dark:border-white/10 shadow-[0_2px_15px_rgba(0,0,0,0.15)] dark:shadow-[0_2px_15px_rgba(0,0,0,0.3)] px-4 py-5">
                <h3 className="font-heading text-base font-medium mb-2.5 relative pb-2.5 text-foreground dark:text-white">
                  {member.name}
                  <span className="absolute bottom-0 left-0 w-[50px] h-px bg-muted-foreground/40" />
                </h3>
                <span className="italic text-[13px] text-muted-foreground dark:text-muted-foreground block mb-0">
                  {member.role}
                </span>
                <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1">
                  {/* LinkedIn */}
                  <a
                    href={member.socials.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on LinkedIn`}
                    className="text-[#0A66C2] hover:opacity-80 transition-opacity duration-300"
                  >
                    <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                  {/* GitHub */}
                  <a
                    href={member.socials.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on GitHub`}
                    className="text-[#181717] dark:text-white hover:opacity-80 transition-opacity duration-300"
                  >
                    <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  </a>
                  {/* Email */}
                  <a
                    href={member.socials.email}
                    aria-label={`Email ${member.name}`}
                    className="text-[#EA4335] hover:opacity-80 transition-opacity duration-300"
                  >
                    <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
