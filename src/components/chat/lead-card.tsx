"use client";

import { useState } from "react";
import { Send, CheckCircle2, Loader2, Users } from "lucide-react";
import { uiStrings } from "@/lib/chat/ui-strings";
import { cn } from "@/lib/utils";

type Errors = Partial<Record<"name" | "contact" | "summary" | "consent" | "form", string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[0-9][0-9\s\-().]{7,19}$/;

export function LeadCard({ className }: { className?: string }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [summary, setSummary] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");

  const validate = (): Errors => {
    const next: Errors = {};
    if (name.trim().length < 2) next.name = uiStrings.leadValidation.name;
    const c = contact.trim();
    if (c.length < 5 || !(EMAIL.test(c) || PHONE.test(c)))
      next.contact = uiStrings.leadValidation.contact;
    if (summary.trim().length < 10) next.summary = uiStrings.leadValidation.summary;
    if (!consent) next.consent = uiStrings.leadValidation.consent;
    return next;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setState("sending");
    try {
      const res = await fetch("/api/chat/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, summary, consent }),
      });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.ok) {
        setState("done");
        return;
      }
      if (payload?.field) setErrors({ [payload.field]: payload.message } as Errors);
      else setErrors({ form: payload?.message || uiStrings.leadError });
    } catch {
      setErrors({ form: uiStrings.leadError });
    }
    setState("idle");
  };

  if (state === "done") {
    return (
      <div className={cn("rounded-xl border border-primary/30 bg-primary/8 p-4 text-center", className)}>
        <CheckCircle2 className="mx-auto mb-2 size-6 text-primary" />
        <p className="text-sm font-medium">{uiStrings.leadSuccess}</p>
      </div>
    );
  }

  const fieldClass = (bad?: string) =>
    cn(
      "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60",
      bad ? "border-destructive/70 focus-visible:border-destructive" : "border-border focus-visible:border-primary/60",
    );

  return (
    <form onSubmit={submit} noValidate className={cn("rounded-xl border border-border bg-muted/40 p-3.5", className)}>
      <div className="mb-3 flex items-center gap-2">
        <Users className="size-4 text-primary" />
        <div>
          <p className="text-sm font-semibold leading-tight">{uiStrings.leadCardTitle}</p>
          <p className="text-xs leading-tight text-muted-foreground">{uiStrings.leadCardBody}</p>
        </div>
      </div>

      <div className="space-y-2.5">
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={uiStrings.leadName}
            aria-label={uiStrings.leadName}
            aria-invalid={Boolean(errors.name)}
            maxLength={80}
            className={fieldClass(errors.name)}
          />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
        </div>

        <div>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={uiStrings.leadContact}
            aria-label={uiStrings.leadContact}
            aria-invalid={Boolean(errors.contact)}
            maxLength={120}
            className={fieldClass(errors.contact)}
          />
          {errors.contact && <p className="mt-1 text-xs text-destructive">{errors.contact}</p>}
        </div>

        <div>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={uiStrings.leadSummary}
            aria-label={uiStrings.leadSummary}
            aria-invalid={Boolean(errors.summary)}
            rows={3}
            maxLength={500}
            className={cn(fieldClass(errors.summary), "resize-none")}
          />
          {errors.summary && <p className="mt-1 text-xs text-destructive">{errors.summary}</p>}
        </div>

        <label className="flex cursor-pointer items-start gap-2 text-xs leading-snug">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 size-3.5 shrink-0 accent-[#4CAF7D]"
          />
          <span className={cn(errors.consent && "text-destructive")}>{uiStrings.leadConsent}</span>
        </label>
        {errors.consent && <p className="text-xs text-destructive">{errors.consent}</p>}

        {errors.form && <p className="text-xs text-destructive">{errors.form}</p>}

        <button
          type="submit"
          disabled={state === "sending"}
          className="btn-sharp inline-flex h-9 w-full items-center justify-center gap-2 rounded-none bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-60"
        >
          {state === "sending" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {uiStrings.leadSending}
            </>
          ) : (
            <>
              <Send className="size-4" />
              {uiStrings.leadSubmit}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
