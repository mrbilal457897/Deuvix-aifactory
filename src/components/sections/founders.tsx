"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useSiteConfig } from "@/hooks/use-site-config";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const founders = [
  {
    name: "Bilal Ali",
    role: "CO-FOUNDER / CEO",
    slot: "team-bilal",
    linkedin: "https://www.linkedin.com/company/145184855/",
  },
  {
    name: "Asadullah",
    role: "CO-FOUNDER / CTO",
    slot: "team-asad",
    linkedin: "https://www.linkedin.com/company/145184855/",
  },
];

export function FoundersSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { img } = useSiteConfig();

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".founder-card",
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
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="founders-heading"
      className="relative py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-background"
    >
      <div className="relative mx-auto max-w-7xl w-full">
        <div className="flex flex-col xl:flex-row gap-10 xl:gap-16 items-start">
          {/* Left column: label + heading + description */}
          <div className="flex-1 xl:flex-none shrink-0 max-w-md">
            <span
              className="inline-block text-xs font-semibold tracking-[0.24em] uppercase text-secondary mb-4 leading-none"
            >
              LEADERSHIP
            </span>
            <h2
              id="founders-heading"
              className="font-heading h2-lg text-foreground mb-0"
            >
              Meet the Founders
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground max-w-[44ch] mt-4 font-normal">
              Big companies begin with bold people who refuse to wait for the future. These two are building it today, turning ambitious ideas into AI workers that run around the clock, one Digital FTE at a time.
            </p>
          </div>

          {/* Right column: two founder cards in a grid */}
          <div className="w-full xl:flex-[2]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 xl:gap-8">
              {founders.map((f) => (
                <div
                  key={f.name}
                  className="founder-card relative overflow-hidden"
                >
                  <a
                    href={f.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={f.name + ", " + f.role + " on LinkedIn"}
                    className="founder-photo-link group block relative aspect-[4/5] overflow-hidden rounded-none bg-muted focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4"
                  >
                    <Image
                      src={img(f.slot)}
                      alt={f.name + ", " + f.role}
                      fill
                      sizes="(min-width: 1024px) 32vw, 100vw"
                      className="object-cover object-[center_20%] founder-photo"
                    />
                    <span
                      className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"
                      aria-hidden="true"
                    />
                    <span className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-6">
                      <span className="font-heading font-bold text-white block text-2xl sm:text-3xl leading-none tracking-tight">
                        {f.name}
                      </span>
                      <span className="text-xs font-semibold tracking-[0.16em] uppercase text-secondary block mt-2 leading-none">
                        {f.role}
                      </span>
                    </span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          /* Only apply grayscale where hover actually exists (desktop, fine pointer).
             Touch devices — phones, tablets, foldables — see full colour always. */
          @media (hover: hover) and (pointer: fine) {
            .founder-photo {
              filter: grayscale(100%);
              transition: filter 0.5s ease;
            }

            .founder-photo-link:hover .founder-photo,
            .founder-photo-link:focus-within .founder-photo {
              filter: grayscale(0);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .founder-photo {
              transition: none !important;
            }
          }
        `}
      </style>
    </section>
  );
}
