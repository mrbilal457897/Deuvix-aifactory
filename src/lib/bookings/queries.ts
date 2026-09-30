import { and, asc, count, eq, gt, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookings, type Booking } from "@/lib/db/schema";
import { buildClientChatLink } from "@/lib/notify/whatsapp";

export type BookingFilter = "upcoming" | "past" | "cancelled" | "all";

export const BOOKING_FILTERS: BookingFilter[] = ["upcoming", "past", "cancelled", "all"];

export function parseBookingFilter(value: string | string[] | undefined): BookingFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return BOOKING_FILTERS.includes(raw as BookingFilter) ? (raw as BookingFilter) : "upcoming";
}

/** Upcoming first (soonest at the top), then the most recent past bookings. */
export async function listBookings(filter: BookingFilter, limit = 500): Promise<Booking[]> {
  const db = getDb();
  const now = new Date();

  const conditions = [];
  if (filter === "upcoming") conditions.push(gt(bookings.startTime, now));
  else if (filter === "past") conditions.push(lt(bookings.startTime, now));
  else if (filter === "cancelled") conditions.push(eq(bookings.status, "cancelled"));

  const rows = await db
    .select()
    .from(bookings)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(bookings.startTime))
    .limit(limit);

  if (filter === "past") return rows.reverse();

  if (filter === "upcoming" || filter === "all") {
    const future: Booking[] = [];
    const past: Booking[] = [];
    for (const row of rows) {
      if (row.startTime >= now) future.push(row);
      else past.push(row);
    }
    return [...future, ...past.reverse()];
  }

  return rows;
}

export async function countBookings(): Promise<Record<BookingFilter, number>> {
  const db = getDb();
  const now = new Date();

  const tally = async (where: ReturnType<typeof and>) => {
    const [row] = await db.select({ value: count() }).from(bookings).where(where);
    return row?.value ?? 0;
  };

  const [upcoming, past, cancelled, all] = await Promise.all([
    tally(and(gt(bookings.startTime, now), eq(bookings.status, "confirmed"))),
    tally(lt(bookings.startTime, now)),
    tally(eq(bookings.status, "cancelled")),
    tally(undefined),
  ]);

  return { upcoming, past, cancelled, all };
}

/** Stops spreadsheet apps from executing a cell that starts with = + - @ */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  if (/[",\n\r]/.test(str)) str = `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function bookingsToCsv(rows: Booking[]): string {
  const header = [
    "cal_uid",
    "status",
    "name",
    "email",
    "whatsapp",
    "whatsapp_link",
    "company",
    "event_title",
    "start_time_utc",
    "end_time_utc",
    "timezone",
    "meeting_url",
    "notes",
    "reminder_sent",
    "created_at",
  ];

  const lines = rows.map((row) =>
    [
      row.calUid,
      row.status,
      row.name,
      row.email,
      row.whatsapp,
      buildClientChatLink(row.whatsapp, { name: row.name, startTime: row.startTime, meetingUrl: row.meetingUrl }),
      row.company,
      row.eventTitle,
      row.startTime,
      row.endTime,
      row.timezone,
      row.meetingUrl,
      row.notes,
      row.reminderSent ? "yes" : "no",
      row.createdAt,
    ]
      .map(csvCell)
      .join(","),
  );

  // BOM keeps Excel happy with UTF-8 names.
  return `\uFEFF${header.join(",")}\r\n${lines.join("\r\n")}\r\n`;
}
