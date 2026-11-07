"use client";

import { cn } from "@/lib/utils";
import { DeuvixLogoMark } from "@/components/deuvix-logo";

/**
 * Compact brand mark for the chat header — uses the original uploaded image.
 */
export function ChatLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground",
        className,
      )}
      aria-hidden="true"
    >
      <DeuvixLogoMark size={28} className="size-full" />
    </span>
  );
}
