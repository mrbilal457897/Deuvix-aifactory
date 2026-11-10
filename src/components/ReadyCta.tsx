"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TARGETS = ".ready-cta-fx";

/**
 * Closing call-to-action for the Services page.
 * Classical, editorial, calm — existing fonts & theme tokens only.
 */
export function ReadyCta() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; /* content renders fully visible, no animation */

    /* Hidden start state is applied only after JS is active */
    root.classList.add("js");

    /* Fallback: if rAF never fires (occluded/background window), reveal everything */
    let rafAlive = false;
    const probeId = window.requestAnimationFrame(() => {
      rafAlive = true;
    });
    const fallback = window.setTimeout(() => {
      if (rafAlive) return;
      root.classList.remove("js");
      root.querySelectorAll<HTMLElement>(TARGETS).forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
    }, 1000);

    try {
      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        gsap.fromTo(
          TARGETS,
          { opacity: 0, y: 34 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.12,
            scrollTrigger: {
              trigger: root,
              start: "top 88%",
              once: true,
            },
          },
        );
      }, root);

      return () => {
        window.cancelAnimationFrame(probeId);
        window.clearTimeout(fallback);
        ctx.revert();
        root.classList.remove("js");
      };
    } catch {
      window.cancelAnimationFrame(probeId);
      window.clearTimeout(fallback);
      root.classList.remove("js");
      return undefined;
    }
  }, []);

  return (
    <section
      ref={rootRef}
      aria-labelledby="ready-cta-title"
      className="relative border-t border-border px-6 py-[90px] lg:py-[150px]"
    >
      <div className="mx-auto max-w-[860px] text-center">
        {/* Eyebrow — site's secondary blue */}
        <p className="ready-cta-fx text-xs font-semibold uppercase tracking-[0.32em] text-secondary sm:text-xs [.js_&]:opacity-0">
          Ready when you are
        </p>

        {/* Heading */}
        <h2
          id="ready-cta-title"
          className="ready-cta-fx mt-6 font-heading h2-lg text-foreground [.js_&]:opacity-0"
        >
          Not sure which service fits?{" "}
          <span className="text-gradient">Let&rsquo;s talk.</span>
        </h2>

        {/* Paragraph */}
        <p className="ready-cta-fx mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-[19px] [.js_&]:opacity-0">
          Tell us about your business and we&rsquo;ll recommend the right AI workforce.
        </p>

        {/* CTA — existing primary button style */}
        <div className="ready-cta-fx mt-10 [.js_&]:opacity-0">
          <Link
            href="/book-a-call"
            className={cn(
              buttonVariants({ variant: "default" }),
              "h-auto px-8 py-4 text-xs font-semibold uppercase tracking-[0.22em] transition-all duration-200 hover:bg-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-10 sm:text-sm",
            )}
          >
            Book a Consultation
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
