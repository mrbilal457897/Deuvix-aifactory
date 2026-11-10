"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  Bot,
  User,
  ChevronDown,
  ArrowUpRight,
  ShieldCheck,
  Eraser,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useAdminAgent,
  type AgentMessage,
  type AgentProviderId,
  type AgentToolTrace,
  type PendingAction,
} from "@/lib/ai/use-admin-agent";
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
  "List our portfolio projects and their status.",
  "Add a project called... with a short description.",
];

function ToolStatusIcon({ status }: { status: AgentToolTrace["status"] }) {
  if (status === "running") return <Loader2 className="size-3.5 animate-spin text-muted-foreground" />;
  if (status === "ok") return <Check className="size-3.5 text-emerald-500" />;
  return <X className="size-3.5 text-destructive" />;
}

function ToolTrace({ tool }: { tool: AgentToolTrace }) {
  return (
    <details className="group overflow-hidden rounded-xl border border-border/70 bg-background/60 text-xs">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-2">
        <span className="flex size-5 items-center justify-center rounded-md bg-muted">
          <Wrench className="size-3 text-muted-foreground" />
        </span>
        <span className="font-medium text-foreground">{tool.name}</span>
        {tool.risk && (
          <span className="rounded-full border border-border px-1.5 py-px text-[10px] uppercase tracking-wide text-muted-foreground">
            {tool.risk}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-muted-foreground">
          <ToolStatusIcon status={tool.status} />
        </span>
      </summary>
      <div className="space-y-2 border-t border-border/70 px-2.5 py-2">
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
    <div className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg shadow-sm",
          isUser
            ? "bg-muted text-muted-foreground"
            : "bg-gradient-to-br from-primary to-nexus-dark text-primary-foreground",
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>
      <div className={cn("flex min-w-0 max-w-[85%] flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
            isUser
              ? "rounded-tr-md bg-primary text-primary-foreground shadow-primary/20"
              : message.error
                ? "rounded-tl-md bg-destructive/10 text-foreground ring-1 ring-destructive/30"
                : "rounded-tl-md bg-card text-foreground ring-1 ring-border",
          )}
        >
          {message.content ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : message.pending ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="flex gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: "0ms" }} />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: "150ms" }} />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: "300ms" }} />
              </span>
            </span>
          ) : null}
        </div>
        {!isUser && canSpeak && onSpeak && (
          <button
            type="button"
            onClick={() => (speaking ? onStop?.() : onSpeak(message.content))}
            aria-label={speaking ? "Stop reading" : "Read reply aloud"}
            className="btn-sharp flex items-center gap-1 rounded-none px-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {speaking ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
            {speaking ? "Stop" : "Listen"}
          </button>
        )}
        {!isUser && message.tools && message.tools.length > 0 && (
          <div className="w-full space-y-1.5">
            {message.tools.map((t) => (
              <ToolTrace key={t.id} tool={t} />
            ))}
          </div>
        )}
      </div>
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
    <div className="overflow-hidden rounded-2xl border border-amber-500/40 bg-amber-500/[0.06] shadow-sm">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <ShieldCheck className="size-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium leading-tight text-foreground">Approval needed</p>
          <p className="text-[11px] text-muted-foreground">Nothing has changed yet.</p>
        </div>
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
          {action.risk}
        </span>
      </div>
      <div className="space-y-2 px-3.5 pb-3">
        <p className="text-xs text-muted-foreground">
          The agent proposed <span className="font-medium text-foreground">{action.toolName}</span>.
        </p>
        <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border/70 bg-background/70 p-2.5 text-[11px] text-foreground/80">
          {JSON.stringify(action.args ?? {}, null, 2)}
        </pre>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onConfirm(action)} className="flex-1">
            <Check className="size-3.5" /> Confirm
          </Button>
          <Button size="sm" variant="outline" onClick={() => onCancel(action)} className="flex-1">
            <X className="size-3.5" /> Cancel
          </Button>
        </div>
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
  const reduceMotion = useReducedMotion();
  const {
    messages,
    sending,
    error,
    health,
    pending,
    provider,
    providers,
    checkingHealth,
    send,
    transcribe,
    confirmAction,
    cancelAction,
    stop,
    reset,
    checkHealth,
    selectProvider,
  } = useAdminAgent();
  const speech = useSpeech(Boolean(health?.tts?.configured));
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const voiceDraftRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const handleAudio = useCallback(
    async (blob: Blob) => {
      setVoiceError(null);
      setTranscribing(true);
      try {
        const text = await transcribe(blob, language);
        if (text) {
          setInput((prev) => (prev ? `${prev} ${text}` : text));
          voiceDraftRef.current = true;
        }
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
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, open, sending]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), reduceMotion ? 0 : 140);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [open, reduceMotion]);

  const submit = () => {
    const text = input.trim();
    if (!text || sending) return;
    const mode: "text" | "voice" = voiceDraftRef.current ? "voice" : "text";
    voiceDraftRef.current = false;
    setInput("");
    void send(text, mode);
  };

  const offline = health ? !health.ok : false;

  const activeProvider = providers.find((p) => p.id === provider);
  const dotClass = checkingHealth
    ? "bg-amber-400 animate-pulse"
    : health?.ok
      ? "bg-emerald-500"
      : "bg-destructive";
  const statusText = checkingHealth ? "Connecting…" : health?.ok ? "Online" : "Offline";

  const panelTransition = reduceMotion
    ? { duration: 0 }
    : ({ type: "spring" as const, stiffness: 380, damping: 32, mass: 0.9 });

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open admin AI agent"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={reduceMotion ? undefined : { scale: 1.04 }}
        whileTap={reduceMotion ? undefined : { scale: 0.95 }}
        transition={panelTransition}
        className="group fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-[4px] bg-gradient-to-br from-primary to-nexus-dark px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-primary/40"
      >
        <span className="relative flex size-5 items-center justify-center">
          <Sparkles className="size-5" />
          {health?.ok && (
            <span className="absolute -right-1 -top-1 size-2 rounded-full bg-emerald-400 ring-2 ring-primary" />
          )}
        </span>
        <span className="hidden sm:inline">AI Agent</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="agent-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />
            <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
              <motion.div
                key="agent-panel"
                role="dialog"
                aria-modal="true"
                aria-label="Admin AI Agent"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
                transition={panelTransition}
                className="pointer-events-auto flex h-[92svh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:h-[min(88svh,780px)] sm:max-w-xl sm:rounded-3xl"
              >
                <div className="h-1 shrink-0 bg-gradient-to-r from-primary via-nexus-light to-transparent" />

                <header className="relative shrink-0 border-b border-border bg-gradient-to-br from-primary/[0.08] via-card to-card px-4 py-3.5 sm:px-5">
                  <div className="flex items-center gap-3">
                    <div className="relative flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-nexus-dark text-primary-foreground shadow-md shadow-primary/25">
                      <Sparkles className="size-5" />
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-card",
                          dotClass,
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-heading h2-sm text-foreground">
                        Deuvix AI Agent
                      </h2>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{statusText}</span>
                        {health?.model && (
                          <>
                            <span className="text-border">·</span>
                            <span className="truncate font-mono text-[11px]">{health.model}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void checkHealth()}
                      disabled={checkingHealth}
                      aria-label="Recheck connection"
                      className="btn-sharp flex size-8 items-center justify-center rounded-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                    >
                      <RefreshCw className={cn("size-4", checkingHealth && "animate-spin")} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Close agent"
                      className="btn-sharp flex size-8 items-center justify-center rounded-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {providers.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="relative inline-flex items-center">
                        <span
                          className={cn(
                            "pointer-events-none absolute left-2.5 size-1.5 rounded-full",
                            activeProvider?.ready ? "bg-emerald-500" : "bg-muted-foreground/50",
                          )}
                        />
                        <select
                          value={provider}
                          onChange={(e) => selectProvider(e.target.value as AgentProviderId)}
                          aria-label="LLM provider"
                          disabled={sending}
                          className="h-8 cursor-pointer appearance-none rounded-none border border-border bg-background/70 pl-6 pr-7 text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {providers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                              {p.ready ? "" : " — no key"}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground" />
                      </div>
                      <span className="hidden text-[11px] text-muted-foreground sm:inline">
                        Writes need your approval
                      </span>
                    </div>
                  )}
                </header>

                {offline && (
                  <div className="flex shrink-0 items-start gap-2.5 border-b border-border bg-destructive/10 px-4 py-2.5 text-xs sm:px-5">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">AI offline</p>
                      <p className="text-muted-foreground">
                        {health?.error || "Start the selected model provider and retry."}
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

                <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
                  {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-5 py-6 text-center">
                      <div className="flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/15 to-nexus-dark/10 ring-1 ring-primary/20">
                        <Sparkles className="size-7 text-primary" />
                      </div>
                      <div className="max-w-sm space-y-1.5">
                        <h3 className="font-heading h3-sm text-foreground">
                          How can I help?
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Ask about leads, bookings, contacts, projects, media, users, site
                          images, blog and FAQs. I can propose changes — you approve them.
                        </p>
                      </div>
                      <div className="grid w-full max-w-md gap-2 sm:grid-cols-2">
                        {EXAMPLES.map((ex) => (
                          <button
                            key={ex}
                            type="button"
                            onClick={() => void send(ex)}
                            className="btn-sharp group flex items-start gap-2 rounded-none border border-border bg-card px-3 py-2.5 text-left text-xs text-foreground transition-all hover:border-primary/40 hover:bg-primary/[0.04] hover:shadow-sm"
                          >
                            <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                            <span>{ex}</span>
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
                  <div className="shrink-0 px-4 pb-1 text-xs text-destructive sm:px-5">{error}</div>
                )}

                <div className="shrink-0 border-t border-border bg-surface px-3 py-3 sm:px-4">
                  {(recorder.recording || transcribing || voiceError || sttOffline) && (
                    <div
                      className={cn(
                        "mb-2 flex items-center gap-1.5 px-1 text-[11px]",
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

                  <div className="rounded-2xl border border-border bg-card p-1.5 shadow-sm transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
                    <Textarea
                      ref={inputRef}
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
                      disabled={sending}
                      className="max-h-32 min-h-9 resize-none border-0 bg-transparent px-2.5 py-1.5 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
                    />
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      <div className="flex items-center gap-1">
                        {showVoice && (
                          <div className="relative inline-flex items-center">
                            <select
                              value={language}
                              onChange={(e) => setLanguage(e.target.value as VoiceLanguage)}
                              disabled={recorder.recording}
                              aria-label="Transcription language"
                              className="h-7 cursor-pointer appearance-none rounded-lg bg-transparent pl-2 pr-5 text-[11px] text-muted-foreground outline-none transition-colors hover:bg-muted disabled:opacity-50"
                            >
                              {VOICE_LANGUAGES.map((l) => (
                                <option key={l.code} value={l.code}>
                                  {l.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-1 size-3 text-muted-foreground" />
                          </div>
                        )}
                        {showVoice && (
                          <Button
                            size="icon-sm"
                            variant={recorder.recording ? "destructive" : "ghost"}
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
                              <Square className="size-3.5" />
                            ) : (
                              <Mic className="size-4" />
                            )}
                          </Button>
                        )}
                      </div>
                      {sending ? (
                        <Button
                          size="icon-sm"
                          variant="outline"
                          onClick={stop}
                          aria-label="Stop"
                          className="size-8"
                        >
                          <Square className="size-3.5" />
                        </Button>
                      ) : (
                        <Button
                          size="icon-sm"
                          onClick={submit}
                          disabled={!input.trim()}
                          aria-label="Send"
                          className="size-8 shadow-sm shadow-primary/25"
                        >
                          <Send className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                    <span>Enter to send · Shift+Enter for a new line</span>
                    {messages.length > 0 && (
                      <button
                        type="button"
                        onClick={reset}
                        className="btn-sharp flex items-center gap-1 rounded-none px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Eraser className="size-3" />
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
