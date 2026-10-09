"use client";

import { uiStrings } from "@/lib/chat/ui-strings";
import { cn } from "@/lib/utils";

interface Props {
  onPick: (text: string) => void;
  className?: string;
}

export function QuickReplies({ onPick, className }: Props) {
  return (
    <div
      className={cn("flex flex-wrap gap-1.5 px-4 pb-2", className)}
      role="group"
      aria-label="Suggested questions"
    >
      {uiStrings.quickReplies.map((text) => (
        <button
          key={text}
          type="button"
          onClick={() => onPick(text)}
          className="rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/12"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
