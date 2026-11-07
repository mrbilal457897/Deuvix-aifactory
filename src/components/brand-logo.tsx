"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { DeuvixLogoMark } from "@/components/deuvix-logo";

type LogoSize = "xs" | "sm" | "md" | "lg";

const LOGO_SIZES: Record<LogoSize, { w: number; h: number }> = {
  xs: { w: 100, h: 34 },
  sm: { w: 130, h: 43 },
  md: { w: 160, h: 53 },
  lg: { w: 200, h: 67 },
};

/**
 * LogoMark (icon only) — used independently in dashboard collapsed state.
 */
export function LogoMark({ className, size = "sm" }: { className?: string; size?: LogoSize }) {
  const MARK_SIZES: Record<LogoSize, number> = { xs: 20, sm: 24, md: 32, lg: 40 };
  return <DeuvixLogoMark size={MARK_SIZES[size]} className={className} />;
}

/**
 * BrandLogo — main logo with "AI FACTORY" text directly below it.
 * Uses logo-deuvix.png for both light and dark mode.
 */
export function BrandLogo({ className, size = "md" }: { className?: string; size?: LogoSize }) {
  const { w, h } = LOGO_SIZES[size];
  return (
    <>
      <span className={cn("inline-flex flex-col items-center leading-none", className)}>
        <span className="flex shrink-0 items-center justify-center">
          <Image
            src="/images/logo-deuvix.png"
            alt="Deuvix AI Factory"
            width={w}
            height={h}
            className="block shrink-0 object-contain"
            priority
            unoptimized
          />
        </span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium leading-none mt-[1.5px] mb-0 pb-0">
          AI FACTORY
        </span>
      </span>
    </>
  );
}