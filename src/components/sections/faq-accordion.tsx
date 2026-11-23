"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Faq } from "@data/faqs";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/** Only the open/closed state lives on the client; copy comes from data/faqs.ts. */
export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".faq-row",
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: root, start: "top 88%", once: true },
        },
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="border-t border-border">
      {faqs.map((faq, i) => {
        const expanded = open === i;
        return (
          <div
            key={faq.q}
            className={cn(
              "faq-row border-b border-border transition-colors duration-200",
              expanded && "bg-secondary/5",
            )}
          >
            <h3 className="m-0">
              <button
                id={`faq-question-${i}`}
                type="button"
                aria-expanded={expanded}
                aria-controls={`faq-answer-${i}`}
                onClick={() => setOpen(expanded ? null : i)}
                className="flex min-h-12 w-full items-center gap-4 py-5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="shrink-0 font-mono text-sm text-secondary tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 text-[22px] font-semibold leading-relaxed text-foreground">
                  {faq.q}
                </span>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-primary">
                  {expanded ? (
                    <Minus className="size-4" aria-hidden="true" />
                  ) : (
                    <Plus className="size-4" aria-hidden="true" />
                  )}
                </span>
              </button>
            </h3>
            <div
              id={`faq-answer-${i}`}
              role="region"
              aria-labelledby={`faq-question-${i}`}
              className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
              style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="max-w-[640px] px-4 pb-6 text-base leading-relaxed text-muted-foreground sm:pl-[calc(2ch+2rem)]">
                  {faq.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
