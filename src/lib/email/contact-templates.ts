/**
 * Contact-form email templates. Pure functions — no env access, no I/O — so
 * they can be rendered in a script and eyeballed without a database.
 *
 * Mirrors src/lib/email/booking-templates.ts so both flows share the branded
 * shell in ./layout.
 */
import { BRAND, emailShell, escapeHtml, row } from "./layout";

export interface ContactEmailData {
  name: string;
  email: string;
  service: string;
  message: string;
  createdAt: string;
}

/**
 * Greeting sent to the person who filled in the contact form.
 *
 * Keeps the promise the form already makes ("within one business day", see
 * src/app/(marketing)/contact/page.tsx) so the email and the page agree.
 */
export function contactConfirmationEmail(data: ContactEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = data.name.trim().split(/\s+/)[0] || "there";
  // `service` is the closest thing the form captures to a subject line.
  const topic = data.service?.trim();
  const received = new Date(data.createdAt).toUTCString();

  const subject = `${BRAND.name}: we got your message, ${firstName}`;

  const html = emailShell({
    preheader: `Thanks for reaching out, ${firstName}. We reply within one business day.`,
    title: `Thanks for reaching out, ${firstName}`,
    intro: topic
      ? `Your message about ${topic} arrived safely — nothing more is needed from you right now.`
      : "Your message arrived safely — nothing more is needed from you right now.",
    content: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row("About", escapeHtml(topic || "Your enquiry"))}
      ${row("Received", escapeHtml(received))}
    </table>
    <p style="margin:20px 0 0 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};line-height:1.7;">
      A real person on our side reads every message and replies within one business day.
      If anything else comes up in the meantime, just hit reply — it reaches us directly.
    </p>`,
    footerNote: "Reply to this email to continue the conversation.",
  });

  const text = [
    `${BRAND.name} — thanks for reaching out, ${firstName}`,
    "",
    topic ? `We received your message about ${topic}.` : "We received your message.",
    `Received: ${received}`,
    "",
    "A real person on our side reads every message and replies within one business day.",
    "Just hit reply on this email to continue the conversation.",
  ].join("\n");

  return { subject, html, text };
}
