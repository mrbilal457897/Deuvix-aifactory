"use client";

/**
 * Client protocol for the admin AI agent.
 *
 * Mirrors src/lib/chat/use-chat.ts: JSON-lines over a fetch stream, so a partial
 * line is buffered until its newline. No external stream library.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AgentRole = "user" | "assistant";
export type ToolStatus = "running" | "ok" | "error";

export interface AgentToolTrace {
  id: string;
  name: string;
  risk?: string;
  args?: unknown;
  status: ToolStatus;
  result?: unknown;
  error?: string;
}

export interface AgentMessage {
  id: string;
  role: AgentRole;
  content: string;
  pending?: boolean;
  error?: boolean;
  tools?: AgentToolTrace[];
}

export interface PendingAction {
  id: string;
  toolName: string;
  risk: string;
  args: unknown;
}

export interface AgentHealth {
  ok: boolean;
  model?: string;
  baseUrl?: string;
  latencyMs?: number;
  error?: string;
  modelMissing?: boolean;
  modelsSeen?: string[];
  stt?: {
    ok: boolean;
    configured: boolean;
    baseUrl?: string;
    model?: string;
    error?: string;
  };
  tts?: {
    ok: boolean;
    configured: boolean;
    baseUrl?: string;
    model?: string;
    voice?: string;
    error?: string;
  };
}

const MAX_INPUT = 4000;
const HISTORY_WINDOW = 12;

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `a${Date.now().toString(36)}-${idCounter}`;
}

function looksOffline(status: number, error?: string): boolean {
  return status === 503 || (error || "").toLowerCase().includes("ai offline");
}

function describeAction(toolName: string, result: unknown): string {
  const r = result as
    | {
        leadId?: string;
        status?: string;
        priority?: string;
        followUpId?: string;
        dueAt?: string;
        noteCharacters?: number;
        updated?: number;
        note?: string;
      }
    | null;
  switch (toolName) {
    case "update_lead_status":
      return `Done — lead ${r?.leadId ?? ""} is now marked "${r?.status ?? "updated"}".`;
    case "update_lead_priority":
      return `Done — lead ${r?.leadId ?? ""} is now priority "${r?.priority ?? "set"}".`;
    case "update_lead_notes":
      return `Done — notes saved on lead ${r?.leadId ?? ""} (${r?.noteCharacters ?? 0} characters).`;
    case "schedule_follow_up":
      return `Done — follow-up ${r?.followUpId ?? ""} scheduled for due ${new Date(r?.dueAt ?? "").toLocaleString()}.`;
    case "resolve_follow_up":
      return r?.updated === 0
        ? "Nothing to resolve — no follow-ups matched those ids."
        : `Done — marked ${r?.updated ?? 0} follow-up(s) as "${r?.status ?? "done"}".`;
    default:
      return "Done — the action was applied.";
  }
}

/** Module-level so the mount effect only registers a callback, not a setState. */
async function fetchHealth(): Promise<AgentHealth> {
  try {
    const res = await fetch("/api/admin/agent/health", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as AgentHealth | null;
    if (res.ok && data) return data;
    return {
      ok: false,
      error: data?.error || "Could not reach the AI service.",
      ...(data || {}),
    };
  } catch {
    return { ok: false, error: "Could not reach the AI service." };
  }
}

export function useAdminAgent() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<AgentHealth | null>(null);
  const [pending, setPending] = useState<PendingAction[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  /** Button-triggered recheck: clears the last result first, so the spinner shows. */
  const checkHealth = useCallback(() => {
    setHealth(null);
    void fetchHealth().then(setHealth);
  }, []);

  useEffect(() => {
    let active = true;
    void fetchHealth().then((h) => {
      if (active) setHealth(h);
    });
    return () => {
      active = false;
    };
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
    setMessages((prev) => prev.map((m) => (m.pending ? { ...m, pending: false } : m)));
  }, []);

  const reset = useCallback(() => {
    stop();
    setMessages([]);
    setPending([]);
    setError(null);
  }, [stop]);

  /** Executes a proposed write after the admin confirms it. */
  const confirmAction = useCallback(async (action: PendingAction) => {
    setPending((prev) => prev.filter((p) => p.id !== action.id));
    try {
      const res = await fetch("/api/admin/agent/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: action.toolName, args: action.args }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; result?: unknown; error?: string }
        | null;
      if (!res.ok || !data?.ok) {
        const message = data?.error || "The action failed.";
        setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: message, error: true }]);
        setError(message);
        return;
      }
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content: describeAction(action.toolName, data.result) },
      ]);
    } catch {
      const message = "The action failed.";
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: message, error: true }]);
      setError(message);
    }
  }, []);

  const cancelAction = useCallback((action: PendingAction) => {
    setPending((prev) => prev.filter((p) => p.id !== action.id));
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "assistant", content: `Cancelled ${action.toolName}.` },
    ]);
  }, []);

  /** Uploads a recording and returns the transcript. Never sends it. */
  const transcribe = useCallback(async (blob: Blob, language: string): Promise<string> => {
    const form = new FormData();
    form.append("audio", blob, "recording.webm");
    form.append("language", language);
    const res = await fetch("/api/admin/agent/transcribe", { method: "POST", body: form });
    const data = (await res.json().catch(() => null)) as { text?: string; error?: string } | null;
    if (!res.ok) throw new Error(data?.error || "Transcription failed.");
    return String(data?.text || "");
  }, []);

  const send = useCallback(
    async (text: string, mode: "text" | "voice" = "text") => {
      const trimmed = text.trim().slice(0, MAX_INPUT);
      if (!trimmed || sending) return;

      setError(null);
      const userMsg: AgentMessage = { id: nextId(), role: "user", content: trimmed };
      const pendingId = nextId();
      const pendingMsg: AgentMessage = {
        id: pendingId,
        role: "assistant",
        content: "",
        pending: true,
        tools: [],
      };
      setMessages((prev) => [...prev, userMsg, pendingMsg]);

      // Send committed history plus the new turn, oldest-first.
      const history = [...messages, userMsg]
        .slice(-HISTORY_WINDOW)
        .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_INPUT) }));

      const controller = new AbortController();
      abortRef.current = controller;
      setSending(true);

      const patchPending = (patch: (m: AgentMessage) => AgentMessage) =>
        setMessages((prev) => prev.map((m) => (m.id === pendingId ? patch(m) : m)));

      try {
        const res = await fetch("/api/admin/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, inputMode: mode }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as
            | { error?: string; health?: AgentHealth }
            | null;
          if (looksOffline(res.status, payload?.error) || payload?.health) {
            setHealth(payload?.health ?? { ok: false, error: "AI offline" });
          }
          throw new Error(
            res.status === 429
              ? "Too many requests. Please wait a moment."
              : payload?.error || "The request failed.",
          );
        }
        if (!res.body) throw new Error("The request failed.");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let text2 = "";
        let tools: AgentToolTrace[] = [];
        let failure: string | null = null;

        const handleLine = (line: string) => {
          const raw = line.trim();
          if (!raw) return;
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(raw);
          } catch {
            return;
          }
          switch (event.type) {
            case "text": {
              text2 += String(event.text ?? "");
              patchPending((m) => ({ ...m, content: text2 }));
              break;
            }
            case "tool-call": {
              const id = String(event.toolCallId || nextId());
              tools = [
                ...tools,
                {
                  id,
                  name: String(event.toolName || "tool"),
                  risk: event.risk ? String(event.risk) : undefined,
                  args: event.args,
                  status: "running",
                },
              ];
              patchPending((m) => ({ ...m, tools }));
              break;
            }
            case "tool-result": {
              const id = String(event.toolCallId || "");
              tools = tools.map((t) =>
                t.id === id ? { ...t, status: "ok", result: event.result } : t,
              );
              patchPending((m) => ({ ...m, tools }));
              break;
            }
            case "tool-error": {
              const id = String(event.toolCallId || "");
              tools = tools.map((t) =>
                t.id === id
                  ? { ...t, status: "error", error: String(event.error || "tool failed") }
                  : t,
              );
              patchPending((m) => ({ ...m, tools }));
              break;
            }
            case "error": {
              failure = String(event.message || "The model request failed.");
              break;
            }
            case "pending-action": {
              const id = String(event.actionId || nextId());
              setPending((prev) => [
                ...prev,
                {
                  id,
                  toolName: String(event.toolName || "action"),
                  risk: String(event.risk || "write"),
                  args: event.args,
                },
              ]);
              break;
            }
            case "done":
              break;
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            handleLine(buffer.slice(0, nl));
            buffer = buffer.slice(nl + 1);
          }
        }
        if (buffer) handleLine(buffer);

        if (failure) {
          patchPending((m) => ({ ...m, content: text2 || m.content, pending: false, error: true }));
          setError(failure);
        } else if (text2) {
          patchPending((m) => ({ ...m, content: text2, pending: false, tools }));
        } else {
          const empty = "The agent returned no answer.";
          patchPending((m) => ({ ...m, content: empty, pending: false, error: true, tools }));
          setError(empty);
        }
      } catch (err) {
        const aborted = err instanceof DOMException && err.name === "AbortError";
        if (aborted) {
          patchPending((m) =>
            m.content ? { ...m, pending: false } : { ...m, content: "Stopped.", pending: false },
          );
        } else {
          const message = err instanceof Error && err.message ? err.message : "The request failed.";
          patchPending((m) => ({ ...m, content: m.content || message, pending: false, error: true }));
          setError(message);
        }
      } finally {
        abortRef.current = null;
        setSending(false);
      }
    },
    [messages, sending],
  );

  return useMemo(
    () => ({
      messages,
      sending,
      error,
      health,
      pending,
      checkingHealth: health === null,
      send,
      transcribe,
      confirmAction,
      cancelAction,
      stop,
      reset,
      checkHealth,
    }),
    [
      messages,
      sending,
      error,
      health,
      pending,
      send,
      transcribe,
      confirmAction,
      cancelAction,
      stop,
      reset,
      checkHealth,
    ],
  );
}

export type AdminAgentApi = ReturnType<typeof useAdminAgent>;
