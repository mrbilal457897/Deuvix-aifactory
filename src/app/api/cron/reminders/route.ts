import { timingSafeEqual } from "node:crypto";
import { and, eq, gt, lte } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { bookingReminderEmail } from "@/lib/email/booking-templates";
import { sendEmail } from "@/lib/email";
import { getNotifyEmail } from "@/lib/cal/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEAD_HOURS = 24;
/** Extra slack so a booking is still caught if one poll cycle is missed. */
const WINDOW_HOURS = LEAD_HOURS + 1;

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron:reminders] CRON_SECRET is not set - rejecting request");
    return false;
  }

  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  const direct = request.headers.get("x-cron-secret");

  const candidate = bearer ?? direct;
  if (!candidate) return false;
  return safeEqual(candidate, secret);
}

async function runReminders(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return Response.json({ error: "DATABASE_URL is not set" }, { status: 503 });
  }

  const now = new Date();
  const until = new Date(now.getTime() + WINDOW_HOURS * 60 * 60 * 1000);

  const db = getDb();
  let due;
  try {
    due = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "confirmed"),
          eq(bookings.reminderSent, false),
          gt(bookings.startTime, now),
          lte(bookings.startTime, until),
        ),
      )
      .limit(200);
  } catch (err) {
    console.error("[cron:reminders] query failed:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Query failed" }, { status: 500 });
  }

  const notifyEmail = getNotifyEmail();
  const results: Array<{ uid: string; sent: boolean; reason?: string }> = [];

  for (const booking of due) {
    const data = {
      name: booking.name,
      email: booking.email,
      whatsapp: booking.whatsapp,
      company: booking.company,
      notes: booking.notes,
      eventTitle: booking.eventTitle,
      startTime: booking.startTime,
      endTime: booking.endTime,
      timezone: booking.timezone,
      meetingUrl: booking.meetingUrl,
    };

    let clientSent = false;

    if (booking.email) {
      const client = bookingReminderEmail(data, "client");
      const result = await sendEmail({
        to: booking.email,
        subject: client.subject,
        html: client.html,
        text: client.text,
        replyTo: notifyEmail ?? undefined,
      });
      clientSent = result.ok;
      if (!result.ok) console.error(`[cron:reminders] client email failed for ${booking.calUid}: ${result.error}`);
    }

    if (notifyEmail) {
      const owner = bookingReminderEmail(data, "owner");
      // Best effort: the owner's copy must never block the flag.
      await sendEmail({ to: notifyEmail, subject: owner.subject, html: owner.html, text: owner.text });
    }

    if (clientSent) {
      try {
        await db
          .update(bookings)
          .set({ reminderSent: true })
          .where(eq(bookings.calUid, booking.calUid));
      } catch (err) {
        console.error(`[cron:reminders] could not flag ${booking.calUid}:`, err instanceof Error ? err.message : err);
      }
    }

    results.push({ uid: booking.calUid, sent: clientSent, reason: clientSent ? undefined : "email failed, will retry" });
  }

  return Response.json({
    ok: true,
    windowHours: WINDOW_HOURS,
    due: due.length,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}

export async function GET(request: Request) {
  return runReminders(request);
}

export async function POST(request: Request) {
  return runReminders(request);
}
