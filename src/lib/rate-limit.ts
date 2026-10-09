const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

const buckets = new Map<string, number[]>();

let pruneCounter = 0;

/** Keeps the in-memory map from growing without bound on a long-lived server. */
function prune(now: number, windowMs: number): void {
  if ((pruneCounter = (pruneCounter + 1) % 500) !== 0) return;
  for (const [key, stamps] of buckets) {
    const live = stamps.filter((t) => now - t < windowMs);
    if (live.length === 0) buckets.delete(key);
    else buckets.set(key, live);
  }
}

export function checkRateLimit(key: string, max = MAX_REQUESTS, windowMs = WINDOW_MS): boolean {
  const now = Date.now();
  prune(now, windowMs);
  const timestamps = (buckets.get(key) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= max) {
    buckets.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return true;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
