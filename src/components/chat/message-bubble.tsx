"use client";

import { useState } from "react";
import { Check, Copy, ThumbsDown, ThumbsUp, RotateCcw, AlertTriangle } from "lucide-react";
import { Markdown } from "@/lib/chat/markdown";
import { uiStrings } from "@/lib/chat/ui-strings";
import type { ChatMessage } from "@/lib/chat/use-chat";
import { SourceChips } from "@/components/chat/source-chips";
import { ChatLogo } from "@/components/chat/chat-logo";
import { cn } from "@/lib/utils";

interface Props {
  message: ChatMessage;
  onRetry?: () => void;
  onFeedback?: (messageId: string, feedback: "up" | "down") => void;
}

export function MessageBubble({ message, onRetry, onFeedback }: Props) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — nothing to do */
    }
  };

  const rate = async (feedback: "up" | "down") => {
    if (vote) return;
    setVote(feedback);
    onFeedback?.(message.id, feedback);
    try {
      await fetch("/api/chat/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message.id, feedback }),
      });
    } catch {
      /* visual state already reflects the choice */
    }
  };

  return (
    <div
      className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}
      data-role={message.role}
    >
      {!isUser && (
        <ChatLogo className="size-7 shrink-0 self-start rounded-md" />
      )}

      <div className={cn("min-w-0 max-w-[85%]", isUser && "max-w-[75%]")}>
        <div
          className={cn(
            "px-3.5 py-2.5 rounded-2xl text-sm",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : message.error
                ? "border border-destructive/40 bg-destructive/8 rounded-bl-md"
                : "bg-muted rounded-bl-md",
          )}
          dir="auto"
        >
          <Markdown content={message.content} />
        </div>

        {!isUser && (message.sources?.length ?? 0) > 0 && (
          <SourceChips sources={message.sources!} />
        )}

        {!isUser && !message.pending && (
          <div className="mt-1.5 flex items-center gap-0.5">
            {message.error && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] text-destructive hover:bg-destructive/10"
              >
                <RotateCcw className="size-3" />
                {uiStrings.retry}
              </button>
            )}

            <button
              type="button"
              onClick={copy}
              aria-label={copied ? uiStrings.copied : uiStrings.copy}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => rate("up")}
              aria-label={uiStrings.thumbsUp}
              aria-pressed={vote === "up"}
              className={cn(
                "inline-flex size-7 items-center justify-center rounded-md transition-colors hover:bg-muted",
                vote === "up" ? "text-primary" : vote ? "text-muted-foreground/30" : "text-muted-foreground/70",
              )}
            >
              <ThumbsUp className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() => rate("down")}
              aria-label={uiStrings.thumbsDown}
              aria-pressed={vote === "down"}
              className={cn(
                "inline-flex size-7 items-center justify-center rounded-md transition-colors hover:bg-muted",
                vote === "down" ? "text-destructive" : vote ? "text-muted-foreground/30" : "text-muted-foreground/70",
              )}
            >
              <ThumbsDown className="size-3.5" />
            </button>

            {message.error && (
              <AlertTriangle className="ml-1 size-3.5 text-destructive/70" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Three-dot typing indicator (§8.2). */
export function TypingIndicator() {
  return (
    <div className="flex gap-2.5" aria-label={uiStrings.typing} role="status">
      <ChatLogo className="size-7 shrink-0 self-start rounded-md" />
      <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3.5">
        <span className="flex items-center gap-1">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
