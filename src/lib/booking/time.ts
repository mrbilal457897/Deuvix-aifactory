/**
 * Timezone helpers shared by the booking page and the booking API route.
 *
 * Cal.com's slots endpoint returns wall-clock "HH:mm" strings keyed by a date,
 * expressed in whatever `timeZone` we asked for. To create the booking we must
 * convert that wall-clock time into an absolute UTC instant, which has to work
 * across DST transitions and for half-hour zones (Asia/Karachi is UTC+5, but
 * others are +05:30 / +09:30). Intl does this without pulling in a library.
 */

export const DEFAULT_TIME_ZONE = "Asia/Karachi";

/** Short curated list; the picker falls back to a typed IANA name. */
export const TIME_ZONES = [
  { value: "Asia/Karachi", label: "Pakistan (PKT)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Dubai", label: "UAE (GST)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central Europe (CET)" },
  { value: "America/New_York", label: "US Eastern (ET)" },
  { value: "America/Los_Angeles", label: "US Pacific (PT)" },
  { value: "America/Chicago", label: "US Central (CT)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "UTC", label: "UTC" },
] as const;

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** `2026-10` -> `YYYY-MM-01`. */
export function parseMonthParam(month: string | null | undefined): string {
  if (month && /^\d{4}-\d{2}$/.test(month)) return `${month}-01`;
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function toMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function addMonths(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return toMonthKey(d);
}

/** Inclusive list of YYYY-MM-DD for a month key. */
export function monthDateKeys(monthKey: string): string[] {
  const [y, m] = monthKey.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: days }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, "0")}`);
}

export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** Offset of `timeZone` from UTC, in ms, at the given instant. */
function timeZoneOffsetMs(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  // Intl renders midnight as hour 24 in some ICU builds; normalise it.
  const hour = get("hour") % 24;
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));
  return asUtc - at.getTime();
}

/**
 * Converts a wall-clock date+time in `timeZone` to an absolute UTC ISO string.
 * Two passes so DST boundaries land on the correct side.
 */
export function zonedTimeToUtcISO(dateKey: string, time: string, timeZone: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);

  let utc = naive - timeZoneOffsetMs(timeZone, new Date(naive));
  utc = naive - timeZoneOffsetMs(timeZone, new Date(utc));
  return new Date(utc).toISOString();
}

/** Formats an instant as wall-clock `HH:mm` in `timeZone`. */
export function formatTimeInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(/^24:/, "00:");
}

export function formatDateInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export const DEFAULT_DURATION_MINUTES = 30;