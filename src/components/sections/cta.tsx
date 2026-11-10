"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookCallButton } from "@/components/book-call-button";
import { company } from "@config/company";
import { buttonVariants } from "@/components/ui/button";

export function CTASection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [split, setSplit] = useState(0);
  const [shouldMountVideo, setShouldMountVideo] = useState(false);

  // Mount the video only when the section nears the viewport — it is a large
  // asset and most sessions never scroll this far. Server and first client
  // render agree on the placeholder, so hydration stays consistent.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || shouldMountVideo) return;
    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setShouldMountVideo(true), 0);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldMountVideo(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [shouldMountVideo]);

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
  }, [measure, shouldMountVideo]);

  useEffect(() => {
    if (sectionRef.current) {
      sectionRef.current.style.setProperty("--split", `${split}px`);
    }
  }, [split]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="cta-heading"
      className="relative overflow-hidden"
      style={{
        background: `linear-gradient(to bottom, var(--section-bg-top) 0, var(--section-bg-top) var(--split), var(--section-bg-bottom) var(--split), var(--section-bg-bottom) 100%)`,
      }}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-[64px]">
          {/* Video column — lazy-mounted near the viewport */}
          <div className="relative aspect-video w-full">
            {shouldMountVideo ? (
              <video
                ref={videoRef}
                controls
                playsInline
                preload="metadata"
                className="w-full h-full rounded-[20px] border border-border/60 dark:border-border shadow-[0_24px_50px_rgba(0,0,0,0.4)] object-cover"
                src="/uploads/deuvix.mp4"
                poster="/uploads/deuvix-poster.jpg"
                aria-label="Deuvix AI Factory — company introduction video"
              />
            ) : (
              <img
                src="/uploads/deuvix-poster.jpg"
                alt="Deuvix AI Factory — company introduction video"
                loading="lazy"
                className="w-full h-full rounded-[20px] border border-border/60 dark:border-border shadow-[0_24px_50px_rgba(0,0,0,0.4)] object-cover"
              />
            )}
          </div>

          {/* Text column */}
          <div>
            <h2 id="cta-heading" className="font-heading h2-lg text-foreground mb-6">
              Start your AI journey
            </h2>
            <p className="text-muted-foreground text-lg leading-[1.6] max-w-[44ch] mb-8">
              Join businesses building AI-Native companies with Deuvix AI Factory. Manufacture, deploy, and monetize Digital FTEs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <BookCallButton
                icon={null}
                size="lg"
                className="font-semibold text-sm"
              >
                Book a consultation
              </BookCallButton>
              <Link
                href="/projects"
                className={buttonVariants({ variant: "outline", size: "lg" }) + " text-sm"}
              >
                View our work
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Prefer email? Write to{" "}
              <a
                href={`mailto:${company.businessEmail}`}
                className="font-medium text-primary hover:underline"
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
