import { NextResponse, type NextRequest } from "next/server";
import { CalApiError, createBooking, isCalApiConfigured } from "@/lib/cal/api";
import { isValidTimeZone, zonedTimeToUtcISO } from "@/lib/booking/time";
import { bookingRequestSchema } from "@/lib/booking/schema";
import { BOOKING_LIMIT, clientKey, rateLimit } from "@/lib/booking/rate-limit";

export const dynamic = "force-dynamic";

/** Cal.com allows 50 metadata keys with string values up to 500 chars. */
const META_LIMIT = 500;

const clip = (v: string | undefined, max: number) =>
  v ? v.slice(0, max) : undefined;

export async function POST(request: NextRequest) {
  if (!isCalApiConfigured()) {
    return NextResponse.json(
      { error: "booking_not_configured", message: "Cal.com API is not configured yet." },
      { status: 503 },
    );
  }

  const limited = rateLimit(clientKey(request, "book"), BOOKING_LIMIT);
  if (!limited.ok) {
    return NextResponse.json(
      {
        error: "too_many_requests",
        message: `Too many booking attempts. Try again in ${Math.ceil(limited.retryAfterSeconds / 60)} minute(s).`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSeconds) },
      },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bookingRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const input = parsed.data;
  if (!isValidTimeZone(input.timeZone)) {
    return NextResponse.json({ error: "bad_timezone" }, { status: 400 });
  }

  try {
    const startUtc = zonedTimeToUtcISO(input.date, input.time, input.timeZone);
    if (new Date(startUtc).getTime() < Date.now() - 60_000) {
      return NextResponse.json(
        { error: "slot_in_past", message: "That time has already passed." },
        { status: 409 },
      );
    }

    const whatsapp = clip(input.whatsapp, 32);
    const company = clip(input.company, 160);
    const notes = clip(input.notes, META_LIMIT);

    const booking = await createBooking(
      {
        start: startUtc,
        attendee: {
          name: input.name,
          email: input.email,
          timeZone: input.timeZone,
          ...(whatsapp ? { phoneNumber: whatsapp } : {}),
          language: input.language,
        },
        ...(input.lengthInMinutes ? { lengthInMinutes: input.lengthInMinutes } : {}),
        // The webhook normaliser already scans metadata for company / notes /
        // phone, so these land in our Postgres row without extra wiring.
        metadata: {
          source: "booking-page",
          ...(company ? { company } : {}),
          ...(notes ? { notes } : {}),
          ...(whatsapp ? { whatsapp } : {}),
          language: input.language,
        },
      },
      // Cal.com rejects lengthInMinutes unless the event type has multiple
      // lengths enabled, so it is omitted by default and the event type's own
      // length wins. Opt in only after enabling multiple lengths in Cal.com.
      { supportsMultipleLengths: process.env.CAL_SUPPORTS_MULTIPLE_LENGTHS === "true" },
    );

    return NextResponse.json(
      {
        ok: true,
        booking: {
          uid: booking.uid,
          start: booking.start,
          end: booking.end ?? null,
          title: booking.title ?? null,
          location: booking.location ?? booking.meetingUrl ?? null,
          cancelUrl: booking.cancelUrl ?? null,
          rescheduleUrl: booking.rescheduleUrl ?? null,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof CalApiError) {
      // Cal.com returns 400 for a slot that was just taken; surface that as a
      // conflict so the UI can tell the visitor to pick again.
      const conflict = /not available|no.*slot|already booked|slot.*unavailable|out of bounds/i.test(
        err.message,
      );
      return NextResponse.json(
        { error: conflict ? "slot_taken" : "cal_api_error", message: err.message },
        { status: conflict ? 409 : 502 },
      );
    }
    console.error("[api/cal/book] unexpected error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "booking_failed" }, { status: 500 });
  }
}