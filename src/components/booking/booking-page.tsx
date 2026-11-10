"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LogoLockup } from "@/components/brand/LogoLockup";
import { BookCallButton } from "@/components/book-call-button";
import { TimezoneSelect } from "@/components/booking/timezone-select";
import { LocalTime } from "@/components/booking/local-time";
import { buildBusinessChatLink } from "@/lib/notify/whatsapp";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  BOOKING_CONTACT_EMAIL,
  LANGUAGES,
  OUR_TIME_ZONE,
  ourHoursLabel,
} from "@/lib/booking/config";
import { bookingRequestSchema } from "@/lib/booking/schema";
import {
  DEFAULT_TIME_ZONE,
  addMonths,
  formatDateInZone,
  isValidTimeZone,
  monthDateKeys,
  monthLabel,
  zoneLabel,
  zoneShort,
  zonedTimeToUtcISO,
} from "@/lib/booking/time";

type Step = "pick" | "details" | "done";

interface DayAvailability {
  date: string;
  times: string[];
}

interface SlotsResponse {
  month?: string;
  timeZone?: string;
  days?: DayAvailability[];
  error?: string;
  message?: string;
}

interface BookingResponse {
  error?: string;
  message?: string;
  booking?: {
    uid: string;
    start: string;
    end: string | null;
    title: string | null;
    location: string | null;
    cancelUrl: string | null;
    rescheduleUrl: string | null;
  };
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/**
 * Reads the visitor's zone without a hydration mismatch and without a
 * setState-in-effect pass: the server always renders DEFAULT_TIME_ZONE, and
 * React swaps in the real zone on the client after hydration.
 */
const noopSubscribe = () => () => {};
const readBrowserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const readServerTimeZone = () => DEFAULT_TIME_ZONE;

/** Stable identity so a pending request doesn't churn memo deps each render. */
const NO_DAYS: DayAvailability[] = [];

/** Monday-first weekday index for a YYYY-MM-DD key. */
function mondayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun
  return (jsDay + 6) % 7;
}

function isPastDay(dateKey: string): boolean {
  const today = new Date();
  const todayKey = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(
    today.getUTCDate(),
  ).padStart(2, "0")}`;
  return dateKey < todayKey;
}

function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function BookingPage({
  initialMonth,
  eventTitle,
  durationMinutes,
  calBookingUrl,
  showEmbedFallback = false,
}: {
  initialMonth: string;
  eventTitle: string;
  durationMinutes: number;
  calBookingUrl: string;
  /** Shows the secondary Cal.com pop-up option. Only when a Cal origin/link exists. */
  showEmbedFallback?: boolean;
}) {
  const [month, setMonth] = useState(initialMonth);
  const browserZone = useSyncExternalStore(noopSubscribe, readBrowserTimeZone, readServerTimeZone);
  const [timeZoneOverride, setTimeZoneOverride] = useState<string | null>(null);
  const timeZone = timeZoneOverride ?? (isValidTimeZone(browserZone) ? browserZone : DEFAULT_TIME_ZONE);

  // Single result object keyed by request, so "loading" is derived rather than
  // toggled synchronously inside the effect.
  const [result, setResult] = useState<{ key: string; days: DayAvailability[]; error: string | null } | null>(
    null,
  );
  const requestKey = `${month}|${timeZone}`;
  const days = useMemo(
    () => (result?.key === requestKey ? result.days : NO_DAYS),
    [result, requestKey],
  );
  const slotsError = result?.key === requestKey ? result.error : null;
  const loading = result?.key !== requestKey;

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("pick");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [language, setLanguage] = useState<string>("en");
  /** Honeypot: hidden from humans, so any value means a bot. */
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<BookingResponse["booking"] | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/cal/slots?month=${month}&tz=${encodeURIComponent(timeZone)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        const body = (await res.json()) as SlotsResponse;
        if (!res.ok) throw new Error(body.message ?? "Could not load availability.");
        setResult({ key: requestKey, days: body.days ?? [], error: null });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResult({
          key: requestKey,
          days: [],
          error: err instanceof Error ? err.message : "Could not load availability.",
        });
      });

    return () => controller.abort();
  }, [month, timeZone, requestKey]);

  // Keep ?month= shareable, matching Calendly's URL shape.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("month") === month) return;
    url.searchParams.set("month", month);
    window.history.replaceState(null, "", url.toString());
  }, [month]);

  const availability = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const day of days) map.set(day.date, day.times);
    return map;
  }, [days]);

  const grid = useMemo(() => {
    const keys = monthDateKeys(month);
    const lead = mondayIndex(keys[0]);
    const cells: Array<string | null> = [...Array.from({ length: lead }, () => null), ...keys];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const visibleDays = useMemo(() => days.slice(0, 12), [days]);

  const chooseDay = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setFormError(null);
  }, []);

  const chooseTime = useCallback((time: string) => {
    setSelectedTime(time);
    setFormError(null);
    setStep("details");
  }, []);

  const submit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedDate || !selectedTime || !timeZone) return;

      const payload = {
        date: selectedDate,
        time: selectedTime,
        timeZone,
        name,
        email,
        whatsapp: whatsapp || undefined,
        company: company || undefined,
        notes: notes || undefined,
        language,
        companyWebsite: website,
        // Deliberately NOT sending lengthInMinutes: Cal.com rejects the whole
        // booking when the event type has a fixed length. The duration shown
        // on screen comes from our own copy; Cal.com uses its event length.
      };

      // Same schema the API enforces, so the visitor gets the error instantly.
      const check = bookingRequestSchema.safeParse(payload);
      if (!check.success) {
        setFormError(check.error.issues[0]?.message ?? "Please check your details.");
        return;
      }

      setSubmitting(true);
      setFormError(null);
      try {
        const res = await fetch("/api/cal/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await res.json()) as BookingResponse;

        if (!res.ok || !body.booking) {
          // Slot vanished between listing and booking -> send them back to pick.
          if (res.status === 409) {
            setStep("pick");
            setSelectedTime(null);
            setMonth((m) => m);
            setFormError(body.message ?? "That slot was just taken. Please pick another.");
          } else {
            setFormError(body.message ?? "Could not complete the booking.");
          }
          return;
        }

        setConfirmed(body.booking);
        setStep("done");
      } catch {
        setFormError("Network error. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [selectedDate, selectedTime, timeZone, name, email, whatsapp, company, notes, language, website],
  );

  const selectedTimes = selectedDate ? (availability.get(selectedDate) ?? []) : [];

  const businessChatLink = buildBusinessChatLink(
    "Hi! I'd like to book a call, but the listed times don't work for me.",
  );

  return (
    // Header is in the document flow, so no page-level header offset is needed.
    <div className="mx-auto w-full max-w-7xl overflow-x-clip px-6 sm:px-6 lg:px-8 pb-8 pt-8 sm:pt-12 sm:pb-14">
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: "Book a Call" }]}
        className="mb-4 sm:mb-6"
      />
      <div className="mx-auto max-w-5xl grid gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
        {/* ---------------- main column ---------------- */}
        <div className="min-w-0">
          <header className="mb-6">
            <p className="text-muted-foreground text-sm font-medium">Book a call</p>
            <h1 className="mt-1 h1 text-balance break-words">
              {eventTitle}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">{durationMinutes} minutes</p>
          </header>

          {step === "done" && confirmed ? (
            <Confirmation booking={confirmed} timeZone={timeZone} />
          ) : (
            <>
              {step === "details" && (
                <div className="mb-5 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep("pick")}
                    className="h-10 sm:h-7"
                  >
                    &larr; Back
                  </Button>
                  <p className="text-sm min-w-0 break-words">
                    <span className="font-medium">{formatDateInZone(confirmedStart(confirmed, selectedDate, selectedTime, timeZone), timeZone)}</span>
                    {selectedTime ? ` at ${fmtTime(selectedTime)}` : null}
                  </p>
                </div>
              )}

              {/* month + time zone */}
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Previous month"
                    className="size-9 shrink-0 sm:size-8"
                    onClick={() => setMonth((m) => addMonths(m, -1))}
                  >
                    &lsaquo;
                  </Button>
                  <span className="min-w-0 flex-1 truncate px-1 text-center text-sm font-medium sm:w-[9rem] sm:flex-none">
                    {monthLabel(month)}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Next month"
                    className="size-9 shrink-0 sm:size-8"
                    onClick={() => setMonth((m) => addMonths(m, 1))}
                  >
                    &rsquo;
                  </Button>
                </div>

                <TimezoneSelect
                  value={timeZone}
                  onChange={(next) => {
                    setTimeZoneOverride(next);
                    setSelectedDate(null);
                    setSelectedTime(null);
                  }}
                  className="w-full sm:w-[16rem]"
                />
              </div>

              {/* Which zone the slots are in, our hours, and two live clocks. */}
              <div className="text-muted-foreground mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span>Times shown in {zoneShort(timeZone)}.</span>
                <span>Our hours: {ourHoursLabel()}</span>
                <span>
                  Your local time now:{" "}
                  <LocalTime timeZone={timeZone} className="text-foreground font-medium" />
                </span>
                <span>
                  Our local time now:{" "}
                  <LocalTime timeZone={OUR_TIME_ZONE} className="text-foreground font-medium" />
                </span>
              </div>

              {/* calendar */}
              <div className="border-border w-full rounded-[min(var(--radius-lg),16px)] border">
                <div className="border-border grid grid-cols-7 border-b text-center text-xs font-medium">
                  {WEEKDAYS.map((d) => (
                    <div key={d} className="text-muted-foreground py-2">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {grid.map((dateKey, i) => {
                    if (!dateKey) return <div key={`pad-${i}`} />;
                    const times = availability.get(dateKey);
                    const open = Boolean(times?.length) && !isPastDay(dateKey);
                    const active = dateKey === selectedDate;
                    const day = Number(dateKey.slice(-2));
                    return (
                      <button
                        key={dateKey}
                        type="button"
                        disabled={!open}
                        onClick={() => chooseDay(dateKey)}
                        aria-pressed={active}
                        aria-label={formatDateInZone(`${dateKey}T12:00:00Z`, "UTC")}
                        className={[ "btn-sharp",
                          "relative flex h-14 min-w-0 flex-col items-center justify-center text-sm transition-colors sm:h-16",
                          open ? "hover:bg-muted cursor-pointer" : "text-muted-foreground/40 cursor-default",
                          active ? "bg-primary text-primary-foreground" : "",
                        ].join(" ")}
                      >
                        <span className={active ? "font-semibold" : ""}>{day}</span>
                        {open ? (
                          <span
                            className={`mt-1 h-1.5 w-1.5 rounded-full ${
                              active ? "bg-primary-foreground" : "bg-primary"
                            }`}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* escape hatch when none of the listed slots work */}
              <div className="border-border bg-muted/30 mt-4 rounded-[min(var(--radius-md),12px)] border p-3 text-sm">
                <p className="font-medium">Can&apos;t find a suitable time?</p>
                <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                  Tell us your window and we&apos;ll make it work:{" "}
                  <a
                    href={`mailto:${BOOKING_CONTACT_EMAIL}?subject=${encodeURIComponent("Call request")}`}
                    className="text-primary underline underline-offset-4"
                  >
                    email {BOOKING_CONTACT_EMAIL}
                  </a>
                  {businessChatLink ? (
                    <>
                      {" "}
                      or{" "}
                      <a
                        href={businessChatLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-4"
                      >
                        message us on WhatsApp
                      </a>
                    </>
                  ) : null}
                  .
                </p>
              </div>

              {slotsError ? (
                <div className="border-border bg-muted/40 mt-4 rounded-[min(var(--radius-md),12px)] border p-4 text-sm">
                  <p className="font-medium">{slotsError}</p>
                  <p className="text-muted-foreground mt-1">
                    You can also book directly on Cal.com:{" "}
                    <a className="text-primary underline underline-offset-4" href={calBookingUrl} target="_blank" rel="noopener noreferrer">
                      open the booking page
                    </a>
                  </p>
                </div>
              ) : loading ? (
                <p className="text-muted-foreground mt-4 text-sm">Loading availability&hellip;</p>
              ) : (
                <>
                  {/* day strip */}
                  {!selectedDate && (
                    <section className="mt-6">
                      <h2 className="mb-2 h3-lg">Available days</h2>
                      {visibleDays.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          No open days this month. Try the next one.
                        </p>
                      ) : (
                        <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-4 pb-2 sm:mx-0 sm:px-0">
                          {visibleDays.map((day) => (
                            <button
                              key={day.date}
                              type="button"
                              onClick={() => chooseDay(day.date)}
                              className="btn-sharp border-border hover:border-primary min-w-[4.5rem] shrink-0 snap-start rounded-none border px-2.5 py-2.5 text-left sm:min-w-[5.5rem] sm:px-3"
                            >
                              <span className="text-muted-foreground block text-xs">
                                {formatDateInZone(`${day.date}T12:00:00Z`, "UTC").split(",")[0]}
                              </span>
                              <span className="block text-sm font-medium">
                                {formatDateInZone(`${day.date}T12:00:00Z`, "UTC").split(",")[1]?.trim()}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                  {/* slots */}
                  {selectedDate && step === "pick" && (
                    <section className="mt-6">
                      <h2 className="mb-2 h3-lg">
                        {formatDateInZone(`${selectedDate}T12:00:00Z`, "UTC")}
                      </h2>
                      <div className="grid grid-cols-2 gap-2 min-[360px]:grid-cols-3 sm:flex sm:flex-wrap">
                        {selectedTimes.map((t) => (
                          <Button
                            key={t}
                            variant={selectedTime === t ? "default" : "outline"}
                            onClick={() => chooseTime(t)}
                            className="h-11 w-full sm:h-8 sm:w-auto"
                          >
                            {fmtTime(t)}
                          </Button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* details */}
                  {step === "details" && selectedDate && selectedTime && (
                    <form ref={formRef} onSubmit={submit} className="mt-6 space-y-3">
                      <h2 className="h3-lg">Your details</h2>
                      <Input
                        required
                        minLength={2}
                        maxLength={120}
                        placeholder="Full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                        className="h-11 sm:h-8"
                      />
                      <Input
                        required
                        type="email"
                        maxLength={200}
                        placeholder="Work email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        className="h-11 sm:h-8"
                      />
                      <Input
                        maxLength={32}
                        inputMode="tel"
                        placeholder="WhatsApp number (optional)"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        autoComplete="tel"
                        className="h-11 sm:h-8"
                      />
                      <Input
                        maxLength={160}
                        placeholder="Company (optional)"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        autoComplete="organization"
                        className="h-11 sm:h-8"
                      />
                      <Textarea
                        rows={3}
                        maxLength={2000}
                        placeholder="What would you like to automate?"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                      <label className="block">
                        <span className="text-muted-foreground mb-1 block text-xs">Preferred language</span>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="border-border bg-background text-foreground h-11 w-full rounded-[min(var(--radius-md),12px)] border px-2.5 text-sm sm:h-8"
                        >
                          {LANGUAGES.map((l) => (
                            <option key={l.code} value={l.code}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {/* Honeypot: hidden from people, irresistible to bots. */}
                      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                        <label>
                          Company website
                          <input
                            type="text"
                            tabIndex={-1}
                            autoComplete="off"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                          />
                        </label>
                      </div>

                      {formError ? (
                        <p className="text-sm text-red-500" role="alert">
                          {formError}
                        </p>
                      ) : null}

                      <Button type="submit" disabled={submitting} className="h-11 w-full sm:h-8 sm:w-auto">
                        {submitting ? "Confirming\u2026" : `Confirm booking`}
                      </Button>
                    </form>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* ---------------- summary sidebar ---------------- */}
        <aside className="h-fit min-w-0 md:sticky md:top-24">
          <div className="border-border bg-card rounded-[min(var(--radius-lg),16px)] border p-4 sm:p-5">
            <LogoLockup height={26} className="mb-4" />
            <p className="font-medium break-words">{eventTitle}</p>
            <dl className="text-muted-foreground mt-3 space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0">Duration</dt>
                <dd className="text-foreground min-w-0 text-right">{durationMinutes} min</dd>
              </div>
              {selectedDate && selectedTime ? (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0">When</dt>
                  <dd className="text-foreground min-w-0 text-right break-words">
                    {formatDateInZone(confirmedStart(confirmed, selectedDate, selectedTime, timeZone), timeZone)}
                    <br />
                    {fmtTime(selectedTime)}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0">Time zone</dt>
                <dd
                  className="text-foreground min-w-0 text-right break-words"
                  title={timeZone}
                >
                  {zoneLabel(timeZone)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0">Your time now</dt>
                <dd className="text-foreground min-w-0 text-right">
                  <LocalTime timeZone={timeZone} />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0">Our hours</dt>
                <dd className="text-foreground min-w-0 text-right break-words">
                  {ourHoursLabel()}
                  <br />
                  <span className="text-muted-foreground text-xs">
                    now <LocalTime timeZone={OUR_TIME_ZONE} />
                  </span>
                </dd>
              </div>
            </dl>
            {step !== "done" ? (
              <p className="text-muted-foreground mt-4 border-t pt-4 text-xs">
                A confirmation email and WhatsApp link will be sent to you.
              </p>
            ) : null}
          </div>

          {showEmbedFallback ? (
            <div className="mt-3 rounded-[min(var(--radius-lg),16px)] border border-dashed p-4 text-center">
              <p className="text-muted-foreground text-xs">
                Rather book in Cal.com&apos;s own scheduler?
              </p>
              <BookCallButton
                mode="modal"
                variant="outline"
                size="sm"
                className="mt-2 w-full"
              >
                Open the pop-up
              </BookCallButton>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

/** Best-effort instant for the chosen slot; used only for display. */
function confirmedStart(
  booking: BookingResponse["booking"] | null,
  date: string | null,
  time: string | null,
  timeZone: string,
): string {
  if (booking?.start) return booking.start;
  if (date && time) return zonedTimeToUtcISO(date, time, timeZone);
  return new Date().toISOString();
}

function Confirmation({
  booking,
  timeZone,
}: {
  booking: NonNullable<BookingResponse["booking"]>;
  timeZone: string;
}) {
  // Pure derivation from build-time env, so no state or effect is needed.
  const calOrigin = process.env.NEXT_PUBLIC_CAL_ORIGIN ?? "";
  const calAdd =
    booking.uid && calOrigin ? `${calOrigin}/api/link?uid=${encodeURIComponent(booking.uid)}` : null;

  return (
    <div className="space-y-4">
      <div className="border-primary/40 bg-primary/5 rounded-[min(var(--radius-lg),16px)] border p-5 sm:p-6">
        <h2 className="h2-sm">You&apos;re booked</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Your slot is confirmed and a confirmation email is on its way.
        </p>
        <p className="mt-4 text-sm break-words">
          <span className="font-medium">{formatDateInZone(booking.start, timeZone)}</span>
        </p>
        <ul className="text-muted-foreground mt-3 list-disc space-y-1 pl-5 text-sm">
          <li>Check your inbox for the confirmation and meeting details.</li>
          <li>Use &ldquo;Add to calendar&rdquo; below to drop it into your diary.</li>
          <li>Need to move it? Reschedule or cancel with the links below.</li>
        </ul>
        {booking.location ? (
          <p className="mt-3">
            <a
              className="text-primary underline underline-offset-4 break-all"
              href={booking.location}
              target="_blank"
              rel="noopener noreferrer"
            >
              Meeting link
            </a>
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {calAdd ? (
            <a
              href={calAdd}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm", className: "h-10 w-full sm:h-7 sm:w-auto" })}
            >
              Add to calendar
            </a>
          ) : null}
          {booking.rescheduleUrl ? (
            <a
              href={booking.rescheduleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "ghost", size: "sm", className: "h-10 w-full sm:h-7 sm:w-auto" })}
            >
              Reschedule
            </a>
          ) : null}
          {booking.cancelUrl ? (
            <a
              href={booking.cancelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "ghost", size: "sm", className: "h-10 w-full sm:h-7 sm:w-auto" })}
            >
              Cancel
            </a>
          ) : null}
        </div>
      </div>
      <BookingRow />
    </div>
  );
}

/** Eager WhatsApp hand-off on the confirmation screen. */
function BookingRow() {
  const link = buildBusinessChatLink("Hi! I just booked a call on your website.");
  if (!link) return null;
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({ variant: "outline", className: "h-10 w-full sm:h-8 sm:w-auto" })}
    >
      Continue on WhatsApp
    </a>
  );
}