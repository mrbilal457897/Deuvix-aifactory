"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { ChatWindow, LauncherGreeting } from "@/components/chat/chat-window";
import { useChat } from "@/lib/chat/use-chat";
import { uiStrings } from "@/lib/chat/ui-strings";

const GREETING_SEEN = "deuvix-chat-greeting-seen";
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Chat() {
  const [open, setOpen] = useState(false);
  const [greeting, setGreeting] = useState(false);

  const api = useChat();
  const windowRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const wasOpen = useRef(false);

  /* ---- first-visit greeting -------------------------------------------- */
  useEffect(() => {
    let seen = false;
    try {
      seen = Boolean(sessionStorage.getItem(GREETING_SEEN));
    } catch {
      seen = true;
    }
    if (seen) return;
    const t = window.setTimeout(() => setGreeting(true), 4500);
    return () => window.clearTimeout(t);
  }, []);

  const dismissGreeting = useCallback(() => {
    setGreeting(false);
    try {
      sessionStorage.setItem(GREETING_SEEN, "1");
    } catch {
      /* ignore */
    }
  }, []);

  /* ---- open: focus inside; close: focus back on the launcher ------------- */
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      const t = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      openerRef.current?.focus();
    }
  }, [open]);

  /* ---- focus trap + Escape --------------------------------------------- */
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (greeting) dismissGreeting();
        else setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;

      const container = windowRef.current;
      if (!container) return;
      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && (active === first || !container.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !container.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, greeting, dismissGreeting]);

  const openChat = useCallback(() => {
    if (greeting) dismissGreeting();
    setOpen(true);
  }, [greeting, dismissGreeting]);

  const close = useCallback(() => {
    api.stop();
    setOpen(false);
  }, [api]);

  /* ---- click outside closes ------------------------------------------- */
  // A backdrop div was rejected: covering the page would stop the user from
  // scrolling or reading while the chat is open, and the panel is deliberately
  // floating rather than modal. A document listener gives the same dismissal
  // without intercepting anything behind it.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (windowRef.current?.contains(target)) return;
      // Radix dropdown content renders in a portal outside the dialog, so a
      // click on a menu item must not be mistaken for an outside click.
      if (target.closest('[role="menu"], [data-radix-popper-content-wrapper]')) return;
      close();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, close]);

  return (
    <>
      {greeting && !open && <LauncherGreeting onDismiss={dismissGreeting} />}

      {!open && (
        <button
          ref={openerRef}
          type="button"
          onClick={openChat}
          aria-label={uiStrings.launcherLabel}
          aria-expanded={open}
          className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-105 hover:bg-primary/90"
        >
          <MessageCircle className="size-6" />
        </button>
      )}

      {open && <ChatWindow api={api} windowRef={windowRef} inputRef={inputRef} onClose={close} />}
    </>
  );
}
