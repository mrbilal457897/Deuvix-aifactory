/**
 * Small fixed-window rate limiter for the public booking and contact endpoints.
 *
 * /api/cal/book and /api/contact are anonymous by design, which makes them
 * abusable: without a cap one client can hold Cal.com's whole quota (the hosted
 * API allows ~10 requests/minute), create bookings in bulk, or burn through the
 * site's SMTP quota with contact notifications.
 *
 * Scope: per-process and in-memory. That is enough to stop casual abuse and
 * script-kiddie loops. If the site ever runs multiple instances behind a load
 * balancer, swap the Map for Redis (or Coolify/Vercel KV) — the interface here
 * is deliberately tiny so that is a drop-in change.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 10 * 60 * 1000;
const MAX_BOOKINGS = 5;
const MAX_SLOT_LOOKUPS = 60;
const MAX_CONTACT_SUBMISSIONS = 5;
/** Contact submissions are rarer than slot lookups, so they get a wider window. */
const CONTACT_WINDOW_MS = 60 * 60 * 1000;

const globalForLimit = globalThis as unknown as {
  __deuxRateBuckets?: Map<string, Bucket>;
};
const buckets = (globalForLimit.__deuxRateBuckets ??= new Map<string, Bucket>());

// Keep the map from growing without bound on a long-lived server.
function sweep(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number = WINDOW_MS): RateResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}

export const BOOKING_LIMIT = MAX_BOOKINGS;
export const SLOT_LOOKUP_LIMIT = MAX_SLOT_LOOKUPS;
export const CONTACT_LIMIT = MAX_CONTACT_SUBMISSIONS;
export { CONTACT_WINDOW_MS };