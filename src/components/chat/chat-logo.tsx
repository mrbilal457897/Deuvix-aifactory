"use client";

import { cn } from "@/lib/utils";
import { DeuvixMark } from "@/components/brand/DeuvixMark";

/**
 * Compact brand mark for the chat header — solid primary tile with the D mark.
 */
export function ChatLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground",
        className,
      )}
      style={{ ["--logo-accent" as string]: "var(--primary-foreground)" }}
      aria-hidden="true"
    >
      <DeuvixMark className="size-6" />
    </span>
  );
}
