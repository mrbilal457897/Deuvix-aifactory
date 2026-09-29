import { after, type NextRequest } from "next/server";
import {
  CalPayloadError,
  calWebhookSchema,
  isHandledTrigger,
  normalizeCalBooking,
} from "@/lib/cal/payload";
import { verifyCalSignature } from "@/lib/cal/signature";
import { dispatchBookingEmails, findBookingByCalUid, upsertBooking } from "@/lib/cal/service";
import { isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cal.com -> us.
 *
 * 1. read the RAW body
 * 2. verify X-Cal-Signature-256 (HMAC-SHA256, timing-safe)
 * 3. validate with zod, ignore unknown triggers with 200
 * 4. upsert by cal_uid
 * 5. respond, then send emails in the background via after()
 */
export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return Response.json({ error: "Could not read request body" }, { status: 400 });
  }

  if (!verifyCalSignature(rawBody, request.headers.get("x-cal-signature-256"), process.env.CAL_WEBHOOK_SECRET)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    console.error("[cal-webhook] body is not valid JSON");
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = calWebhookSchema.safeParse(json);
  if (!parsed.success) {
    // Log the shape only, never the payload: it can contain client PII.
    console.error("[cal-webhook] zod validation failed:", parsed.error.issues.slice(0, 5));
    return Response.json({ error: "Invalid payload" }, { status: 422 });
  }

  const trigger = parsed.data.triggerEvent;
  if (!isHandledTrigger(trigger)) {
    return Response.json({ ok: true, ignored: trigger });
  }

  if (!isDatabaseConfigured()) {
    console.error("[cal-webhook] DATABASE_URL is not set");
    return Response.json({ error: "Server not configured" }, { status: 503 });
  }

  let normalized;
  try {
    normalized = normalizeCalBooking(parsed.data);
  } catch (err) {
    if (err instanceof CalPayloadError) {
      console.error(`[cal-webhook] ${err.message}`);
      return Response.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }

  const tone =
    trigger === "BOOKING_CANCELLED" ? "cancelled" : trigger === "BOOKING_RESCHEDULED" ? "rescheduled" : "new";

  let booking;
  try {
    const previous = await findBookingByCalUid(normalized.calUid);
    booking = await upsertBooking(normalized, previous);
  } catch (err) {
    console.error("[cal-webhook] could not persist booking:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Could not persist booking" }, { status: 500 });
  }

  // Emails must never delay or fail the webhook response.
  after(async () => {
    try {
      await dispatchBookingEmails(booking, normalized, tone);
    } catch (err) {
      console.error("[cal-webhook] post-response email dispatch failed:", err instanceof Error ? err.message : err);
    }
  });

  return Response.json({ ok: true, uid: booking.calUid, status: booking.status });
}

export function GET() {
  return Response.json(
    { error: "Method not allowed. Cal.com must POST to this endpoint." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
