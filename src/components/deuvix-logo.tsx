"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

/**
 * Deuvix full wordmark logo — uses the original uploaded image directly.
 * Theme-aware:
 * - Light mode: logo-deuvix2.png (transparent PNG)
 * - Dark mode: logo-deuvix.png (has dark pixels baked in)
 */
export function DeuvixLogo({
  className,
  width = 120,
  height = 40,
}: {
  className?: string;
  width?: number;
  height?: number;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const src = isDark ? "/images/logo-deuvix.png" : "/images/logo-deuvix2.png";

  return (
    <Image
      src={src}
      alt="Deuvix AI Factory"
      width={width}
      height={height}
      className={cn("block shrink-0 object-contain", className)}
      priority
      unoptimized
    />
  );
}

/**
 * Deuvix logo mark (icon only) — uses the original uploaded image directly.
 * Theme-aware:
 * - Light mode: logo-deuvix2.png (transparent PNG)
 * - Dark mode: logo-deuvix.png (has dark pixels baked in)
 */
export function DeuvixLogoMark({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const src = isDark ? "/images/logo-deuvix.png" : "/images/logo-deuvix2.png";

  return (
    <Image
      src={src}
      alt="Deuvix mark"
      width={size}
      height={size}
      className={cn("block shrink-0 object-contain", className)}
      priority
      unoptimized
    />
  );
}