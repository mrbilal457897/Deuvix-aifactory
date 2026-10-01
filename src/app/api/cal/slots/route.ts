import { NextResponse, type NextRequest } from "next/server";
import { CalApiError, fetchAvailableSlots, isCalApiConfigured } from "@/lib/cal/api";
import { isValidTimeZone, monthDateKeys, parseMonthParam } from "@/lib/booking/time";
import { SLOT_LOOKUP_LIMIT, clientKey, rateLimit } from "@/lib/booking/rate-limit";

export const dynamic = "force-dynamic";

/** Calendly-style availability for one month. Proxied so CAL_API_KEY stays server-side. */
export async function GET(request: NextRequest) {
  if (!isCalApiConfigured()) {
    return NextResponse.json(
      { error: "booking_not_configured", message: "Cal.com API is not configured yet." },
      { status: 503 },
    );
  }

  const limited = rateLimit(clientKey(request, "slots"), SLOT_LOOKUP_LIMIT);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "too_many_requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  const sp = request.nextUrl.searchParams;
  const monthKey = parseMonthParam(sp.get("month"));
  const timeZone = sp.get("tz") ?? "Asia/Karachi";

  if (!isValidTimeZone(timeZone)) {
    return NextResponse.json({ error: "bad_timezone" }, { status: 400 });
  }

  try {
    const keys = monthDateKeys(monthKey);
    const slots = await fetchAvailableSlots({
      start: keys[0],
      end: keys[keys.length - 1],
      timeZone,
    });

    // Only return days that actually have availability, so the client can grey
    // out the rest without a second pass.
    const days = Object.entries(slots)
      .filter(([, times]) => Array.isArray(times) && times.length > 0)
      .map(([date, times]) => ({ date, times }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ month: monthKey, timeZone, days });
  } catch (err) {
    if (err instanceof CalApiError) {
      console.error("[api/cal/slots] CAL REJECTED", { status: err.status, message: err.message, code: err.calCode, month: monthKey, tz: timeZone });
      return NextResponse.json(
        { error: "cal_api_error", message: err.message, calStatus: err.status },
        { status: err.status === 401 || err.status === 403 ? 502 : 502 },
      );
    }
    console.error("[api/cal/slots] unexpected error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "slots_unavailable" }, { status: 502 });
  }
}