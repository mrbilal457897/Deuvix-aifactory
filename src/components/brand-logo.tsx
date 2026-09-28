"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useSiteConfig } from "@/hooks/use-site-config";

type LogoSize = "xs" | "sm" | "md" | "lg";

const SIZES = {
  xs: { mark: "size-10 text-xs", px: 40, name: "text-base", sub: "text-[8px]", pull: "-ml-[13px]" },
  sm: { mark: "size-12 text-sm", px: 48, name: "text-lg", sub: "text-[9px]", pull: "-ml-[15px]" },
  md: { mark: "size-18 text-xl", px: 72, name: "text-2xl", sub: "text-[10px]", pull: "-ml-[23px]" },
  lg: { mark: "size-24 text-3xl", px: 96, name: "text-4xl", sub: "text-xs", pull: "-ml-[30px]" },
};

interface LogoMarkProps {
  className?: string;
  size?: LogoSize;
}

export function LogoMark({ className, size = "sm" }: LogoMarkProps) {
  const { img } = useSiteConfig();
  const src = img("logo");
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && src !== failedSrc;

  const s = SIZES[size];

  return (
    <span className={cn("flex shrink-0 items-center justify-center", s.mark, className)}>
      {showImage ? (
        <Image
          src={src}
          alt=""
          width={s.px}
          height={s.px}
          onError={() => setFailedSrc(src)}
          className="size-full object-contain dark:invert"
        />
      ) : (
        <span className="flex size-full items-center justify-center bg-foreground font-extrabold tracking-[0.5px] text-background">
          D2
        </span>
      )}
    </span>
  );
}

interface BrandLogoProps {
  className?: string;
  size?: LogoSize;
}

export function BrandLogo({ className, size = "md" }: BrandLogoProps) {
  const s = SIZES[size];

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      <span className={cn("leading-none text-left", s.pull)}>
        <span className={cn("block font-heading font-extrabold tracking-[0.5px]", s.name)}>
          DEUX
        </span>
        <span className={cn("block uppercase text-muted-foreground tracking-[0.2em]", s.sub)}>
          AI Factory&trade;
        </span>
      </span>
    </span>
  );
}
