/**
 * Persists a normalised Cal.com booking and fans out the emails.
 * Kept out of the route so the upsert logic is reusable and testable.
 */
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookings, type Booking } from "@/lib/db/schema";
import { clientBookingEmail, ownerBookingEmail, type BookingEmailData } from "@/lib/email/booking-templates";
import { sendEmail } from "@/lib/email";
import type { NormalizedBooking } from "./payload";

export function getNotifyEmail(): string | null {
  const value = process.env.NOTIFY_EMAIL?.trim();
  return value ? value : null;
}

function toEmailData(booking: Booking, normalized?: NormalizedBooking): BookingEmailData {
  return {
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
    rescheduleUrl: normalized?.rescheduleUrl ?? null,
    cancelUrl: normalized?.cancelUrl ?? null,
  };
}

/**
 * Upserts on cal_uid so a reschedule or cancellation updates the same row.
 * Returns the stored booking.
 */
export async function upsertBooking(normalized: NormalizedBooking, previous?: Booking | null): Promise<Booking> {
  const db = getDb();

  // A cancellation payload can omit start/end; keep whatever we already had.
  const startTime = normalized.startTime ?? previous?.startTime;
  const endTime = normalized.endTime ?? previous?.endTime;
  if (!startTime || !endTime) {
    throw new Error("Booking has no usable start/end time");
  }

  const values = {
    calUid: normalized.calUid,
    status: normalized.status,
    eventTitle: normalized.eventTitle,
    startTime,
    endTime,
    timezone: normalized.timezone,
    name: normalized.name,
    email: normalized.email,
    whatsapp: normalized.whatsapp,
    company: normalized.company,
    notes: normalized.notes,
    meetingUrl: normalized.meetingUrl,
    rawPayload: normalized.rawPayload,
    updatedAt: sql`now()`,
  };

  const [row] = await db
    .insert(bookings)
    .values({ ...values, reminderSent: false })
    .onConflictDoUpdate({
      target: bookings.calUid,
      set: {
        // A new time means the old reminder is stale again.
        ...(normalized.startTime ? { reminderSent: false } : {}),
        ...values,
      },
    })
    .returning();

  if (!row) throw new Error("Booking upsert returned no row");
  return row;
}

export async function findBookingByCalUid(calUid: string): Promise<Booking | null> {
  const db = getDb();
  const rows = await db.select().from(bookings).where(eq(bookings.calUid, calUid)).limit(1);
  return rows[0] ?? null;
}

/** Sends the owner notification and the client email. Never throws. */
export async function dispatchBookingEmails(
  booking: Booking,
  normalized: NormalizedBooking,
  tone: "new" | "rescheduled" | "cancelled",
): Promise<void> {
  const data = toEmailData(booking, normalized);
  const notifyEmail = getNotifyEmail();
  const jobs: Promise<unknown>[] = [];

  if (notifyEmail) {
    const owner = ownerBookingEmail(data, tone);
    jobs.push(
      sendEmail({ to: notifyEmail, subject: owner.subject, html: owner.html, text: owner.text }),
    );
  } else {
    console.warn("[cal-webhook] NOTIFY_EMAIL not set - owner notification skipped");
  }

  if (booking.email) {
    const client = clientBookingEmail(data, tone);
    jobs.push(
      sendEmail({
        to: booking.email,
        subject: client.subject,
        html: client.html,
        text: client.text,
        replyTo: notifyEmail ?? undefined,
      }),
    );
  } else {
    console.warn("[cal-webhook] booking has no attendee email - client email skipped");
  }

  const results = await Promise.allSettled(jobs);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[cal-webhook] email dispatch failed:", result.reason);
    }
  }
}
