"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

export function LoadingSplash() {
  const [phase, setPhase] = useState<"visible" | "fading" | "gone">("visible");

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setPhase("fading"), prefersReduced ? 50 : 350);
    const remove = setTimeout(() => setPhase("gone"), prefersReduced ? 300 : 900);
    return () => {
      clearTimeout(timer);
      clearTimeout(remove);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-opacity duration-500",
        phase === "fading" && "opacity-0 pointer-events-none"
      )}
    >
      <div className="flex flex-col items-center gap-4 splash-content">
        <BrandLogo className="size-12" />
        <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-full origin-left rounded-full bg-primary splash-bar" />
        </div>
      </div>
    </div>
  );
}
