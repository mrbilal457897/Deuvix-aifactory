"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useSiteConfig } from "@/hooks/use-site-config";

/**
 * Compact brand mark for the chat header.
 *
 * Falls back to a `D2` tile if the configured logo is missing or fails to
 * load, so the header never renders a broken image.
 */
export function ChatLogo({ className }: { className?: string }) {
  const { img } = useSiteConfig();
  const src = img("logo");
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground",
        className,
      )}
      aria-hidden="true"
    >
      {src && !failed ? (
        <Image
          src={src}
          alt=""
          width={36}
          height={36}
          onError={() => setFailed(true)}
          className="size-full object-contain p-1"
        />
      ) : (
        <span className="font-heading text-sm font-extrabold tracking-wide">D2</span>
      )}
    </span>
  );
}
