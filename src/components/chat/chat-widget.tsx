"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { company } from "@config/company";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const quickActions = [
  "What services do you offer?",
  "What is a Digital FTE?",
  "What are your pricing plans?",
  "How do I get started?",
];

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm the DEUX AI Factory assistant. I can help you learn about our AI solutions, services, pricing, or how to get started. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim().slice(0, 800);
    if (!trimmed) return;

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("rate-limited");
        }
        throw new Error("Chat request failed");
      }
      if (!res.body) throw new Error("Chat request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant" && last.content.length > 0) {
            next[next.length - 1] = {
              role: "assistant",
              content: last.content + chunk,
            };
          } else {
            next.push({ role: "assistant", content: chunk });
          }
          return next;
        });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err instanceof Error && err.message === "rate-limited"
              ? "You're sending messages a bit quickly. Give me a moment and try again."
              : `Sorry, I'm having trouble connecting right now. Please try again or email us at ${company.businessEmail}.`,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Dismiss on an outside click. A full-screen backdrop was deliberately avoided:
  // it would stop the page behind this floating panel from scrolling, and this is
  // a widget rather than a modal.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [isOpen]);

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 size-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all duration-200 flex items-center justify-center hover:scale-105"
        >
          <MessageCircle className="size-6" />
        </button>
      )}

      {isOpen && (
        <div
          ref={panelRef}
          className="chat-pop fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[520px] max-h-[calc(100svh-6rem)] rounded-2xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-primary flex items-center justify-center">
                <Sparkles className="size-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">DEUX AI Factory</h3>
                <p className="text-xs text-muted-foreground">Assistant · Online</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="size-11 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              aria-label="Close chat"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2.5",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="size-7 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="size-3.5 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  )}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="size-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="size-3.5" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2.5">
                <div className="size-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <Bot className="size-3.5 text-white" />
                </div>
                <div className="bg-muted rounded-xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="size-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="size-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="size-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
            <div className="px-4 pb-2">
              <div className="flex flex-wrap gap-1.5">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    onClick={() => sendMessage(action)}
                    className="px-3 py-1 text-xs rounded-full bg-primary/5 border border-primary/15 text-primary hover:bg-primary/10 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 border-t border-border">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Ask me anything..."
                maxLength={800}
                className="flex-1 rounded-xl"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isTyping}
                className="size-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
              >
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
