"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  Mic,
  Volume2,
  VolumeX,
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
import { useAdminAgent, type AgentMessage, type AgentToolTrace, type PendingAction } from "@/lib/ai/use-admin-agent";
import { useVoiceRecorder } from "@/lib/ai/use-voice-recorder";
import { useSpeech } from "@/lib/ai/use-speech";
import {
  VOICE_LANGUAGES,
  VOICE_MAX_SECONDS,
  type VoiceLanguage,
} from "@/lib/ai/voice-languages";

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

function MessageBubble({
  message,
  speaking,
  onSpeak,
  onStop,
}: {
  message: AgentMessage;
  speaking?: boolean;
  onSpeak?: (text: string) => void;
  onStop?: () => void;
}) {
  const isUser = message.role === "user";
  const canSpeak = !isUser && !message.pending && !!message.content;
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
      {!isUser && (
        <div className="flex w-[92%] items-center justify-between gap-2">
          {canSpeak && onSpeak && (
            <button
              type="button"
              onClick={() => (speaking ? onStop?.() : onSpeak(message.content))}
              aria-label={speaking ? "Stop reading" : "Read reply aloud"}
              className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {speaking ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
              {speaking ? "Stop" : "Listen"}
            </button>
          )}
        </div>
      )}
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

function PendingActionCard({
  action,
  onConfirm,
  onCancel,
}: {
  action: PendingAction;
  onConfirm: (action: PendingAction) => void;
  onCancel: (action: PendingAction) => void;
}) {
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
      <div className="mb-1.5 flex items-center gap-2">
        <AlertTriangle className="size-4 text-primary" />
        <span className="font-medium text-foreground">Confirm action</span>
        <span className="ml-auto rounded bg-background px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {action.risk}
        </span>
      </div>
      <p className="mb-1 text-xs text-muted-foreground">
        The agent proposed{" "}
        <span className="font-medium text-foreground">{action.toolName}</span>. Nothing has changed yet.
      </p>
      <pre className="mb-2 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-background p-2 text-[11px] text-foreground/80">
        {JSON.stringify(action.args ?? {}, null, 2)}
      </pre>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onConfirm(action)}>
          <Check className="size-3.5" /> Confirm
        </Button>
        <Button size="sm" variant="outline" onClick={() => onCancel(action)}>
          <X className="size-3.5" /> Cancel
        </Button>
      </div>
    </div>
  );
}

export function AdminAgentPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState<VoiceLanguage>("auto");
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const {
    messages,
    sending,
    error,
    health,
    pending,
    checkingHealth,
    send,
    transcribe,
    confirmAction,
    cancelAction,
    stop,
    reset,
    checkHealth,
  } = useAdminAgent();
  const speech = useSpeech(Boolean(health?.tts?.configured));
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const handleAudio = useCallback(
    async (blob: Blob) => {
      setVoiceError(null);
      setTranscribing(true);
      try {
        const text = await transcribe(blob, language);
        if (text) setInput((prev) => (prev ? `${prev} ${text}` : text));
      } catch (err) {
        setVoiceError(err instanceof Error ? err.message : "Transcription failed.");
      } finally {
        setTranscribing(false);
      }
    },
    [transcribe, language],
  );

  const recorder = useVoiceRecorder(VOICE_MAX_SECONDS, handleAudio);

  const sttConfigured = Boolean(health?.stt?.configured);
  const sttOffline = sttConfigured && health?.stt?.ok === false;
  const showVoice = recorder.supported && sttConfigured;

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, pending, open, sending]);

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
              Ask about leads, bookings, contacts, projects, blog and FAQs. Writes are proposed and need your confirmation.
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
              messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  speaking={speech.speaking && speakingId === m.id}
                  onSpeak={(text) => {
                    setSpeakingId(m.id);
                    void speech.speak(text);
                  }}
                  onStop={() => speech.stop()}
                />
              ))
            )}
            {pending.map((action) => (
              <PendingActionCard
                key={action.id}
                action={action}
                onConfirm={confirmAction}
                onCancel={cancelAction}
              />
            ))}
          </div>

          {error && (
            <div className="px-4 pb-1 text-xs text-destructive">{error}</div>
          )}

          <div className="border-t border-border p-3">
            {(recorder.recording || transcribing || voiceError || sttOffline) && (
              <div
                className={cn(
                  "mb-2 flex items-center gap-1.5 text-[11px]",
                  voiceError || sttOffline ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {voiceError || sttOffline ? (
                  <AlertTriangle className="size-3" />
                ) : (
                  <Loader2 className="size-3 animate-spin" />
                )}
                <span>
                  {voiceError ||
                    (sttOffline
                      ? "Voice offline — the speech service is unreachable."
                      : transcribing
                        ? "Transcribing…"
                        : `Recording… ${recorder.seconds}s (tap stop to transcribe)`)}
                </span>
              </div>
            )}
            <div className="flex items-end gap-2">
              {showVoice && (
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as VoiceLanguage)}
                  disabled={recorder.recording}
                  aria-label="Transcription language"
                  className="h-10 rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-none disabled:opacity-50"
                >
                  {VOICE_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              )}
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
              {showVoice && (
                <Button
                  size="icon"
                  variant={recorder.recording ? "destructive" : "outline"}
                  onClick={() => {
                    if (recorder.recording) recorder.stop();
                    else void recorder.start();
                  }}
                  disabled={sending || transcribing || sttOffline}
                  aria-label={recorder.recording ? "Stop recording" : "Record voice input"}
                >
                  {transcribing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : recorder.recording ? (
                    <Square className="size-4" />
                  ) : (
                    <Mic className="size-4" />
                  )}
                </Button>
              )}
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
