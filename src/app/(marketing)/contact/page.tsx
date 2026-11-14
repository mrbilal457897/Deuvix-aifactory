"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, MessageCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CharReveal } from "@/components/split-text";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const UNIT_LIST: string[] = [
  "Digital FTE Deployment",
  "AI Chatbots",
  "Voice Agents",
  "Custom Agents",
  "Loop Engineering",
  "FDE Consulting",
  "AI-Powered Web Apps",
  "AI Agent E-books",
  "Business AI Solutions",
  "Not sure yet",
];

const START_WHEN_LIST: string[] = ["ASAP", "1–2 months", "Just exploring"];

const VIA_LIST: string[] = ["Email", "WhatsApp", "Call"];

const SLOT_LIST: string[] = ["Morning", "Afternoon", "Evening"];

const CHANNEL_LIST: string[] = ["WhatsApp", "Website chat", "Phone calls", "Email", "CRM", "Spreadsheets"];

const OFFICE_HOURS = [
  { label: "Monday – Friday", value: "9:00 AM – 6:00 PM" },
  { label: "Saturday", value: "10:00 AM – 2:00 PM" },
  { label: "Sunday", value: "Closed" },
];

const QUICK_FILL_CHIPS = [
  "Automate lead follow-ups",
  "Answer customer calls",
  "Cut manual reporting",
  "Reply to WhatsApp enquiries",
];

function pakNow(): Date {
  return new Date(Date.now() + 5 * 60 * 60 * 1000);
}

function computeExpectedReplyAt(): string {
  const now = new Date(Date.now() + 5 * 60 * 60 * 1000);
  let expected = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (expected.getUTCDay() === 0) {
    expected = new Date(expected.getTime() + 24 * 60 * 60 * 1000);
  }
  return expected.toISOString();
}

function isOfficeHoursOpen(now: Date): boolean {
  const localHour = (now.getUTCHours() + 5) % 24;
  const day = now.getUTCDay();
  if (day >= 1 && day <= 5 && localHour >= 9 && localHour < 18) return true;
  if (day === 6 && localHour >= 10 && localHour < 14) return true;
  return false;
}

function computeLiveStatus(now: Date): { online: boolean; text: string } {
  const localHour = (now.getUTCHours() + 5) % 24;
  const day = now.getUTCDay();
  if (day >= 1 && day <= 5 && localHour >= 9 && localHour < 18) {
    return { online: true, text: "Team online now · usually replies within hours" };
  }
  if (day === 6 && localHour >= 10 && localHour < 14) {
    return { online: true, text: "Team online now · usually replies within hours" };
  }
  return { online: false, text: "Offline now · we reply next business day" };
}

type InquiryData = {
  units: string[];
  brief: string;
  channels: string[];
  startWhen: string | null;
  website: string | null;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  via: string;
  slot: string | null;
  nda: boolean;
};

type Step = 1 | 2;

type FieldErrors = Record<string, string>;

function PillChip({ children, active, onClick, disabled }: { children: React.ReactNode; active: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`btn-sharp inline-flex items-center gap-2 rounded-none border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-card border-border text-foreground/70 hover:text-foreground hover:border-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function TextField({ label, value, onChange, error, type = "text", placeholder, required }: { label: string; value: string; onChange: (v: string) => void; error?: string; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground/80 dark:text-white/80 mb-1 block uppercase tracking-[0.05em]">
        {label}{required ? " *" : ""}
      </label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 rounded-lg border bg-background dark:bg-white/10 border-border dark:border-white/20 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/40 focus:border-primary focus:outline-none"
        aria-invalid={Boolean(error)}
        required={required}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

function PillField({ label, options, value, onChange, multi, error, required = false, hint }: { label: string; options: string[]; value: string[]; onChange: (selected: string[]) => void; multi?: boolean; error?: string; required?: boolean; hint?: string }) {
  const isSelected = (v: string) => value.includes(v);
  const toggle = (v: string) => {
    if (isSelected(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      if (!multi && value.length > 0) {
        onChange([v]);
      } else {
        onChange([...value, v]);
      }
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-start">
        <label className="text-xs font-semibold text-foreground/80 dark:text-white/80 mb-1 block uppercase tracking-[0.05em]">
          {label}{required ? " *" : ""}
        </label>
        {hint && (
          <span className="text-xs text-muted-foreground dark:text-white/60">{hint}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <PillChip
            key={opt}
            active={isSelected(opt)}
            onClick={() => toggle(opt)}
            disabled={multi && value.includes("Not sure yet") && !isSelected(opt) && value.length > 0}
          >
            {opt}
          </PillChip>
        ))}
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

function ReviewCard({ data }: { data: InquiryData }) {
  return (
    <div className="rounded-xl border border-border dark:border-white/20 bg-card p-4">
      <h3 className="font-heading h3-lg text-foreground mb-3">Your request</h3>
      <div className="space-y-3 text-sm text-muted-foreground dark:text-white/70">
        <div className="flex justify-between">
          <span>Units</span>
          <span className="text-foreground font-medium">{data.units.join(", ")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Start when</span>
          <span className="text-foreground font-medium">{data.startWhen || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Reply via</span>
          <span className="text-foreground font-medium">{data.via}{data.slot ? ` · ${data.slot}` : ""}</span>
        </div>
        {data.nda && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">NDA requested</span>
            <span className="text-foreground font-medium">Yes</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

/** Plan names accepted from `?plan=` — anything else is ignored safely. */
const PLAN_OPTIONS = ["starter", "professional", "enterprise"] as const;

function ContactPageInner() {
  const searchParams = useSearchParams();
  const planParam = (searchParams.get("plan") || "").toLowerCase();
  const planInterest = (PLAN_OPTIONS as readonly string[]).includes(planParam)
    ? (planParam as (typeof PLAN_OPTIONS)[number])
    : null;
  const serviceParam = searchParams.get("service");
  const topicParam = searchParams.get("topic");
  const roleParam = searchParams.get("role");

  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<InquiryData>(() => {
    // `?service=<Unit>` preselects the matching pill — unknown values ignored.
    const matched = serviceParam
      ? UNIT_LIST.find((unit) => unit.toLowerCase() === serviceParam.toLowerCase())
      : undefined;
    const roleNote =
      topicParam === "careers" && roleParam
        ? `Applying for the ${roleParam} role.`
        : "";
    return {
      units: matched ? [matched] : [],
      brief: roleNote,
      channels: [],
      startWhen: null,
      website: null,
      name: "",
      email: "",
      company: null,
      phone: null,
      via: "Email",
      slot: null,
      nda: false,
    };
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [successId, setSuccessId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [pageLoadedAt, setPageLoadedAt] = useState<number | null>(null);

  useEffect(() => {
    setPageLoadedAt(Date.now());
  }, []);

  // Draft persistence
  useEffect(() => {
    try {
      localStorage.setItem("deuvix_contact_draft", JSON.stringify({ step, formData, updatedAt: Date.now() }));
    } catch {
      // ignore
    }
  }, [step, formData]);

  // Restore the draft only when the URL did not preselect anything — a direct
  // share like `/contact?service=AI Chatbots` must win over localStorage.
  const urlPreselected = Boolean(
    (serviceParam && UNIT_LIST.some((u) => u.toLowerCase() === serviceParam.toLowerCase())) ||
      (topicParam === "careers" && roleParam),
  );
  useEffect(() => {
    if (urlPreselected) return;
    try {
      const raw = localStorage.getItem("deuvix_contact_draft");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.formData && parsed.step) {
          setFormData(parsed.formData);
          setStep(parsed.step);
        }
      }
    } catch {
      // ignore
    }
  }, [urlPreselected]);

  // Live status pill
  const [liveStatus, setLiveStatus] = useState<{ online: boolean; text: string }>({ online: false, text: "Checking…" });

  useEffect(() => {
    const update = () => setLiveStatus(computeLiveStatus(pakNow()));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Validation
  function validateStep(stepNo: Step): boolean {
    const next: FieldErrors = {};
    if (stepNo === 1) {
      if (formData.units.length === 0) next.units = "Pick at least one unit to continue.";
      if (!formData.brief.trim()) next.brief = "Please add a short description (at least 15 characters).";
      else if (formData.brief.trim().length < 15) next.brief = "Please add a short description (at least 15 characters).";
    } else if (stepNo === 2) {
      if (!formData.name.trim()) next.name = "Please enter your name.";
      else if (formData.name.trim().length < 2) next.name = "Name must be at least 2 characters.";
      if (!formData.email.trim()) next.email = "Please enter your email.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email.trim())) next.email = "Please enter a valid email address.";
      if (formData.phone && !/^[\d\s\+\-]{7,20}$/.test(formData.phone)) next.phone = "Please enter a valid phone number.";
      if (formData.website && !/^https?:\/\/.+/.test(formData.website)) next.website = "Please enter a valid URL.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const canAdvance = step === 1 ? formData.units.length > 0 && formData.brief.trim().length >= 15 : true;

  const resetForm = () => {
    setFormData({
      units: [],
      brief: "",
      channels: [],
      startWhen: null,
      website: null,
      name: "",
      email: "",
      company: null,
      phone: null,
      via: "Email",
      slot: null,
      nda: false,
    });
    setErrors({});
    setSubmitError("");
    setSuccessId(null);
    setStep(1);
    setPageLoadedAt(Date.now());
    setSubmitStatus("idle");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(step)) return;
    if (step === 1) {
      setStep(2);
      return;
    }

    setSubmitStatus("submitting");
    setSubmitError("");

    // Append the plan interest / topic to the message so the team sees it,
    // keeping the form itself clean. The API allows max 500 chars in brief.
    const interestNote = [
      planInterest ? `Plan interest: ${planInterest[0].toUpperCase()}${planInterest.slice(1)}` : "",
      topicParam === "careers" && roleParam ? `Applying for: ${roleParam}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const briefOut = interestNote
      ? `${formData.brief.slice(0, Math.max(0, 500 - interestNote.length - 2))}\n\n${interestNote}`
      : formData.brief;
    const payload = {
      ...formData,
      brief: briefOut,
      pageLoadedAt,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        try { localStorage.removeItem("deuvix_contact_draft"); } catch {}
        setSuccessId(typeof data?.inquiryId === "string" ? data.inquiryId : null);
        setSubmitStatus("success");
      } else {
        setSubmitStatus("error");
        setSubmitError(
          data?.message || "Something went wrong. Your answers are saved — try again or email team.deuvix@gmail.com.",
        );
      }
    } catch {
      setSubmitStatus("error");
      setSubmitError("Network error. Your answers are saved — try again or email team.deuvix@gmail.com.");
    }
    // NOTE: no finally reset — success/error are terminal states the user must see.
  };

  const handleFieldChange = (key: string, value: string | string[] | boolean | null) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) {
      setErrors((prev) => { const next = { ...prev }; delete next[key as string]; return next; });
    }
  };

  // Wrapper for PillChip sourceDeux which expects (selected: string[]) => void
  const handleFieldChangeWrapper = (value: string[]) => {
    handleFieldChange("sourceDeux", value);
  };

  const briefCharCount = formData.brief.trim().length;

  const briefHint =
    briefCharCount === 0
      ? "Tip: say who it serves and roughly how many a week."
      : briefCharCount < 15
      ? "A little more detail helps us reply faster."
      : /\d/.test(formData.brief)
      ? "Great brief. That’s enough for a useful first reply."
      : "Nice. Adding a rough volume (e.g. 200 chats a week) sharpens our estimate.";

  // ---- Step 1 UI ----
  const step1Content = (
    <>
      <h2 className="font-heading h2-sm text-foreground dark:text-white mb-2">
        What should we build?
      </h2>
      {planInterest && (
        <p className="inline-flex items-center gap-2 mb-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
          Plan interest: {planInterest[0].toUpperCase()}{planInterest.slice(1)}
        </p>
      )}
      <p className="text-[14px] text-muted-foreground dark:text-white/70 mb-6">
        Pick your unit, then tell us about the job.
      </p>

      <div className="space-y-4">
        <PillField
          label="Pick your unit"
          options={UNIT_LIST}
          value={formData.units}
          onChange={(v) => {
            if (v.includes("Not sure yet")) {
              handleFieldChange("units", ["Not sure yet"]);
            } else if (formData.units.includes("Not sure yet")) {
              handleFieldChange("units", v);
            } else {
              handleFieldChange("units", v);
            }
          }}
          multi
          error={errors.units}
          required
          hint="Choose one or more"
        />

        <div className="space-y-1.5">
          <div className="flex justify-between items-start">
            <label className="text-xs font-semibold text-foreground/80 dark:text-white/80 mb-1 block uppercase tracking-[0.05em]">
              Describe the job *
            </label>
            <span className="text-xs font-mono text-muted-foreground dark:text-white/60">
              {briefCharCount} / 500
            </span>
          </div>
          <Textarea
            value={formData.brief}
            onChange={(e) => handleFieldChange("brief", e.target.value)}
            placeholder="Tell us about the job you want to build…"
            rows={4}
            maxLength={500}
            className="resize-none rounded-lg border bg-background dark:bg-white/10 border-border dark:border-white/20 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/40 focus:border-primary focus:outline-none"
          />
          <p className="text-xs leading-5 text-muted-foreground dark:text-white/60 flex items-center gap-1.5 mt-1.5">
            <span className="size-1.5 rounded-full bg-[#4CAF7D]" />
            {briefHint}
          </p>
          {errors.brief && <p className="text-xs text-destructive mt-1">{errors.brief}</p>}
        </div>

        <div className="space-y-1.5">
          <PillField
            label="Where does the work happen today?"
            options={CHANNEL_LIST}
            value={formData.channels}
            onChange={(selected) => handleFieldChange("channels", selected)}
            multi
            hint="Optional — choose one or more"
          />
        </div>

        <div className="space-y-1.5">
          <PillField
            label="When do you want to start?"
            options={START_WHEN_LIST}
            value={formData.startWhen ? [formData.startWhen] : []}
            onChange={(v) => handleFieldChange("startWhen", v[0] ?? null)}
            hint="Optional"
          />
        </div>

        <TextField
          label="Website or portfolio (optional)"
          value={formData.website || ""}
          onChange={(v) => handleFieldChange("website", v || null)}
          type="url"
          placeholder="https://yourwebsite.com"
        />

        <div className="border-t border-border mt-6 pt-6 flex justify-end items-start gap-4">
          <Button
            type="button"
            onClick={() => {
              if (!validateStep(1)) return;
              setStep(2);
            }}
            disabled={!canAdvance}
            className="bg-foreground text-background border-foreground px-6 py-3 font-medium hover:bg-foreground/90 disabled:opacity-50 disabled:pointer-events-none"
          >
            Next: your details →
          </Button>
        </div>
      </div>
    </>
  );

  const step2Content = (
    <>
      <h2 className="font-heading h2-sm text-foreground dark:text-white mb-2">
        Where do we reach you?
      </h2>
      <p className="text-[14px] text-muted-foreground dark:text-white/70 mb-6">
        We only use this to reply to your message.
      </p>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Full name"
            value={formData.name}
            onChange={(v) => handleFieldChange("name", v)}
            required
          />
          <TextField
            label="Email"
            value={formData.email}
            onChange={(v) => handleFieldChange("email", v)}
            type="email"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Company (optional)"
            value={formData.company || ""}
            onChange={(v) => handleFieldChange("company", v || null)}
          />
          <TextField
            label="WhatsApp / phone (optional)"
            value={formData.phone || ""}
            onChange={(v) => handleFieldChange("phone", v || null)}
            type="tel"
            placeholder="+92 3xx xxx xxxx"
          />
        </div>
        <div className="space-y-1.5">
          <PillField
            label="Preferred way to reply"
            options={VIA_LIST}
            value={formData.via ? [formData.via] : []}
            onChange={(v) => handleFieldChange("via", v[0] ?? "Email")}
          />
        </div>
        <div className="space-y-1.5">
          <PillField
            label="Best time (Pakistan time)"
            options={SLOT_LIST}
            value={formData.slot ? [formData.slot] : []}
            onChange={(v) => handleFieldChange("slot", v[0] ?? null)}
          />
        </div>
        <button
          type="button"
          onClick={() => handleFieldChange("nda", !formData.nda)}
          className={`btn-sharp w-full flex items-center gap-3 rounded-none border p-4 text-left transition-colors ${
            formData.nda
              ? "border-foreground bg-background/20"
              : "border-border text-foreground/60 hover:text-foreground hover:border-foreground"
          }`}
        >
          <span
            className={`size-5 rounded border flex items-center justify-center ${
              formData.nda ? "bg-foreground text-background border-foreground" : "border-border text-foreground/40"
            }`}
          >
            {formData.nda ? "✓" : ""}
          </span>
          <span className="text-sm font-medium text-foreground dark:text-white">
            I’d like to sign an NDA before sharing details
          </span>
        </button>
        <p className="text-xs text-muted-foreground dark:text-white/60">
          Free and no obligation. By sending, you agree to our{" "}
          <Link href="/privacy" className="text-foreground dark:text-white underline underline-offset-2 hover:text-primary">
            privacy policy
          </Link>
          .
        </p>
      </div>

      <div className="border-t border-border mt-8 pt-6 flex justify-between items-start gap-4">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="btn-sharp text-xs text-muted-foreground dark:text-white/60 hover:text-foreground underline underline-offset-4"
        >
          ← Back
        </button>
        <Button
          type="submit"
          disabled={submitStatus === "submitting"}
          className="bg-foreground text-background border-foreground px-6 py-3 font-medium hover:bg-foreground/90 disabled:opacity-50 disabled:pointer-events-none relative"
        >
          {submitStatus === "submitting" ? (
            <span className="flex items-center gap-2">
              Sending…
              <svg className="size-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.303V4.403a7.8 7.8 0 0115.8-3.702a7.36 7.36 0 010 5.704l-.001.001a7.36 7.36 0 01-15.8-3.702v5.701a7.8 7.8 0 0115.8 3.701z" />
              </svg>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Send my request →
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          )}
        </Button>
      </div>
    </>
  );

  return (
    <div className="relative min-h-[calc(100dvh-4rem)]">
      {/* Hero */}
      <section className="relative pt-8 sm:pt-12 pb-8">
        <div className="relative mx-auto max-w-7xl px-6 sm:px-6 lg:px-8 text-left">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Discuss" }]} className="mb-4 sm:mb-6" />
          <h1 className="font-heading h2-lg text-foreground dark:text-white mb-4 max-w-[760px]">
            Tell us what you want to automate.
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground dark:text-white/70 max-w-[560px] mb-8">
            Two quick steps. No sales pressure. A real person reads your message and replies
            within one business day with ideas and next steps.
          </p>
          <div className="flex items-center gap-3 text-sm text-muted-foreground dark:text-white/60">
            <span className="flex items-center gap-1 text-primary dark:text-secondary">✓</span>
            <span>Free first consultation</span>
            <span className="w-px h-3 bg-border dark:border-white/20 mx-3" />
            <span className="flex items-center gap-1 text-primary dark:text-secondary">✓</span>
            <span>Reply within 24 hours</span>
            <span className="w-px h-3 bg-border dark:border-white/20 mx-3" />
            <span className="flex items-center gap-1 text-primary dark:text-secondary">✓</span>
            <span>NDA on request</span>
          </div>
          <div className="mt-8 inline-flex items-center gap-2 rounded-xl border border-border dark:border-white/20 bg-card dark:bg-white/10 px-3 py-2">
            <span className="size-1.5 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-xs font-mono text-foreground dark:text-white">
              {liveStatus.online ? "Team online now · usually replies within hours" : "Offline now · we reply next business day"}
            </span>
          </div>
        </div>
      </section>

      {/* Main grid */}
      <section className="relative pb-[72px] px-6">
        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-[28px] items-start">
            {/* Left: Form card */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-border dark:border-white/20 bg-card dark:bg-white/10 p-[28px] sm:p-[30px] pb-[26px] min-h-[560px] flex flex-col">
                {submitStatus === "success" ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className="flex flex-1 flex-col items-center justify-center py-10 text-center"
                  >
                    <span className="flex size-14 items-center justify-center rounded-full bg-[#4CAF7D]/15 text-[#4CAF7D]">
                      <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                    <h2 className="font-heading h2-sm mt-5 text-foreground dark:text-white">
                      Request received
                    </h2>
                    <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-muted-foreground dark:text-white/70">
                      Thanks{formData.name ? `, ${formData.name.split(" ")[0]}` : ""} — we have your message. Someone from the team reads it personally and replies within one business day.
                    </p>
                    {successId ? (
                      <p className="mt-4 rounded-lg border border-border dark:border-white/20 px-3 py-1.5 font-mono text-xs text-muted-foreground dark:text-white/60">
                        Ref: {successId}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={resetForm}
                      className="btn-sharp mt-6 inline-flex items-center gap-2 border border-border dark:border-white/20 px-5 py-2.5 text-sm font-medium text-foreground dark:text-white transition-colors hover:bg-muted dark:hover:bg-white/10"
                    >
                      Send another request
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col">
                    {step === 1 ? step1Content : step2Content}
                    {submitStatus === "error" && submitError && (
                      <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                        {submitError}
                      </div>
                    )}
                  </form>
                )}
              </div>
            </div>

            {/* Right: Side column */}
            <div className="lg:col-span-5">
              {/* Contact cards */}
              <div className="mt-6 space-y-3">
                <div className="rounded-16 border border-border dark:border-white/20 bg-card dark:bg-white/10 p-4 flex items-start gap-3 cursor-pointer">
                  <div className="size-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0">
                    <MessageCircle className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-foreground dark:text-white">WhatsApp</div>
                    <div className="text-[12.5px] text-muted-foreground dark:text-white/60 leading-relaxed">Quick question? Chat now</div>
                  </div>
                  <span className="text-secondary text-xs ml-auto">→</span>
                </div>
                <div className="rounded-16 border border-border dark:border-white/20 bg-card dark:bg-white/10 p-4 flex items-start gap-3 cursor-pointer">
                  <div className="size-10 rounded-xl bg-[#4CAF7D] text-background flex items-center justify-center shrink-0">
                    <Phone className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-foreground dark:text-white">Book a call</div>
                    <div className="text-[12.5px] text-muted-foreground dark:text-white/60 leading-relaxed">Pick a slot yourself</div>
                  </div>
                  <span className="text-secondary text-xs ml-auto">→</span>
                </div>
                <div className="rounded-16 border border-border dark:border-white/20 bg-card dark:bg-white/10 p-4 flex items-start gap-3 cursor-pointer">
                  <div className="size-10 rounded-xl bg-[#4CAF7D] text-background flex items-center justify-center shrink-0">
                    <Mail className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-foreground dark:text-white">team.deuvix@gmail.com</div>
                    <div className="text-[12.5px] text-muted-foreground dark:text-white/60 leading-relaxed">Click to copy</div>
                  </div>
                  <span className="text-secondary text-xs ml-auto">→</span>
                </div>
              </div>

              {/* Office hours */}
              <div className="mt-6 rounded-2xl border border-border dark:border-white/20 bg-card dark:bg-white/10 p-4">
                <div className="mb-3">
                  <span className="text-xs font-mono text-muted-foreground dark:text-white/60 uppercase tracking-[0.05em]">
                    Office hours · PKT
                  </span>
                </div>
                {OFFICE_HOURS.map((row) => {
                  const now = pakNow();
                  const localHour = (now.getUTCHours() + 5) % 24;
                  const day = now.getUTCDay();
                  const isToday =
                    (day >= 1 && day <= 5 && row.label === "Monday – Friday") ||
                    (day === 6 && row.label === "Saturday") ||
                    (day === 0 && row.label === "Sunday");
                  const isOpen = isOfficeHoursOpen(now);
                  return (
                    <div
                      key={row.label}
                      className={`flex justify-between text-sm ${
                        isToday && isOpen
                          ? "text-foreground dark:text-white font-medium"
                          : "text-muted-foreground dark:text-white/60"
                      }`}
                    >
                      <span>{row.label}</span>
                      <span>{row.value}</span>
                    </div>
                  );
                })}
              </div>

              {/* Reassurance */}
              <div className="mt-6 rounded-2xl border border-border dark:border-white/20 bg-card dark:bg-white/10 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-[14px] font-medium text-foreground dark:text-white">🔒</span>
                  <div className="text-sm text-muted-foreground dark:text-white/70 leading-relaxed">
                    Your details stay private. We never share or sell your information.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <ContactPageInner />
    </Suspense>
  );
}