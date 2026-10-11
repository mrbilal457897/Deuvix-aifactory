/**
 * Contact-form email templates. Pure functions — no env access, no I/O — so
 * they can be rendered in a script and eyeballed without a database.
 *
 * Mirrors src/lib/email/booking-templates.ts so both flows share the branded
 * shell in ./layout.
 */
import { BRAND, emailShell, escapeHtml } from "./layout";

export interface ContactEmailData {
  name: string;
  email: string;
  service: string;
  message: string;
}

/**
 * Must stay in step with the promise on the contact form
 * (src/app/(marketing)/contact/page.tsx). One source of truth for the wording
 * so the page and the email cannot drift apart again.
 */
const RESPONSE_WINDOW = "1-2 business days";

/** Matches the From header built in src/lib/email/index.ts (getDefaultFrom). */
const SIGNATURE = BRAND.name;

/**
 * Greeting sent to the person who filled in the contact form.
 *
 * Acknowledges receipt only — no promises beyond RESPONSE_WINDOW and no
 * fabricated timestamps, so nothing here can contradict the dashboard.
 */
export function contactConfirmationEmail(data: ContactEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = data.name.trim().split(/\s+/)[0] || "there";
  // `service` is the closest thing the form captures to a subject line.
  const topic = data.service?.trim();

  const subject = "Got your message — thank you!";

  const received = topic
    ? `Thanks for reaching out! I just received your message about ${topic} and wanted to let you know it landed safely.`
    : "Thanks for reaching out! I just received your message and wanted to let you know it landed safely.";

  const next = `I'll read through it properly and get back to you within ${RESPONSE_WINDOW}. If it's urgent, feel free to just reply to this email directly — it comes straight to my inbox.`;

  const html = emailShell({
    preheader: `Thanks for reaching out, ${firstName}. We reply within ${RESPONSE_WINDOW}.`,
    title: `Hi ${firstName},`,
    intro: received,
    // `content` is injected raw, so every dynamic value is escaped here.
    content: `<p style="margin:0 0 16px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};line-height:1.7;">
      ${escapeHtml(next)}
    </p>
    <p style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};line-height:1.7;">
      Talk soon,<br>${escapeHtml(SIGNATURE)}
    </p>`,
    footerNote: "Reply to this email to continue the conversation.",
  });

  const text = [
    `Hi ${firstName},`,
    "",
    received,
    "",
    next,
    "",
    "Talk soon,",
    SIGNATURE,
  ].join("\n");

  return { subject, html, text };
}