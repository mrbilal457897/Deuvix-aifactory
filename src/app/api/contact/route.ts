/**
 * Contact Inquiry API — POST /api/contact
 *
 * Accepts a contact inquiry submission from the /contact page, validates it,
 * persists it to the database, and sends notification + confirmation emails.
 * Email failures never lose the inquiry: the row is written first, emails sent
 * second, and a 502 is returned only if the notification email fails.
 *
 * Security:
 * - Rate limit: 5 per hour per IP (in-memory, per-process)
 * - Honeypot field: bots that fill it get a silent 200
 * - Minimum fill time: 3s after page load (client sets `pageLoadedAt`)
 * - CSRF: Origin/Referer must match the request origin
 * - Request size limit: 64 KB body
 * - All validation server-side with zod
 * - Hashed IP stored, never plaintext
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { getDb } from "@/lib/db";
import { contactInquiries } from "@/lib/db/schema";
import { sql, eq } from "drizzle-orm";
import {
  rateLimit,
  clientKey,
  CONTACT_LIMIT,
  CONTACT_WINDOW_MS,
} from "@/lib/booking/rate-limit";
import {
  inquiryNotificationEmail,
  inquiryConfirmationEmail,
} from "@/lib/email/inquiry-templates";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/* ------------------------------------------------------------------ */
/* Validation                                                         */
/* ------------------------------------------------------------------ */

const UNIT_LIST = [
  "Digital FTE Deployment",
  "AI Chatbots",
  "Voice Agents",
  "Custom Agents",
  "Loop Engineering",
  "FDE Consulting",
  "AI-Powered Web Apps",
  "Not sure yet",
] as const;

const START_WHEN_LIST = ["ASAP", "1–2 months", "Just exploring"] as const;

const VIA_LIST = ["Email", "WhatsApp", "Call"] as const;

const SLOT_LIST = ["Morning", "Afternoon", "Evening"] as const;

const CHANNEL_LIST = ["WhatsApp", "Website chat", "Phone calls", "Email", "CRM", "Spreadsheets"] as const;

const InquirySchema = z.object({
  units: z.array(z.enum(UNIT_LIST)).nonempty("Pick at least one unit."),
  brief: z.string().min(15, "Please add a short description (at least 15 characters).").max(500, "Brief is too long (max 500 characters)."),
  channels: z.array(z.enum(CHANNEL_LIST)).optional().default([]),
  startWhen: z.enum(START_WHEN_LIST).optional().nullable(),
  website: z.string().url("Please enter a valid URL.").optional().nullable().or(z.literal("")),
  name: z.string().min(2, "Please enter your name (at least 2 characters).").max(80, "Name is too long (max 80 characters)."),
  email: z.string().email("Please enter a valid email address.").max(120, "Email is too long (max 120 characters)."),
  company: z.string().max(120, "Company name is too long (max 120 characters).").optional().nullable().or(z.literal("")),
  phone: z.string().regex(/^[\d\s\+\-]{7,20}$/, "Please enter a valid phone number.").optional().nullable().or(z.literal("")),
  via: z.enum(VIA_LIST).default("Email"),
  slot: z.enum(SLOT_LIST).optional().nullable(),
  nda: z.boolean().default(false),
  _website: z.string().optional().nullable().or(z.literal("")),
  pageLoadedAt: z.number().optional().nullable(),
});

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const INQUIRY_PREFIX = "INQ";

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").substring(0, 16);
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "local";
  return request.headers.get("x-real-ip") || "local";
}

function checkOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");
  if (!host) return false;

  const allowedOrigin = `https://${host}`;
  const localhostOrigin = `http://${host}`;

  if (origin && origin !== allowedOrigin && origin !== localhostOrigin) {
    return false;
  }
  if (referer) {
    try {
      const refUrl = new URL(referer);
      if (refUrl.origin !== allowedOrigin && refUrl.origin !== localhostOrigin) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}

async function generateUniqueInquiryId(db: ReturnType<typeof getDb>): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  let attempt = 0;
  while (attempt < 10) {
    const seq = Math.floor(Math.random() * 9000) + 1000;
    const candidate = `${INQUIRY_PREFIX}-${year}-${seq.toString().padStart(4, "0")}`;
    const existing = await db
      .select({ id: contactInquiries.id })
      .from(contactInquiries)
      .where(eq(contactInquiries.inquiryId, candidate))
      .limit(1);
    if (!existing.length) return candidate;
    attempt += 1;
  }
  throw new Error("Unable to generate unique inquiry ID");
}

function computeExpectedReplyAt(): string {
  const now = new Date();
  const pakOffsetMs = 5 * 60 * 60 * 1000;
  const pakNow = new Date(now.getTime() + pakOffsetMs);

  let expected = new Date(pakNow.getTime() + 24 * 60 * 60 * 1000);
  if (expected.getUTCDay() === 0) {
    expected = new Date(expected.getTime() + 24 * 60 * 60 * 1000);
  }

  return expected.toISOString();
}

/* ------------------------------------------------------------------ */
/* POST handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request);
  const limited = rateLimit(clientKey(request, "contact"), CONTACT_LIMIT, CONTACT_WINDOW_MS);
  if (!limited.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "too_many_requests",
        message: `Too many messages sent from this network. Please try again in ${Math.ceil(limited.retryAfterSeconds / 60)} minute(s), or email us directly.`,
      },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  if (!checkOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: "csrf_failed", message: "Request origin not allowed." },
      { status: 403 },
    );
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > 64 * 1024) {
    return NextResponse.json(
      { ok: false, error: "request_too_large", message: "Request body is too large." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json", message: "Invalid JSON body." }, { status: 400 });
  }

  // Honeypot: bots fill the hidden "website" field — silently accept.
  if (body && typeof body === "object" && "_website" in body && (body as Record<string, unknown>)._website) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const pageLoadedAt = body && typeof body === "object" && "pageLoadedAt" in body
    ? Number((body as Record<string, unknown>).pageLoadedAt)
    : null;
  if (pageLoadedAt == null || Number.isNaN(pageLoadedAt) || Date.now() - pageLoadedAt < 3000) {
    return NextResponse.json(
      { ok: false, error: "too_fast", message: "Please take a moment to fill in the form before sending." },
      { status: 400 },
    );
  }

  const parsed = InquirySchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [key, issues] of Object.entries(parsed.error.flatten().fieldErrors)) {
      fieldErrors[key] = issues?.[0] ?? "Invalid value.";
    }
    return NextResponse.json(
      { ok: false, error: "validation_failed", message: "Please fix the highlighted fields.", fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const db = getDb();
  const inquiryId = await generateUniqueInquiryId(db);
  const expectedReplyAt = computeExpectedReplyAt();

  await db.execute(sql`
    INSERT INTO contact_inquiries (
      inquiry_id, status, source_path, ip_hash, user_agent,
      units, brief, channels, start_when, website,
      name, email, company, phone, via, slot, nda,
      expected_reply_at, created_at, updated_at
    ) VALUES (
      ${inquiryId}, 'new', '/contact', ${hashIp(ip)}, ${request.headers.get("user-agent") ?? null},
      ${JSON.stringify(data.units)}, ${data.brief}, ${JSON.stringify(data.channels)},
      ${data.startWhen ?? null}, ${data.website ?? null},
      ${data.name}, ${data.email}, ${data.company ?? null}, ${data.phone ?? null},
      ${data.via}, ${data.slot ?? null}, ${data.nda},
      ${expectedReplyAt}, now(), now()
    ) RETURNING id, inquiry_id
  `);

  const inquiryData = {
    inquiryId,
    name: data.name,
    email: data.email,
    company: data.company ?? undefined,
    phone: data.phone ?? undefined,
    via: data.via,
    slot: data.slot ?? undefined,
    nda: data.nda,
    units: data.units,
    brief: data.brief,
    startWhen: data.startWhen ?? undefined,
    channels: data.channels,
    website: data.website ?? undefined,
    expectedReplyAt,
    sourcePath: "/contact",
  };

  let notificationError: string | null | undefined = null;
  try {
    const notification = inquiryNotificationEmail(inquiryData);
    const notifResult = await sendEmail({
      to: process.env.CONTACT_TO_EMAIL?.split(",").map((e) => e.trim()).filter(Boolean) ||
        [process.env.EMAIL_FROM || "team.deuvix@gmail.com"],
      subject: notification.subject,
      html: notification.html,
      text: notification.text,
      replyTo: data.email,
    });
    if (!notifResult.ok) {
      notificationError = notifResult.error;
    }
  } catch (err) {
    notificationError = err instanceof Error ? err.message : "Unknown email error";
    console.error("[contact] notification email crashed:", notificationError);
  }

  let confirmationError: string | null | undefined = null;
  try {
    const confirmation = inquiryConfirmationEmail(inquiryData);
    const confResult = await sendEmail({
      to: data.email,
      subject: confirmation.subject,
      html: confirmation.html,
      text: confirmation.text,
      replyTo: process.env.CONTACT_TO_EMAIL?.split(",").map((e) => e.trim()).filter(Boolean)[0] ||
        process.env.EMAIL_FROM,
    });
    if (!confResult.ok) {
      confirmationError = confResult.error;
    }
  } catch (err) {
    confirmationError = err instanceof Error ? err.message : "Unknown email error";
    console.error("[contact] confirmation email crashed:", confirmationError);
  }

  if (notificationError || confirmationError) {
    await db.execute(sql`
      UPDATE contact_inquiries
      SET email_error = ${JSON.stringify({ notification: notificationError, confirmation: confirmationError })}
      WHERE inquiry_id = ${inquiryId}
    `);
  }

  if (notificationError) {
    return NextResponse.json(
      {
        ok: false,
        error: "notification_failed",
        saved: true,
        inquiryId,
        message:
          "Your inquiry was saved, but our email provider did not deliver the notification to our team. We still have your message and will pick it up manually — if it is urgent, email us directly at team.deuvix@gmail.com.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      inquiryId,
      emailSent: notificationError == null,
      confirmationSent: confirmationError == null,
    },
    { status: 201 },
  );
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}