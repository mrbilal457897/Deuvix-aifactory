"use client";

/**
 * Client side of the chat protocol.
 *
 * - Guests keep history in sessionStorage and send it back with each request.
 * - Logged-in users let the server own history; only the conversation id is kept.
 * - The stream is JSON-lines, so a partial line is buffered until its newline.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uiStrings } from "@/lib/chat/ui-strings";

export type Role = "user" | "assistant";

export interface ChatSource {
  title: string;
  url: string;
  source: "deux" | "agentfactory";
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  sources?: ChatSource[];
  /** True while the assistant turn is still streaming. */
  pending?: boolean;
  /** Set when the request failed and the user can retry. */
  error?: boolean;
}

export interface ChatState {
  messages: ChatMessage[];
  sending: boolean;
  ended: boolean;
  route: string | null;
  conversationId: string | null;
  error: string | null;
}

const GUEST_HISTORY_MAX = 12;
const HISTORY_KEY = "deux-chat-guest";
const SESSION_KEY = "deux-chat-session";
const CONVERSATION_KEY = "deux-chat-conversation";

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function readJSON<T>(key: string, fallback: T): T {
  const store = safeStorage();
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  const store = safeStorage();
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — the chat still works, it just won't be saved */
  }
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `m${Date.now().toString(36)}-${idCounter}`;
}

function greetingMessage(): ChatMessage {
  return { id: "greeting", role: "assistant", content: uiStrings.greeting };
}

/** Read the guest session once, during the first render, before any effect. */
function loadGuestState() {
  const empty = { sessionId: "", history: [] as ChatMessage[], conversationId: null as string | null };
  const store = safeStorage();
  if (!store) return empty;

  let sessionId = store.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    store.setItem(SESSION_KEY, sessionId);
  }

  const stored = readJSON<ChatMessage[]>(HISTORY_KEY, []);
  const history = Array.isArray(stored)
    ? stored.filter((m) => m && m.content && !m.pending)
    : [];

  return {
    sessionId,
    history,
    conversationId: store.getItem(CONVERSATION_KEY),
  };
}

export function useChat() {
  const [boot] = useState(loadGuestState);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    greetingMessage(),
    ...boot.history.slice(-24),
  ]);
  const [sending, setSending] = useState(false);
  const [ended, setEnded] = useState(false);
  const [route, setRoute] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(boot.conversationId);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string>(boot.sessionId);

  /* ---- persistence of guest history ------------------------------------- */
  useEffect(() => {
    const trimmed = messages.filter((m) => m.id !== "greeting" && !m.pending).slice(-GUEST_HISTORY_MAX);
    if (trimmed.length === 0) return;
    writeJSON(HISTORY_KEY, trimmed);
  }, [messages]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
    setMessages((prev) => prev.map((m) => (m.pending ? { ...m, pending: false } : m)));
  }, []);

  const startNewChat = useCallback(() => {
    stop();
    setMessages([greetingMessage()]);
    setEnded(false);
    setRoute(null);
    setError(null);
    const store = safeStorage();
    if (store) {
      store.removeItem(HISTORY_KEY);
      store.removeItem(CONVERSATION_KEY);
      // Keep the guest session id — rate limits are per session, not per tab.
    }
    setConversationId(null);
  }, [stop]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim().slice(0, 4000);
      if (!trimmed || sending || ended) return;

      setError(null);

      const userMsg: ChatMessage = { id: nextId(), role: "user", content: trimmed };
      const pendingMsg: ChatMessage = { id: nextId(), role: "assistant", content: "", pending: true };

      setMessages((prev) => [...prev, userMsg, pendingMsg]);

      // History is taken from the committed list, not the optimistic one.
      const history = messages
        .filter((m) => m.id !== "greeting" && !m.pending)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 1200) }));

      const controller = new AbortController();
      abortRef.current = controller;
      setSending(true);

      const applyUpdate = (fn: (prev: ChatMessage[]) => ChatMessage[]) => setMessages(fn);

      const replacePending = (patch: Partial<ChatMessage> & { content: string }) =>
        applyUpdate((prev) =>
          prev.map((m) => (m.id === pendingMsg.id ? { ...m, ...patch } : m)),
        );

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            sessionId: sessionIdRef.current || undefined,
            conversationId: conversationId || undefined,
            history,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(
            res.status === 429
              ? uiStrings.rateLimited
              : payload?.error || uiStrings.networkError,
          );
        }
        if (!res.body) throw new Error(uiStrings.networkError);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let text = "";
        let sources: ChatSource[] | undefined;
        let newRoute: string | null = null;
        let strikes = 0;
        let newConversationId: string | null = null;
        let endedEvent = false;
        let failure: string | null = null;

        const handleLine = (line: string) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(trimmedLine);
          } catch {
            return;
          }
          switch (event.type) {
            case "meta": {
              newRoute = (event.route as string) || null;
              sources = (event.sources as ChatSource[]) || [];
              strikes = (event.abuseStrikes as number) || 0;
              newConversationId = (event.conversationId as string | null) || null;
              endedEvent = Boolean(event.ended);
              break;
            }
            case "token": {
              text += String(event.text ?? "");
              replacePending({ content: text });
              break;
            }
            case "error": {
              failure = String(event.message || uiStrings.modelError);
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
          replacePending({ content: failure, pending: false, error: true });
          setError(failure);
        } else if (text) {
          replacePending({ content: text, pending: false, sources });
        } else {
          replacePending({ content: uiStrings.emptyAnswer, pending: false, error: true });
          setError(uiStrings.emptyAnswer);
        }

        if (newRoute) setRoute(newRoute);
        if (strikes > 0 && endedEvent) setEnded(true);
        if (newConversationId) {
          setConversationId(newConversationId);
          const store = safeStorage();
          if (store) store.setItem(CONVERSATION_KEY, newConversationId);
        }
        if (endedEvent) setEnded(true);
      } catch (err) {
        const aborted = err instanceof DOMException && err.name === "AbortError";
        if (aborted) {
          applyUpdate((prev) =>
            prev.map((m) =>
              m.id === pendingMsg.id
                ? m.content
                  ? { ...m, pending: false }
                  : { ...m, content: uiStrings.stopped || "Stopped.", pending: false }
                : m,
            ),
          );
        } else {
          const message = err instanceof Error && err.message ? err.message : uiStrings.networkError;
          replacePending({ content: message, pending: false, error: true });
          setError(message);
        }
      } finally {
        abortRef.current = null;
        setSending(false);
      }
    },
    [sending, ended, messages, conversationId],
  );


  const api = useMemo(
    () => ({
      messages,
      sending,
      ended,
      route,
      conversationId,
      error,
      send,
      stop,
      startNewChat,
    }),
    [messages, sending, ended, route, conversationId, error, send, stop, startNewChat],
  );

  return api;
}

export type ChatApi = ReturnType<typeof useChat>;
