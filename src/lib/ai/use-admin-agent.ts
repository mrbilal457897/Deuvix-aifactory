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
    setError(null);
  }, [stop]);

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
    async (text: string) => {
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
          body: JSON.stringify({ messages: history, inputMode: "text" }),
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
      checkingHealth: health === null,
      send,
      transcribe,
      stop,
      reset,
      checkHealth,
    }),
    [messages, sending, error, health, send, transcribe, stop, reset, checkHealth],
  );
}

export type AdminAgentApi = ReturnType<typeof useAdminAgent>;
