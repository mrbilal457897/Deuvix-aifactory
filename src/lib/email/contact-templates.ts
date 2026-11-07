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
 * Ticket data for the new job-ticket flow on /contact.
 */
export interface TicketEmailData {
  ticketId: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  via: string;
  slot?: string;
  nda: boolean;
  units: string[];
  brief: string;
  startWhen?: string;
  channels?: string[];
  website?: string;
  expectedReplyAt: string;
  sourcePath: string;
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

/**
 * Confirmation email sent to the person who submitted a job ticket.
 * Mirrors the wording on /contact so the page and email stay in sync.
 */
export function ticketConfirmationEmail(data: TicketEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = data.name.trim().split(/\s+/)[0] || "there";
  const units = data.units.join(", ");
  const channels = data.channels?.length ? data.channels.join(", ") : "—";
  const start = data.startWhen ? ` — ${data.startWhen}` : "";
  const website = data.website ? `\nWebsite: ${data.website}` : "";

  const subject = `We got your request (${data.ticketId})`;

  const html = emailShell({
    preheader: `Ticket ${data.ticketId} received. A team member will reply by ${data.expectedReplyAt}.`,
    title: `Hi ${firstName},`,
    intro: `Thanks for reaching out to Deuvix AI Factory™. Your job ticket <strong>${data.ticketId}</strong> has been received and we're on it.`,
    content: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:16px 0;border-top:1px solid ${BRAND.line};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};width:34%;vertical-align:top;">Ticket ID</td>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:${BRAND.ink};">${escapeHtml(data.ticketId)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};width:34%;vertical-align:top;">Units</td>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};">${escapeHtml(units)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};width:34%;vertical-align:top;">Expected reply</td>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};font-weight:600;">${escapeHtml(data.expectedReplyAt)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};width:34%;vertical-align:top;">Company</td>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};">${escapeHtml(data.company || "—")}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};width:34%;vertical-align:top;">Reply via</td>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};">${escapeHtml(data.via)}${data.slot ? ` · ${escapeHtml(data.slot)}` : ""}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};width:34%;vertical-align:top;">NDA</td>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};">${data.nda ? "Yes" : "No"}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 0;border-top:1px solid ${BRAND.line};">
          <p style="margin:0 0 8px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};font-weight:600;letter-spacing:.04em;text-transform:uppercase;">Your message</p>
          <p style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};line-height:1.7;white-space:pre-wrap;">${escapeHtml(data.brief)}</p>
        </td></tr>
        ${data.channels?.length ? `
        <tr><td style="padding:16px 0;border-top:1px solid ${BRAND.line};">
          <p style="margin:0 0 8px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};font-weight:600;letter-spacing:.04em;text-transform:uppercase;">Channels today</p>
          <p style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};line-height:1.7;">${escapeHtml(channels)}</p>
        </td></tr>
        ` : ""
        }
        ${data.phone ? `
        <tr><td style="padding:16px 0;border-top:1px solid ${BRAND.line};">
          <p style="margin:0 0 8px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};font-weight:600;letter-spacing:.04em;text-transform:uppercase;">Phone / WhatsApp</p>
          <p style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};line-height:1.7;">${escapeHtml(data.phone)}</p>
        </td></tr>
        ` : ""
        }
        ${data.nda ? `
        <tr><td style="padding:16px 0;border-top:1px solid ${BRAND.line};">
          <p style="margin:0 0 8px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};font-weight:600;letter-spacing:.04em;text-transform:uppercase;">NDA</p>
          <p style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};line-height:1.7;">You requested an NDA before sharing details. A founder will send one over first.</p>
        </td></tr>
        ` : ""
        }
      </table>
    `,
    footerNote: `Ticket ${data.ticketId} · Deuvix AI Factory™ · Reply to this email to continue the conversation.`,
  });

  const text = [
    `Hi ${firstName},`,
    "",
    `Thanks for reaching out to Deuvix AI Factory™. Your job ticket ${data.ticketId} has been received and we're on it.`,
    "",
    `Ticket ID: ${data.ticketId}`,
    `Units: ${units}`,
    `Expected reply: ${data.expectedReplyAt}`,
    `Company: ${data.company || "—"}`,
    `Reply via: ${data.via}${data.slot ? ` · ${data.slot}` : ""}`,
    `NDA: ${data.nda ? "Yes" : "No"}`,
    "",
    "Your message:",
    data.brief,
    data.channels?.length ? "" : "",
    data.channels?.length ? `Channels today: ${channels}` : "",
    data.phone ? `Phone / WhatsApp: ${data.phone}` : "",
    data.nda ? "NDA: Yes — a founder will send one over first." : "",
    "",
    "A team member will reply by the expected time above.",
    "",
    "Talk soon,",
    SIGNATURE,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}

/**
 * Notification email sent to team.deuvix@gmail.com when a new ticket arrives.
 */
export function ticketNotificationEmail(data: TicketEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = data.name.trim().split(/\s+/)[0] || "there";
  const units = data.units.join(", ");
  const channels = data.channels?.length ? data.channels.join(", ") : "—";
  const start = data.startWhen ? ` — ${data.startWhen}` : "";
  const website = data.website ? `\nWebsite: ${data.website}` : "";

  const subject = `New ticket ${data.ticketId}: ${units} from ${data.name}`;

  const html = emailShell({
    preheader: `New job ticket ${data.ticketId} from ${data.name} (${data.email})`,
    title: `New Ticket ${data.ticketId}`,
    intro: `A new job ticket has been submitted via the website contact form.`,
    content: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:16px 0;border-top:1px solid ${BRAND.line};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};width:34%;vertical-align:top;">Ticket ID</td>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:${BRAND.ink};">${escapeHtml(data.ticketId)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};width:34%;vertical-align:top;">From</td>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};">${escapeHtml(data.name)} &lt;${escapeHtml(data.email)}&gt;</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};width:34%;vertical-align:top;">Units</td>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};">${escapeHtml(units)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};width:34%;vertical-align:top;">Start</td>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};">${escapeHtml(data.startWhen || "—")}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};width:34%;vertical-align:top;">Channels</td>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};">${escapeHtml(channels)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};width:34%;vertical-align:top;">Company</td>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};">${escapeHtml(data.company || "—")}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};width:34%;vertical-align:top;">Phone</td>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};">${escapeHtml(data.phone || "—")}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};width:34%;vertical-align:top;">Reply via</td>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};">${escapeHtml(data.via)}${data.slot ? ` · ${escapeHtml(data.slot)}` : ""}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};width:34%;vertical-align:top;">NDA</td>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};">${data.nda ? "Yes — send NDA first" : "No"}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};width:34%;vertical-align:top;">Expected reply</td>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};font-weight:600;">${escapeHtml(data.expectedReplyAt)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};width:34%;vertical-align:top;">Website</td>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};">${escapeHtml(data.website || "—")}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 0;border-top:1px solid ${BRAND.line};">
          <p style="margin:0 0 8px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};font-weight:600;letter-spacing:.04em;text-transform:uppercase;">Brief</p>
          <p style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};line-height:1.7;white-space:pre-wrap;">${escapeHtml(data.brief)}</p>
        </td></tr>
      </table>
    `,
    footerNote: `Ticket ${data.ticketId} · Reply directly to ${escapeHtml(data.email)} to continue the conversation.`,
  });

  const text = [
    `New Ticket ${data.ticketId}`,
    "",
    `From: ${data.name} <${data.email}>`,
    `Units: ${units}`,
    `Start: ${data.startWhen || "—"}`,
    `Channels: ${channels}`,
    `Company: ${data.company || "—"}`,
    `Phone: ${data.phone || "—"}`,
    `Reply via: ${data.via}${data.slot ? ` · ${data.slot}` : ""}`,
    `NDA: ${data.nda ? "Yes — send NDA first" : "No"}`,
    `Expected reply: ${data.expectedReplyAt}`,
    `Website: ${data.website || "—"}`,
    "",
    "Brief:",
    data.brief,
    "",
    "---",
    `Ticket ID: ${data.ticketId}`,
    `Source: ${data.sourcePath}`,
    "",
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}