"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, MoreVertical, RefreshCw, Sparkles, MessageSquarePlus, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChatLogo } from "@/components/chat/chat-logo";
import { MessageBubble, TypingIndicator } from "@/components/chat/message-bubble";
import { QuickReplies } from "@/components/chat/quick-replies";
import { Composer } from "@/components/chat/composer";
import { LeadCard } from "@/components/chat/lead-card";
import { uiStrings } from "@/lib/chat/ui-strings";
import type { ChatApi } from "@/lib/chat/use-chat";
import { cn } from "@/lib/utils";

interface Props {
  api: ChatApi;
  windowRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onClose: () => void;
}

export function ChatWindow({ api, windowRef, inputRef, onClose }: Props) {
  const [showLead, setShowLead] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { messages, sending } = api;
  const showQuickReplies = messages.length <= 2 && !sending;

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  }, []);

  const jumpToLatest = useCallback(() => {
    setAtBottom(true);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    if (!atBottom) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, atBottom]);

  return (
    <div
      ref={windowRef}
      role="dialog"
      aria-label={uiStrings.dialogLabel}
      tabIndex={-1}
      className="chat-pop deaux-chat fixed bottom-6 right-6 z-50 flex w-[380px] max-w-[calc(100vw-1.5rem)] h-[540px] max-h-[calc(100svh-7rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl max-sm:inset-0 max-sm:h-[100svh] max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:rounded-none"
    >
      {/* ---- header ---------------------------------------------------- */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <ChatLogo />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-heading h3-sm">Deuvix AI Factory</h3>
          <p className="flex items-center gap-1 text-xs leading-tight text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            {api.ended ? uiStrings.sessionEnded : uiStrings.statusOnline}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={uiStrings.menu}
            className="btn-sharp flex size-9 items-center justify-center rounded-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground outline-none"
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuItem onClick={api.startNewChat}>
              <MessageSquarePlus className="size-4" />
              {uiStrings.newChat}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowLead((v) => !v)}>
              <Users className="size-4" />
              {uiStrings.leadCardTitle}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={onClose}
          aria-label={uiStrings.close}
          className="btn-sharp flex size-9 items-center justify-center rounded-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* ---- messages --------------------------------------------------- */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {api.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {api.sending && !api.messages.some((m) => m.pending) && <TypingIndicator />}

        {showLead && <LeadCard className="mt-2" />}

        {!atBottom && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="btn-sharp sticky bottom-0 left-1/2 -translate-x-1/2 rounded-none border border-border bg-background px-3 py-1 text-xs shadow-md"
          >
            {uiStrings.jumpToLatest}
          </button>
        )}
      </div>

      {/* ---- footer ------------------------------------------------------ */}
      {showQuickReplies && !showLead && (
        <QuickReplies
          onPick={(text) => {
            if (text === "Talk to the founders") setShowLead(true);
            api.send(text);
          }}
        />
      )}

      {!showLead && (
        <div className="px-4 pb-1">
          <button
            type="button"
            onClick={() => setShowLead(true)}
            className="btn-sharp inline-flex items-center gap-1.5 text-[11.5px] font-medium text-primary hover:underline"
          >
            <Users className="size-3.5" />
            {uiStrings.leadCardTitle}
          </button>
        </div>
      )}

      {api.ended && (
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={api.startNewChat}
            className="btn-sharp inline-flex h-9 w-full items-center justify-center gap-2 rounded-none bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/85"
          >
            <RefreshCw className="size-4" />
            {uiStrings.startNewChat}
          </button>
        </div>
      )}

      <Composer
        sending={api.sending}
        ended={api.ended}
        onSend={(text) => {
          if (text === "Talk to the founders") setShowLead(true);
          api.send(text);
        }}
        onStop={api.stop}
        inputRef={inputRef}
      />
    </div>
  );
}

/** Small greeting bubble shown next to the launcher (§8.1). */
export function LauncherGreeting({ onDismiss, className }: { onDismiss: () => void; className?: string }) {
  return (
    <div
      className={cn(
        "fixed bottom-24 right-6 z-40 max-w-[240px] rounded-xl border border-border bg-card px-3 py-2.5 shadow-lg",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
        <p className="text-xs leading-snug">{uiStrings.launcherGreeting}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="btn-sharp mt-1.5 text-[10.5px] text-muted-foreground hover:text-foreground"
      >
        {uiStrings.launcherGreetingDismiss}
      </button>
    </div>
  );
}
