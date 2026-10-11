/**
 * Shared request schema for the custom booking form.
 *
 * Imported by BOTH the client form (pre-submit validation) and /api/cal/book
 * (authoritative validation), so the two can never drift. Keep it free of any
 * server-only imports: it ships to the browser.
 */

import { z } from "zod";

/** IETF language tags we let visitors pick from. Kept small and Cal-compatible. */
export const LANGUAGE_CODES = [
  "en",
  "ur",
  "ar",
  "hi",
  "es",
  "fr",
  "de",
  "pt",
  "zh",
  "tr",
  "nl",
  "ru",
] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export const bookingFieldsSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  whatsapp: z.string().trim().max(32).optional(),
  company: z.string().trim().max(160).optional(),
  /** Answers "What would you like to automate?" — surfaces as Notes downstream. */
  notes: z.string().trim().max(2000).optional(),
  language: z.enum(LANGUAGE_CODES),
  /**
   * Honeypot: a real visitor never sees this field, so any value means a bot.
   * `max(0)` fails the whole parse, which surfaces as the same generic
   * "invalid_input" as every other bad field.
   */
  companyWebsite: z.string().max(0).optional(),
});

export const bookingRequestSchema = bookingFieldsSchema.extend({
  /** YYYY-MM-DD as displayed in the calendar. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Wall-clock HH:mm in `timeZone`. */
  time: z.string().regex(/^\d{2}:\d{2}$/),
  timeZone: z.string().min(1).max(64),
  lengthInMinutes: z.number().int().min(5).max(600).optional(),
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;
