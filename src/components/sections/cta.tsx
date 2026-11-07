"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookCallButton } from "@/components/book-call-button";
import { company } from "@config/company";
import { Button } from "@/components/ui/button";

export function CTASection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [split, setSplit] = useState(0);

  const measure = useCallback(() => {
    const section = sectionRef.current;
    const media = videoRef.current;
    if (!section || !media) return;
    const sectionRect = section.getBoundingClientRect();
    const mediaRect = media.getBoundingClientRect();
    const splitPx = Math.round(mediaRect.top - sectionRect.top + mediaRect.height * 0.8);
    setSplit(splitPx);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const media = videoRef.current;
    if (!section || !media) return;

    const ro = new ResizeObserver(measure);
    ro.observe(section);
    ro.observe(media);

    measure();

    return () => {
      ro.disconnect();
    };
  }, [measure]);

  useEffect(() => {
    if (sectionRef.current) {
      sectionRef.current.style.setProperty("--split", `${split}px`);
    }
  }, [split]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{
        background: `linear-gradient(to bottom, var(--section-bg-top) 0, var(--section-bg-top) var(--split), var(--section-bg-bottom) var(--split), var(--section-bg-bottom) 100%)`,
      }}
    >
      <div className="relative mx-auto max-w-[1160px] px-[20px] lg:px-6 py-[56px] lg:py-[88px] w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-[64px]">
          {/* Video column */}
          <div className="relative aspect-video w-full">
            <video
              ref={videoRef}
              controls
              playsInline
              className="w-full h-full rounded-[20px] border border-border/60 dark:border-white/20 shadow-[0_24px_50px_rgba(0,0,0,0.4)] object-cover"
              src="/uploads/deuvix.mp4"
              poster="/uploads/deuvix-poster.jpg"
              preload="metadata"
            />
          </div>

          {/* Text column */}
          <div>
            <h2 className="font-heading text-[48px] sm:text-[56px] font-bold text-foreground mb-6 leading-tight">
              Start your AI journey
            </h2>
            <p className="text-muted-foreground dark:text-white/70 text-[18px] leading-[1.6] max-w-[44ch] mb-8">
              Join businesses building AI-Native companies with Deuvix AI Factory. Manufacture, deploy, and monetize Digital FTEs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <BookCallButton
                icon={null}
                className="bg-primary text-primary-foreground font-semibold px-8 py-6 text-base rounded-xl hover:bg-primary/90 hover:-translate-y-[2px] transition-all duration-200"
              >
                Book a consultation
              </BookCallButton>
              <Link href="/products">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-border dark:border-white/30 text-foreground dark:text-white font-semibold px-8 py-6 text-base rounded-xl hover:bg-muted dark:hover:bg-white/10 transition-all duration-200"
                >
                  View our work
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted-foreground dark:text-white/60">
              Prefer email? Write to{" "}
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
    </section>
  );
}
