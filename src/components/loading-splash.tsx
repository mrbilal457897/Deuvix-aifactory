"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { DeuvixLogo } from "@/components/brand/DeuvixLogo";
import { logoLoader } from "@/lib/logo-animations";

export function LoadingSplash() {
  const [phase, setPhase] = useState<"visible" | "fading" | "gone">("visible");
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setPhase("fading"), prefersReduced ? 50 : 350);
    const remove = setTimeout(() => setPhase("gone"), prefersReduced ? 300 : 900);
    return () => {
      clearTimeout(timer);
      clearTimeout(remove);
    };
  }, []);

  // Breathing pulse on the logo while it is visible; killed on unmount.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const tween = logoLoader(svg);
    return () => {
      tween.kill();
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
        <div className="flex flex-col items-center gap-1.5 leading-none">
          <DeuvixLogo ref={svgRef} style={{ height: 40, width: "auto" }} aria-hidden="true" role={undefined} />
          <span className="text-[9px] text-muted-foreground uppercase tracking-[0.22em] font-medium leading-none">
            AI Factory
          </span>
        </div>
        <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-full origin-left rounded-full bg-primary splash-bar" />
        </div>
      </div>
    </div>
  );
}
