import { z } from "zod";
import type { BookingStatus } from "@/lib/db/schema";

/**
 * Cal.com v2 webhook payloads are wide and change between versions, so the
 * schema is deliberately permissive (passthrough) and the normaliser below
 * pulls out only what we need. Unknown triggers are ignored by the route.
 */
export const CAL_TRIGGERS = [
  "BOOKING_CREATED",
  "BOOKING_RESCHEDULED",
  "BOOKING_CANCELLED",
] as const;

export const calWebhookSchema = z
  .object({
    triggerEvent: z.string().min(1),
    createdAt: z.string().optional(),
    payload: z
      .object({
        uid: z.string().min(1).optional(),
        title: z.string().nullish(),
        startTime: z.string().nullish(),
        endTime: z.string().nullish(),
        timezone: z.string().nullish(),
        location: z
          .object({
            type: z.string().nullish(),
            link: z.string().nullish(),
            phone: z.string().nullish(),
          })
          .nullish(),
        attendees: z
          .array(
            z
              .object({
                email: z.string().nullish(),
                name: z.string().nullish(),
                timeZone: z.string().nullish(),
                language: z.string().nullish(),
                phoneNumber: z.string().nullish(),
                metadata: z.record(z.string(), z.unknown()).nullish(),
                bookingFieldsResponses: z.record(z.string(), z.unknown()).nullish(),
              })
              .passthrough(),
          )
          .nullish(),
        bookingFieldsResponses: z.record(z.string(), z.unknown()).nullish(),
        responses: z
          .object({
            notes: z.string().nullish(),
            bookingFields: z.record(z.string(), z.unknown()).nullish(),
            guests: z.array(z.string()).nullish(),
          })
          .passthrough()
          .nullish(),
        metadata: z.record(z.string(), z.unknown()).nullish(),
        rescheduleUid: z.string().nullish(),
        rescheduledBy: z.string().nullish(),
        rescheduleUrl: z.string().nullish(),
        cancellationReason: z.string().nullish(),
        cancelledBy: z.string().nullish(),
        cancelUrl: z.string().nullish(),
      })
      .passthrough()
      .nullish(),
  })
  .passthrough();

export type CalWebhookEnvelope = z.infer<typeof calWebhookSchema>;

export function isHandledTrigger(trigger: string): trigger is (typeof CAL_TRIGGERS)[number] {
  return (CAL_TRIGGERS as readonly string[]).includes(trigger);
}

export function triggerToStatus(trigger: string): BookingStatus {
  switch (trigger) {
    case "BOOKING_RESCHEDULED":
      return "rescheduled";
    case "BOOKING_CANCELLED":
      return "cancelled";
    default:
      return "confirmed";
  }
}

const COMPANY_KEY = /^(company|company_?name|organisation|organization|business|companyName)$/i;
const PHONE_KEY = /^(phone|phone_?number|whatsapp|mobile|contact|whatsapp_?number)$/i;
const NOTES_KEY = /^(notes?|message|comments?|brief|brief_?details|anything_?else)$/i;

function firstString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

/** Scans free-form booking-field answers for a company / phone / notes answer. */
function scanAnswers(
  sources: Array<Record<string, unknown> | null | undefined>,
  matcher: RegExp,
): string | null {
  for (const source of sources) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source)) {
      if (!matcher.test(key)) continue;
      const str = firstString(value);
      if (str) return str;
    }
  }
  return null;
}

export interface NormalizedBooking {
  calUid: string;
  status: BookingStatus;
  eventTitle: string | null;
  startTime: Date | null;
  endTime: Date | null;
  timezone: string | null;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  company: string | null;
  notes: string | null;
  meetingUrl: string | null;
  rescheduleUrl: string | null;
  cancelUrl: string | null;
  rawPayload: Record<string, unknown>;
}

export class CalPayloadError extends Error {}

function parseDate(value: string | null | undefined, label: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new CalPayloadError(`Invalid ${label} in Cal.com payload`);
  }
  return date;
}

/**
 * Turns a validated envelope into the flat shape we persist.
 * Throws CalPayloadError when required data is missing so the route can 422.
 */
export function normalizeCalBooking(envelope: CalWebhookEnvelope): NormalizedBooking {
  const payload = envelope.payload;
  if (!payload) throw new CalPayloadError("Cal.com payload body missing");

  const calUid = firstString(payload.uid);
  if (!calUid) throw new CalPayloadError("Cal.com payload has no booking uid");

  const status = triggerToStatus(envelope.triggerEvent);

  // attendee[0] is the person who booked; that is the client.
  const attendee = payload.attendees?.[0] ?? null;
  const attendeeFields = attendee?.bookingFieldsResponses ?? null;
  const bookingFields = payload.responses?.bookingFields ?? null;
  const bookingFieldsResponses = payload.bookingFieldsResponses ?? null;

  const startTime = parseDate(payload.startTime, "startTime");
  const endTime = parseDate(payload.endTime, "endTime");

  const meetingUrl =
    firstString(payload.location?.link) ??
    firstString(payload.location?.phone) ??
    scanAnswers([attendee?.metadata ?? null], /^(meeting_?url|meetingUrl|meeting_?link)$/i);

  const company = scanAnswers([attendeeFields, bookingFieldsResponses, bookingFields, payload.metadata], COMPANY_KEY);

  const whatsapp =
    firstString(attendee?.phoneNumber) ??
    scanAnswers([attendeeFields, bookingFieldsResponses, bookingFields], PHONE_KEY);

  const notes =
    firstString(payload.responses?.notes) ??
    scanAnswers([attendeeFields, bookingFieldsResponses, bookingFields], NOTES_KEY) ??
    firstString(payload.metadata?.notes);

  const rawPayload: Record<string, unknown> = {
    triggerEvent: envelope.triggerEvent,
    createdAt: envelope.createdAt ?? null,
    payload,
  };

  return {
    calUid,
    status,
    eventTitle: firstString(payload.title),
    startTime,
    endTime,
    timezone: firstString(attendee?.timeZone) ?? firstString(payload.timezone),
    name: firstString(attendee?.name),
    email: firstString(attendee?.email),
    whatsapp,
    company,
    notes,
    meetingUrl,
    rescheduleUrl: firstString(payload.rescheduleUrl),
    cancelUrl: firstString(payload.cancelUrl),
    rawPayload,
  };
}
