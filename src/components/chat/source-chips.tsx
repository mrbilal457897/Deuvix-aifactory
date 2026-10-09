"use client";

import type { ChatSource } from "@/lib/chat/use-chat";
import { uiStrings } from "@/lib/chat/ui-strings";
import { cn } from "@/lib/utils";

const SOURCE_STYLE: Record<ChatSource["source"], string> = {
  deux: "border-primary/30 bg-primary/8 text-primary",
  agentfactory: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

const SOURCE_LABEL: Record<ChatSource["source"], string> = {
  deux: uiStrings.sourceDeux,
  agentfactory: uiStrings.sourceAgentFactory,
};

/** Which chunks the answer was grounded in (§8.6). */
export function SourceChips({ sources, className }: { sources: ChatSource[]; className?: string }) {
  if (!sources.length) return null;

  return (
    <div className={cn("mt-2 flex flex-wrap items-center gap-1.5", className)}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {uiStrings.sourcesLabel}
      </span>
      {sources.map((s) => (
        <a
          key={s.url}
          href={s.url}
          target="_blank"
          rel="noreferrer noopener"
          title={s.title}
          className={cn(
            "max-w-[160px] truncate rounded-full border px-2 py-0.5 text-[10.5px] font-medium transition-colors hover:opacity-80",
            SOURCE_STYLE[s.source],
          )}
        >
          {s.title || SOURCE_LABEL[s.source]}
        </a>
      ))}
    </div>
  );
}
