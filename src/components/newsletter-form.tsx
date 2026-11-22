"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type State = "idle" | "loading" | "success" | "error";

/** Compact footer subscribe form. Double opt-in happens entirely server-side. */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "loading") return;
    setState("loading");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer", _website: website }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setState("error");
        setMessage(data.message || "Something went wrong. Please try again.");
        return;
      }
      setState("success");
      setMessage("Check your inbox to confirm your subscription.");
      setEmail("");
    } catch {
      setState("error");
      setMessage("Could not reach the server. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4" noValidate>
      <label htmlFor="newsletter-email" className="sr-only">
        Email address for the newsletter
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="newsletter-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          maxLength={120}
          placeholder="you@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (state !== "idle") {
              setState("idle");
              setMessage("");
            }
          }}
          className="h-10 flex-1 bg-background text-sm"
          aria-describedby="newsletter-status"
        />
        {/* Honeypot: hidden from users and assistive tech. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="newsletter-website">Website</label>
          <input
            id="newsletter-website"
            name="_website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>
        <Button type="submit" size="sm" disabled={state === "loading"} className="shrink-0">
          {state === "loading" ? "Subscribing…" : "Subscribe"}
        </Button>
      </div>
      <p
        id="newsletter-status"
        role="status"
        aria-live="polite"
        className={`mt-2 text-xs ${
          state === "error"
            ? "text-destructive"
            : state === "success"
              ? "text-primary"
              : "text-muted-foreground"
        }`}
      >
        {message || "Occasional updates. Unsubscribe any time."}
      </p>
    </form>
  );
}
