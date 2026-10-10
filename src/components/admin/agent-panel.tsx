"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Send,
  Square,
  Loader2,
  Wrench,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAdminAgent, type AgentMessage, type AgentToolTrace } from "@/lib/ai/use-admin-agent";

const EXAMPLES = [
  "How many leads do we have, and who are the newest?",
  "Show upcoming bookings for this week.",
  "Summarise the most recent contact messages.",
  "List our blog posts by category.",
];

function ToolTrace({ tool }: { tool: AgentToolTrace }) {
  return (
    <details className="group rounded-lg border border-border bg-muted/40 text-xs">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-1.5">
        <Wrench className="size-3.5 text-muted-foreground" />
        <span className="font-medium text-foreground">{tool.name}</span>
        {tool.risk && (
          <span className="rounded bg-background px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {tool.risk}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-muted-foreground">
          {tool.status === "running" && <Loader2 className="size-3.5 animate-spin" />}
          {tool.status === "ok" && <Check className="size-3.5 text-primary" />}
          {tool.status === "error" && <X className="size-3.5 text-destructive" />}
        </span>
      </summary>
      <div className="space-y-2 border-t border-border px-2.5 py-2">
        <div>
          <p className="mb-0.5 font-medium text-muted-foreground">Arguments</p>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-foreground/80">
            {JSON.stringify(tool.args ?? {}, null, 2)}
          </pre>
        </div>
        {tool.status === "error" ? (
          <div>
            <p className="mb-0.5 font-medium text-muted-foreground">Error</p>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-destructive">
              {tool.error}
            </pre>
          </div>
        ) : tool.status === "ok" ? (
          <div>
            <p className="mb-0.5 font-medium text-muted-foreground">Result</p>
            <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words text-[11px] text-foreground/80">
              {JSON.stringify(tool.result ?? null, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function MessageBubble({ message }: { message: AgentMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : message.error
              ? "bg-destructive/10 text-foreground ring-1 ring-destructive/30"
              : "bg-muted text-foreground",
        )}
      >
        {message.content ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : message.pending ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Thinking…
          </span>
        ) : null}
      </div>
      {!isUser && message.tools && message.tools.length > 0 && (
        <div className="w-[92%] space-y-1.5">
          {message.tools.map((t) => (
            <ToolTrace key={t.id} tool={t} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminAgentPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, sending, error, health, checkingHealth, send, stop, reset, checkHealth } =
    useAdminAgent();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open, sending]);

  const submit = () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    void send(text);
  };

  const offline = health ? !health.ok : false;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open admin AI agent"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <Sparkles className="size-4" />
        <span className="hidden sm:inline">AI Agent</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <SheetTitle className="text-base">Admin AI Agent</SheetTitle>
            </div>
            <SheetDescription className="text-xs">
              Ask about leads, bookings, contacts, projects, blog and FAQs. Read-only for now.
            </SheetDescription>
          </SheetHeader>

          {offline && (
            <div className="flex items-start gap-2 border-b border-border bg-destructive/10 px-4 py-2.5 text-xs text-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
              <div className="flex-1">
                <p className="font-medium">AI offline</p>
                <p className="text-muted-foreground">
                  {health?.error || "Start the local model server (Ollama) and retry."}
                </p>
              </div>
              <Button
                size="xs"
                variant="outline"
                onClick={() => void checkHealth()}
                disabled={checkingHealth}
              >
                {checkingHealth ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                Retry
              </Button>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Ask a question to get started. Try one of these:</p>
                <div className="space-y-1.5">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => void send(ex)}
                      className="block w-full rounded-xl border border-border bg-card px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => <MessageBubble key={m.id} message={m} />)
            )}
          </div>

          {error && (
            <div className="px-4 pb-1 text-xs text-destructive">{error}</div>
          )}

          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Ask the agent…"
                rows={1}
                maxLength={4000}
                className="max-h-32 min-h-10 resize-none"
                disabled={sending}
              />
              {sending ? (
                <Button size="icon" variant="outline" onClick={stop} aria-label="Stop">
                  <Square className="size-4" />
                </Button>
              ) : (
                <Button size="icon" onClick={submit} disabled={!input.trim()} aria-label="Send">
                  <Send className="size-4" />
                </Button>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Enter to send · Shift+Enter for a new line</span>
              {messages.length > 0 && (
                <button type="button" onClick={reset} className="hover:text-foreground">
                  Clear
                </button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
