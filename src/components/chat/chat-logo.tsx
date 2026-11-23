"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Compact brand mark for the chat header and bot messages: the same D mark
 * used for the site favicon.
 */
export function ChatLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white",
        className,
      )}
      aria-hidden="true"
    >
      <Image
        src="/logo-d.png"
        alt=""
        width={44}
        height={44}
        className="size-11 object-contain"
        unoptimized
      />
    </span>
  );
}
