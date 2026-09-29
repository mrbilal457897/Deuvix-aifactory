import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const bookingStatus = pgEnum("booking_status", [
  "confirmed",
  "rescheduled",
  "cancelled",
]);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    calUid: text("cal_uid").notNull().unique(),
    status: bookingStatus("status").notNull().default("confirmed"),
    eventTitle: text("event_title"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    timezone: text("timezone"),
    name: text("name"),
    email: text("email"),
    whatsapp: text("whatsapp"),
    company: text("company"),
    notes: text("notes"),
    meetingUrl: text("meeting_url"),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>(),
    reminderSent: boolean("reminder_sent").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("bookings_start_time_idx").on(table.startTime),
    index("bookings_status_idx").on(table.status),
    index("bookings_reminder_idx").on(table.reminderSent, table.startTime),
  ],
);

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BookingStatus = (typeof bookingStatus.enumValues)[number];

export const now = sql`now()`;
