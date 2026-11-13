"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SELECTORS = [
  ".marquee-track",
  ".trust-marquee-track",
  ".wheelRing",
  ".scrollTrackDot",
  ".lw-shimmer",
  ".lw-chip",
  ".loop-flow",
  ".loop-node-pulse",
  ".animate-spin-slow",
];
const PAUSED = "offscreen-paused";

/**
 * Pauses ONLY looping decorative animations while their section is off-screen
 * (or the tab is hidden). Single IntersectionObserver for every animation.
 * Entrance animations (one-shot) are untouched.
 */
export function OffscreenPause() {
  const pathname = usePathname();

  useEffect(() => {
    const seen = new Set<Element>();
    const scan = () => {
      document.querySelectorAll(SELECTORS.join(",")).forEach((el) => seen.add(el));
    };
    scan();

    if (!seen.size) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle(PAUSED, !entry.isIntersecting);
        }
      },
      { rootMargin: "0px", threshold: 0.01 },
    );
    seen.forEach((el) => obs.observe(el));

    const onVisibility = () => {
      if (document.hidden) seen.forEach((el) => el.classList.add(PAUSED));
    };
    document.addEventListener("visibilitychange", onVisibility);
    // Re-scan after a tick — dynamic content may mount after first paint.
    const rescan = window.setTimeout(() => {
      document.querySelectorAll(SELECTORS.join(",")).forEach((el) => {
        seen.add(el);
        obs.observe(el);
      });
    }, 1200);

    return () => {
      obs.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(rescan);
      seen.forEach((el) => el.classList.remove(PAUSED));
    };
  }, [pathname]);

  return null;
}
