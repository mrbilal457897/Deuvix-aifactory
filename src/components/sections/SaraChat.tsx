"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowUp } from "lucide-react";
import styles from "./hero.module.css";

/**
 * Sara — scripted demo chat (not a live model). Auto-plays the appointment
 * flow once on mount; cancels on any user interaction (chip click or input focus).
 */

type Msg = {
  id: number;
  from: "bot" | "user";
  text: string;
  time: string;
};

type Stage =
  | "greet"          // greeting shown, chips = main topics
  | "asked-day"      // user asked to book → waiting for day
  | "asked-time"     // day picked → waiting for time
  | "booked";        // appointment confirmed

const MAIN_CHIPS = ["Book an appointment", "What do you do?", "Pricing"];
const DAY_CHIPS = ["Today", "Tomorrow", "Next week"];
const TIME_CHIPS = ["10:00 AM", "2:30 PM", "4:00 PM"];
const BOOKED_CHIPS = ["See how it works", "Book another"];

function botReply(text: string): { reply: string; chips: string[]; stage: Stage } {
  const q = text.toLowerCase();

  if (/\b(book|appointment|meet|call|demo|sche)\b/.test(q)) {
    return {
      reply: "Sure — what day works for you?",
      chips: DAY_CHIPS,
      stage: "asked-day",
    };
  }
  if (/(today|tomorrow|next week|monday|tuesday|wednesday|thursday|friday)/.test(q)) {
    return {
      reply: "Great. What time?",
      chips: TIME_CHIPS,
      stage: "asked-time",
    };
  }
  if (/(am|pm|\d{1,2}:\d{2})/.test(q)) {
    return {
      reply: "Booked. I've held that slot for you — a calendar invite is on its way to your inbox.",
      chips: BOOKED_CHIPS,
      stage: "booked",
    };
  }
  if (/(price|pricing|cost|rate|fee|charge)/.test(q)) {
    return {
      reply: "Pricing is scoped per engagement — most deployments start with a single Digital FTE and a flat monthly retainer. Want me to book a call?",
      chips: MAIN_CHIPS,
      stage: "greet",
    };
  }
  if (/(what|service|do|help|offer|build|ai)/.test(q)) {
    return {
      reply: "We manufacture, deploy and monetize Digital FTEs — AI workers that run production workflows 24/7. Want to see a live one, or book a call?",
      chips: MAIN_CHIPS,
      stage: "greet",
    };
  }
  if (/(hi|hello|hey)/.test(q)) {
    return {
      reply: "Hey! Great to meet you. What brings you here today?",
      chips: MAIN_CHIPS,
      stage: "greet",
    };
  }
  if (/(human|agent|person|real)/.test(q)) {
    return {
      reply: "Every agent is human-gated — nothing ships without your sign-off. Want to talk to the team? I can book a call.",
      chips: MAIN_CHIPS,
      stage: "greet",
    };
  }
  return {
    reply: "I can help with booking a call, pricing, or what we build. Try a chip above or type something specific.",
    chips: MAIN_CHIPS,
    stage: "greet",
  };
}

function timeNow(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function SaraChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [chips, setChips] = useState<string[]>(MAIN_CHIPS);
  const [stage, setStage] = useState<Stage>("greet");
  const [input, setInput] = useState("");

  const msgsRef = useRef<HTMLDivElement>(null);
  const autoplayTimers = useRef<number[]>([]);
  const nextId = useRef(1);
  const reducedMotion = useRef(false);

  const pushBot = useCallback((text: string, nextStage: Stage = "greet") => {
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, from: "bot", text, time: timeNow() },
    ]);
    setStage(nextStage);
  }, []);

  const sendUser = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, from: "user", text: trimmed, time: timeNow() },
    ]);
    setInput("");
    const { reply, chips: nextChips, stage: nextStage } = botReply(trimmed);
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, from: "bot", text: reply, time: timeNow() },
      ]);
      setChips(nextChips);
      setStage(nextStage);
    }, 450);
  }, []);

  const stopAutoplay = useCallback(() => {
    autoplayTimers.current.forEach((t) => window.clearTimeout(t));
    autoplayTimers.current = [];
  }, []);

  // Auto-play the demo once on mount (skipped for reduced-motion users).
  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const greetTimer = window.setTimeout(() => {
      pushBot(
        "Hi, I'm Sara — your AI assistant here. Ask me anything, or tap Book to schedule a call.",
        "greet"
      );
    }, 500);
    autoplayTimers.current.push(greetTimer);

    if (reducedMotion.current) {
      return stopAutoplay;
    }

    const seq: Array<[string, number]> = [
      ["Book an appointment", 1600],
      ["Tomorrow", 3600],
      ["2:30 PM", 5400],
    ];
    let elapsed = 0;
    for (const [text, at] of seq) {
      const t = window.setTimeout(() => {
        // only advance if the user hasn't taken over
        setMessages((prev) => {
          if (prev.some((m) => m.from === "user")) return prev;
          return [
            ...prev,
            { id: nextId.current++, from: "user", text, time: timeNow() },
          ];
        });
        window.setTimeout(() => {
          setMessages((prev) => {
            if (prev.some((m) => m.from === "user" && m.text === text)) {
              const { reply, chips: nextChips, stage: nextStage } = botReply(text);
              setChips(nextChips);
              setStage(nextStage);
              return [
                ...prev,
                { id: nextId.current++, from: "bot", text: reply, time: timeNow() },
              ];
            }
            return prev;
          });
        }, 450);
      }, at);
      autoplayTimers.current.push(t);
      elapsed = at;
    }
    void elapsed;

    return stopAutoplay;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom whenever messages change.
  useEffect(() => {
    const el = msgsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div className={styles.chat} role="tabpanel" aria-label="Sara AI Assistant preview">
      {/* header */}
      <div className={styles.chatHead}>
        <div className={styles.avatar} aria-hidden="true">
          S
        </div>
        <div className={styles.chatHeadText}>
          <span className={styles.chatName}>Sara AI Assistant</span>
          <span className={styles.chatStatus}>
            <span className={styles.onlineDot} aria-hidden="true" /> Online
          </span>
        </div>
        <Link href="/book-a-call" className={styles.tryFree}>
          Try Free Today
        </Link>
      </div>

      {/* messages (internal scroll only) */}
      <div className={styles.msgs} ref={msgsRef} aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`${styles.msg} ${m.from === "bot" ? styles.msgBot : styles.msgUser}`}>
            {m.text}
          </div>
        ))}
      </div>

      {/* chips */}
      {chips.length > 0 ? (
        <div className={styles.chips} aria-label="Suggested replies">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className={styles.chip}
              onClick={() => sendUser(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}

      {/* input bar */}
      <form
        className={styles.inputBar}
        onSubmit={(e) => {
          e.preventDefault();
          sendUser(input);
        }}
      >
        <input
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={stopAutoplay}
          placeholder="Type a message…"
          aria-label="Type a message to Sara"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className={styles.sendBtn} aria-label="Send message">
          <ArrowUp size={16} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
