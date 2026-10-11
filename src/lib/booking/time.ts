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

/**
 * Curated IANA zones for the picker. `short` is the label we append to times
 * ("PKT", "EST", "SGT"...). It is the display string used for "our hours" and
 * the sidebar, never used to do arithmetic — all math stays on the IANA name.
 */
export const TIME_ZONES = [
  { value: "Pacific/Honolulu", label: "Hawaii (HST)", short: "HST" },
  { value: "America/Anchorage", label: "Alaska (AKT)", short: "AKT" },
  { value: "America/Los_Angeles", label: "US Pacific (PT)", short: "PT" },
  { value: "America/Denver", label: "US Mountain (MT)", short: "MT" },
  { value: "America/Phoenix", label: "Arizona (MST)", short: "MST" },
  { value: "America/Chicago", label: "US Central (CT)", short: "CT" },
  { value: "America/Mexico_City", label: "Mexico City (CST)", short: "CST" },
  { value: "America/New_York", label: "US Eastern (ET)", short: "ET" },
  { value: "America/Toronto", label: "Toronto (ET)", short: "ET" },
  { value: "America/Halifax", label: "Atlantic (AT)", short: "AT" },
  { value: "America/Bogota", label: "Bogota (COT)", short: "COT" },
  { value: "America/Lima", label: "Lima (PET)", short: "PET" },
  { value: "America/Santiago", label: "Santiago (CLT)", short: "CLT" },
  { value: "America/Sao_Paulo", label: "Sao Paulo (BRT)", short: "BRT" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (ART)", short: "ART" },
  { value: "UTC", label: "UTC", short: "UTC" },
  { value: "Europe/Lisbon", label: "Lisbon (WET)", short: "WET" },
  { value: "Europe/London", label: "London (GMT/BST)", short: "GMT" },
  { value: "Europe/Paris", label: "Central Europe (CET)", short: "CET" },
  { value: "Europe/Berlin", label: "Berlin (CET)", short: "CET" },
  { value: "Europe/Madrid", label: "Madrid (CET)", short: "CET" },
  { value: "Europe/Rome", label: "Rome (CET)", short: "CET" },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET)", short: "CET" },
  { value: "Europe/Stockholm", label: "Stockholm (CET)", short: "CET" },
  { value: "Europe/Warsaw", label: "Warsaw (CET)", short: "CET" },
  { value: "Europe/Athens", label: "Athens (EET)", short: "EET" },
  { value: "Europe/Helsinki", label: "Helsinki (EET)", short: "EET" },
  { value: "Europe/Istanbul", label: "Istanbul (TRT)", short: "TRT" },
  { value: "Europe/Moscow", label: "Moscow (MSK)", short: "MSK" },
  { value: "Africa/Lagos", label: "Lagos (WAT)", short: "WAT" },
  { value: "Africa/Cairo", label: "Cairo (EET)", short: "EET" },
  { value: "Africa/Nairobi", label: "Nairobi (EAT)", short: "EAT" },
  { value: "Africa/Johannesburg", label: "Johannesburg (SAST)", short: "SAST" },
  { value: "Asia/Jerusalem", label: "Israel (IST)", short: "IST" },
  { value: "Asia/Riyadh", label: "Riyadh (AST)", short: "AST" },
  { value: "Asia/Dubai", label: "UAE (GST)", short: "GST" },
  { value: "Asia/Karachi", label: "Pakistan (PKT)", short: "PKT" },
  { value: "Asia/Kolkata", label: "India (IST)", short: "IST" },
  { value: "Asia/Dhaka", label: "Dhaka (BST)", short: "BST" },
  { value: "Asia/Bangkok", label: "Bangkok (ICT)", short: "ICT" },
  { value: "Asia/Jakarta", label: "Jakarta (WIB)", short: "WIB" },
  { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur (MYT)", short: "MYT" },
  { value: "Asia/Singapore", label: "Singapore (SGT)", short: "SGT" },
  { value: "Asia/Shanghai", label: "China (CST)", short: "CST" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)", short: "HKT" },
  { value: "Asia/Manila", label: "Manila (PHT)", short: "PHT" },
  { value: "Asia/Tokyo", label: "Japan (JST)", short: "JST" },
  { value: "Asia/Seoul", label: "Korea (KST)", short: "KST" },
  { value: "Australia/Perth", label: "Perth (AWST)", short: "AWST" },
  { value: "Australia/Adelaide", label: "Adelaide (ACST)", short: "ACST" },
  { value: "Australia/Brisbane", label: "Brisbane (AEST)", short: "AEST" },
  { value: "Australia/Sydney", label: "Sydney (AEST)", short: "AEST" },
  { value: "Pacific/Auckland", label: "Auckland (NZST)", short: "NZST" },
] as const;

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** "Asia/Karachi" -> "Pakistan (PKT)"; unlisted zones fall back to their IANA name. */
export function zoneLabel(timeZone: string): string {
  return TIME_ZONES.find((t) => t.value === timeZone)?.label ?? timeZone;
}

/**
 * Short suffix for a zone ("PKT", "ET"). Listed zones use their curated short
 * name; anything else asks Intl, and finally falls back to the IANA name.
 */
export function zoneShort(timeZone: string): string {
  const listed = TIME_ZONES.find((t) => t.value === timeZone);
  if (listed) return listed.short;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

/**
 * Normalises anything month-ish to a bare `YYYY-MM` month key.
 *
 * Accepts `2026-10`, `2026-10-01` and `2026-10-15T…`. Every helper below routes
 * through this, so a stray full date can no longer produce `2026-10-01-01`.
 */
function normaliseMonthKey(input: string | null | undefined): string {
  const raw = (input ?? "").trim();
  const m = raw.match(/^(\d{4})-(\d{2})(?:-|$)/);
  if (!m) return toMonthKey(new Date());
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return toMonthKey(new Date());
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** `?month=2026-10` -> `2026-10` (a month key, matching every other helper). */
export function parseMonthParam(month: string | null | undefined): string {
  return normaliseMonthKey(month);
}

export function toMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function addMonths(monthKey: string, delta: number): string {
  const key = normaliseMonthKey(monthKey);
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return toMonthKey(d);
}

/** Inclusive list of YYYY-MM-DD for a month key. */
export function monthDateKeys(monthKey: string): string[] {
  const key = normaliseMonthKey(monthKey);
  const [y, m] = key.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: days }, (_, i) => `${key}-${String(i + 1).padStart(2, "0")}`);
}

export function monthLabel(monthKey: string): string {
  const key = normaliseMonthKey(monthKey);
  const [y, m] = key.split("-").map(Number);
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

/** Same instant, 12-hour clock with AM/PM ("2:30 PM"). Used for "local time now". */
export function formatClockInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
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