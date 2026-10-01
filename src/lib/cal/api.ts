/**
 * Server-side Cal.com v2 API client.
 *
 * Never import this from a client component: it reads CAL_API_KEY.
 *
 * Base URL differs by deployment:
 *   hosted  CAL_ORIGIN=https://cal.com        -> https://api.cal.com/v2/...
 *   self    CAL_ORIGIN=https://cal.example.com -> https://cal.example.com/api/v2/...
 *
 * That is why everything here is origin-derived: switching to a self-hosted
 * Cal.com later is still just an env change.
 */

import { formatTimeInZone } from "@/lib/booking/time";

const SLOTS_API_VERSION = "2024-09-04";
const BOOKING_API_VERSION = "2024-08-13";

/** Mirrors getCalOrigin()/getCalLink() but usable from server code. */
export function getCalOrigin(): string {
  return (process.env.NEXT_PUBLIC_CAL_ORIGIN ?? "").replace(/\/+$/, "");
}

export function getCalLink(): string {
  return (process.env.NEXT_PUBLIC_CAL_LINK ?? "").replace(/^\/+|\/+$/g, "");
}

export function getCalApiKey(): string {
  return (process.env.CAL_API_KEY ?? "").trim();
}

export function getCalOrgSlug(): string | undefined {
  const v = (process.env.CAL_ORGANIZATION_SLUG ?? "").trim();
  return v || undefined;
}

/**
 * `user/slug` and `team/slug` are indistinguishable from the URL alone, so we
 * never guess: the operator states it with CAL_EVENT_KIND (default "user").
 * A literal leading `team/` in the link is still honoured, since that shape is
 * unambiguous.
 */
export function getCalEventKind(): "user" | "team" {
  return (process.env.CAL_EVENT_KIND ?? "").trim().toLowerCase() === "team" ? "team" : "user";
}

/** `https://cal.com` is hosted; anything else is assumed self-hosted. */
export function getCalApiBase(): string {
  const origin = getCalOrigin();
  if (!origin) return "https://api.cal.com";
  try {
    const host = new URL(origin).host;
    if (host === "cal.com" || host === "app.cal.com" || host === "www.cal.com") {
      return "https://api.cal.com";
    }
  } catch {
    /* fall through to self-hosted shape */
  }
  return `${origin}/api`;
}

export function isCalApiConfigured(): boolean {
  return Boolean(getCalOrigin() && getCalLink() && getCalApiKey());
}

export interface CalEventRef {
  /** `deux` */
  eventTypeSlug: string;
  /** `bilal-sheikh-3qvs54` */
  username?: string;
  /** only for team event types */
  teamSlug?: string;
  organizationSlug?: string;
}

/**
 * Parses NEXT_PUBLIC_CAL_LINK into the identity the v2 API expects.
 * Accepts `slug`, `user/slug`, `team/team-slug/slug`, and honours CAL_EVENT_KIND
 * for the ambiguous two-segment form.
 */
export function parseCalLink(link?: string): CalEventRef | null {
  const clean = (link ?? getCalLink()).replace(/^\/+|\/+$/g, "");
  if (!clean) return null;

  const parts = clean.split("/").filter(Boolean);
  const org = getCalOrgSlug();

  // `team/<teamSlug>/<eventSlug>` — unambiguous, no config needed.
  if (parts.length >= 3 || parts[0] === "team") {
    const tail = parts[0] === "team" ? parts.slice(1) : parts;
    if (tail.length < 2) return null;
    return {
      teamSlug: tail[tail.length - 2],
      eventTypeSlug: tail[tail.length - 1],
      organizationSlug: org,
    };
  }

  if (parts.length === 2) {
    // Two segments is the ambiguous case; CAL_EVENT_KIND decides.
    return getCalEventKind() === "team"
      ? { teamSlug: parts[0], eventTypeSlug: parts[1], organizationSlug: org }
      : { username: parts[0], eventTypeSlug: parts[1], organizationSlug: org };
  }

  return { eventTypeSlug: parts[0], organizationSlug: org };
}

export class CalApiError extends Error {
  readonly status: number;
  readonly calCode?: string;

  constructor(message: string, status: number, calCode?: string) {
    super(message);
    this.name = "CalApiError";
    this.status = status;
    this.calCode = calCode;
  }
}

function refQuery(ref: CalEventRef): Record<string, string> {
  const out: Record<string, string> = { eventTypeSlug: ref.eventTypeSlug };
  if (ref.username) out.username = ref.username;
  if (ref.teamSlug) out.teamSlug = ref.teamSlug;
  if (ref.organizationSlug) out.organizationSlug = ref.organizationSlug;
  return out;
}

async function calFetch<T>(
  path: string,
  init: RequestInit & { apiVersion: string },
): Promise<T> {
  const { apiVersion, ...rest } = init;
  const res = await fetch(`${getCalApiBase()}/v2${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${getCalApiKey()}`,
      "cal-api-version": apiVersion,
      "Content-Type": "application/json",
      ...(rest.headers ?? {}),
    },
    // Availability must never be served stale; bookings are already idempotent
    // by Cal.com's own uid.
    cache: "no-store",
  });

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const b = body as { message?: unknown; error?: unknown; code?: string } | null;
    // Cal.com returns `message` as an object/array on some errors, so never
    // assume it is a string or the caller renders "[object Object]".
    const message = stringifyError(b?.message ?? b?.error) ?? `Cal.com API responded ${res.status} for ${path}`;
    throw new CalApiError(message, res.status, b?.code);
  }
  return body as T;
}

/** Flattens Cal.com's string | string[] | object error payloads into one line. */
function stringifyError(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const parts = value.map(stringifyError).filter(Boolean);
    return parts.length ? parts.join("; ") : undefined;
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const parts = [stringifyError(rec.message), stringifyError(rec.error)]
      .filter(Boolean)
      .map(String);
    if (parts.length) return parts.join(": ");
    try {
      return JSON.stringify(value);
    } catch {
      return undefined;
    }
  }
  return String(value);
}

/**
 * Cal.com v2 returns slots as absolute timestamps carrying the requested
 * zone's offset, e.g. `{ "2026-10-05": [{ "start": "2026-10-05T09:00:00.000+05:00" }] }`.
 * We normalise to `HH:mm` wall-clock strings keyed by local date, which is what
 * the calendar grid and `zonedTimeToUtcISO()` both expect.
 */
export type SlotMap = Record<string, string[]>;

/** Defensive: accepts the documented shape and tolerates Cal returning bare strings. */
function normaliseSlots(
  raw: unknown,
  timeZone: string,
): SlotMap {
  if (!raw || typeof raw !== "object") return {};
  const out: SlotMap = {};

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value) || value.length === 0) continue;

    const times = value
      .map((entry) => {
        if (typeof entry === "string") return entry.slice(11, 16);
        if (!entry || typeof entry !== "object") return null;
        const start = (entry as { start?: unknown }).start;
        return typeof start === "string" ? formatTimeInZone(start, timeZone) : null;
      })
      .filter((t): t is string => Boolean(t));

    if (times.length) out[key] = times;
  }
  return out;
}

export async function fetchAvailableSlots(opts: {
  /** YYYY-MM-DD, inclusive */
  start: string;
  /** YYYY-MM-DD, inclusive */
  end: string;
  timeZone: string;
  durationMinutes?: number;
}): Promise<SlotMap> {
  const ref = parseCalLink();
  if (!ref) throw new CalApiError("NEXT_PUBLIC_CAL_LINK is not set", 500);

  const params = new URLSearchParams({
    ...refQuery(ref),
    start: opts.start,
    end: opts.end,
    timeZone: opts.timeZone,
  });
  if (opts.durationMinutes) params.set("duration", String(opts.durationMinutes));

  const body = await calFetch<{ status?: string; data?: unknown }>(`/slots?${params}`, {
    method: "GET",
    apiVersion: SLOTS_API_VERSION,
  });

  return normaliseSlots(body?.data, opts.timeZone);
}

export interface CreateBookingInput {
  /** Absolute UTC ISO timestamp. */
  start: string;
  attendee: {
    name: string;
    email: string;
    timeZone: string;
    phoneNumber?: string;
    language?: string;
  };
  guests?: string[];
  /**
   * Only send this when the event type actually offers multiple lengths.
   * Cal.com rejects the whole request with
   * "Can't specify 'lengthInMinutes' because event type does not have multiple
   * possible lengths" for any fixed-length event type, which is the common case.
   */
  lengthInMinutes?: number;
  /** Max 50 keys, string values <= 500 chars (enforced by Cal.com). */
  metadata?: Record<string, string>;
  bookingFieldsResponses?: Record<string, unknown>;
}

export interface CalBookingResult {
  uid: string;
  id?: number;
  start: string;
  end?: string;
  title?: string;
  location?: string;
  meetingUrl?: string | null;
  status?: string;
  cancelUrl?: string | null;
  rescheduleUrl?: string | null;
  attendees?: Array<{ email?: string; name?: string }>;
}

export async function createBooking(
  input: CreateBookingInput,
  opts: { supportsMultipleLengths?: boolean } = {},
): Promise<CalBookingResult> {
  const ref = parseCalLink();
  if (!ref) throw new CalApiError("NEXT_PUBLIC_CAL_LINK is not set", 500);

  // Default to omitting it: a fixed-length event type (the usual setup) rejects
  // the field outright, and the event type's own length is authoritative anyway.
  const sendLength =
    opts.supportsMultipleLengths === true && Boolean(input.lengthInMinutes);

  const body = await calFetch<{ status?: string; data?: CalBookingResult }>("/bookings", {
    method: "POST",
    apiVersion: BOOKING_API_VERSION,
    body: JSON.stringify({
      start: input.start,
      attendee: input.attendee,
      ...refQuery(ref),
      ...(input.guests?.length ? { guests: input.guests } : {}),
      ...(sendLength ? { lengthInMinutes: input.lengthInMinutes } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
      ...(input.bookingFieldsResponses ? { bookingFieldsResponses: input.bookingFieldsResponses } : {}),
    }),
  });

  if (body?.status === "error" || !body?.data) {
    throw new CalApiError("Cal.com rejected the booking", 502);
  }
  return body.data;
}