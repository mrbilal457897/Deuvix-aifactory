"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrandLogo } from "@/components/brand-logo";
import { buildBusinessChatLink } from "@/lib/notify/whatsapp";
import {
  DEFAULT_TIME_ZONE,
  TIME_ZONES,
  addMonths,
  formatDateInZone,
  isValidTimeZone,
  monthDateKeys,
  monthLabel,
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
}: {
  initialMonth: string;
  eventTitle: string;
  durationMinutes: number;
  calBookingUrl: string;
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

      setSubmitting(true);
      setFormError(null);
      try {
        const res = await fetch("/api/cal/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: selectedDate,
            time: selectedTime,
            timeZone,
            name,
            email,
            whatsapp: whatsapp || undefined,
            company: company || undefined,
            notes: notes || undefined,
            lengthInMinutes: durationMinutes,
          }),
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
    [selectedDate, selectedTime, timeZone, name, email, whatsapp, company, notes, durationMinutes],
  );

  const selectedTimes = selectedDate ? (availability.get(selectedDate) ?? []) : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
        {/* ---------------- main column ---------------- */}
        <div>
          <header className="mb-6">
            <p className="text-muted-foreground text-sm font-medium">Book a call</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{eventTitle}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{durationMinutes} minutes</p>
          </header>

          {step === "done" && confirmed ? (
            <Confirmation booking={confirmed} timeZone={timeZone} />
          ) : (
            <>
              {step === "details" && (
                <div className="mb-5 flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setStep("pick")}>
                    &larr; Back
                  </Button>
                  <p className="text-sm">
                    <span className="font-medium">{formatDateInZone(confirmedStart(confirmed, selectedDate, selectedTime, timeZone), timeZone)}</span>
                    {selectedTime ? ` at ${fmtTime(selectedTime)}` : null}
                  </p>
                </div>
              )}

              {/* month + time zone */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Previous month"
                    onClick={() => setMonth((m) => addMonths(m, -1))}
                  >
                    &lsaquo;
                  </Button>
                  <span className="min-w-[9rem] text-center text-sm font-medium">{monthLabel(month)}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Next month"
                    onClick={() => setMonth((m) => addMonths(m, 1))}
                  >
                    &rsquo;
                  </Button>
                </div>

                <select
                  aria-label="Time zone"
                  value={timeZone}
                  onChange={(e) => {
                    setTimeZoneOverride(e.target.value);
                    setSelectedDate(null);
                    setSelectedTime(null);
                  }}
                  className="border-border bg-background text-foreground h-8 rounded-[min(var(--radius-md),12px)] border px-2 text-sm"
                >
                  {!TIME_ZONES.some((t) => t.value === timeZone) && timeZone ? (
                    <option value={timeZone}>{timeZone}</option>
                  ) : null}
                  {TIME_ZONES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* calendar */}
              <div className="border-border rounded-[min(var(--radius-lg),16px)] border">
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
                        className={[
                          "relative flex h-14 flex-col items-center justify-center text-sm transition-colors sm:h-16",
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
                      <h2 className="mb-2 text-sm font-medium">Available days</h2>
                      {visibleDays.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          No open days this month. Try the next one.
                        </p>
                      ) : (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {visibleDays.map((day) => (
                            <button
                              key={day.date}
                              type="button"
                              onClick={() => chooseDay(day.date)}
                              className="border-border hover:border-primary min-w-[5.5rem] shrink-0 rounded-[min(var(--radius-md),12px)] border px-3 py-2 text-left"
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
                      <h2 className="mb-2 text-sm font-medium">
                        {formatDateInZone(`${selectedDate}T12:00:00Z`, "UTC")}
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {selectedTimes.map((t) => (
                          <Button
                            key={t}
                            variant={selectedTime === t ? "default" : "outline"}
                            onClick={() => chooseTime(t)}
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
                      <h2 className="text-sm font-medium">Your details</h2>
                      <Input
                        required
                        minLength={2}
                        maxLength={120}
                        placeholder="Full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                      />
                      <Input
                        required
                        type="email"
                        maxLength={200}
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                      />
                      <Input
                        maxLength={32}
                        placeholder="WhatsApp number (optional)"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        autoComplete="tel"
                      />
                      <Input
                        maxLength={160}
                        placeholder="Company (optional)"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        autoComplete="organization"
                      />
                      <Textarea
                        rows={3}
                        maxLength={2000}
                        placeholder="What would you like to discuss? (optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />

                      {formError ? (
                        <p className="text-sm text-red-500" role="alert">
                          {formError}
                        </p>
                      ) : null}

                      <Button type="submit" disabled={submitting}>
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
        <aside className="h-fit md:sticky md:top-24">
          <div className="border-border bg-card rounded-[min(var(--radius-lg),16px)] border p-5">
            <BrandLogo className="mb-4 h-6 w-auto" />
            <p className="font-medium">{eventTitle}</p>
            <dl className="text-muted-foreground mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt>Duration</dt>
                <dd className="text-foreground">{durationMinutes} min</dd>
              </div>
              {selectedDate && selectedTime ? (
                <div className="flex justify-between gap-3">
                  <dt>When</dt>
                  <dd className="text-foreground text-right">
                    {formatDateInZone(confirmedStart(confirmed, selectedDate, selectedTime, timeZone), timeZone)}
                    <br />
                    {fmtTime(selectedTime)}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt>Time zone</dt>
                <dd className="text-foreground">{timeZone}</dd>
              </div>
            </dl>
            {step !== "done" ? (
              <p className="text-muted-foreground mt-4 border-t pt-4 text-xs">
                A confirmation email and WhatsApp link will be sent to you.
              </p>
            ) : null}
          </div>
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
      <div className="border-primary/40 bg-primary/5 rounded-[min(var(--radius-lg),16px)] border p-6">
        <h2 className="text-lg font-semibold">You&apos;re booked</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          A confirmation email and a WhatsApp link are on their way.
        </p>
        <p className="mt-4 text-sm">
          <span className="font-medium">{formatDateInZone(booking.start, timeZone)}</span>
        </p>
        {booking.location ? (
          <p className="mt-3">
            <a
              className="text-primary underline underline-offset-4"
              href={booking.location}
              target="_blank"
              rel="noopener noreferrer"
            >
              Meeting link
            </a>
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {calAdd ? (
            <Button variant="outline" size="sm" render={<a href={calAdd} target="_blank" rel="noopener noreferrer" />}>
              Add to calendar
            </Button>
          ) : null}
          {booking.rescheduleUrl ? (
            <Button variant="ghost" size="sm" render={<a href={booking.rescheduleUrl} target="_blank" rel="noopener noreferrer" />}>
              Reschedule
            </Button>
          ) : null}
          {booking.cancelUrl ? (
            <Button variant="ghost" size="sm" render={<a href={booking.cancelUrl} target="_blank" rel="noopener noreferrer" />}>
              Cancel
            </Button>
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
    <Button
      variant="outline"
      render={<a href={link} target="_blank" rel="noopener noreferrer" />}
    >
      Continue on WhatsApp
    </Button>
  );
}