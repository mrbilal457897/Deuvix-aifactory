/**
 * Contact inquiry email templates. Pure functions — no env access, no I/O — so
 * they can be rendered in a script and eyeballed without a database.
 *
 * Mirrors src/lib/email/booking-templates.ts so both flows share the branded
 * shell in ./layout.
 */
import { BRAND, emailShell, escapeHtml } from "./layout";

export interface InquiryEmailData {
  inquiryId: string;
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
 * Must stay in step with the prompt on /contact page. One source of truth for
 * the wording so the page and the email cannot drift apart again.
 */
const RESPONSE_WINDOW = "1 business day";

const SIGNATURE = BRAND.name;

export function inquiryConfirmationEmail(data: InquiryEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = data.name.trim().split(/\s+/)[0] || "there";
  const units = data.units.join(", ");
  const website = data.website ? `\nWebsite: ${data.website}` : "";

  const subject = `We got your message (${data.inquiryId})`;

  const html = emailShell({
    preheader: `Ticket ${data.inquiryId} received. A team member will reply by ${data.expectedReplyAt}.`,
    title: `Hi ${firstName},`,
    intro: `Thanks for reaching out to Deuvix AI Factory™. Your inquiry ${data.inquiryId} has been received and we're on it.`,
    content: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:16px 0;border-top:1px solid ${BRAND.line};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};width:34%;vertical-align:top;">Inquiry ID</td>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:${BRAND.ink};">${escapeHtml(data.inquiryId)}</td>
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
          <p style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};line-height:1.7;">${escapeHtml(data.channels.join(", "))}</p>
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
          <p style="margin:0 0 8px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};font-weight:600;letter-spacing:.04em;text-transform:uppercase;">NDA</td>
          <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};line-height:1.7;">You requested an NDA before sharing details.</p>
        </td></tr>
        ` : ""
        }
      </table>
    `,
    footerNote: `Inquiry ${data.inquiryId} · Deuvix AI Factory™ · Reply to this email to continue the conversation.`,
  });

  const text = [
    `Hi ${firstName},`,
    "",
    `Thanks for reaching out to Deuvix AI Factory™. Your inquiry ${data.inquiryId} has been received and we're on it.`,
    "",
    `Inquiry ID: ${data.inquiryId}`,
    `Units: ${units}`,
    `Expected reply: ${data.expectedReplyAt}`,
    `Company: ${data.company || "—"}`,
    `Reply via: ${data.via}${data.slot ? ` · ${data.slot}` : ""}`,
    `NDA: ${data.nda ? "Yes" : "No"}`,
    "",
    "Your message:",
    data.brief,
    "",
    "---",
    `Inquiry ID: ${data.inquiryId}`,
    `Source: ${data.sourcePath}`,
    "",
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}

/**
 * Notification email sent to team.deuvix@gmail.com when a new inquiry arrives.
 */
export function inquiryNotificationEmail(data: InquiryEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = data.name.trim().split(/\s+/)[0] || "there";
  const units = data.units.join(", ");
  const channels = data.channels?.length ? data.channels.join(", ") : "—";
  const start = data.startWhen ? ` — ${data.startWhen}` : "";
  const website = data.website ? `\nWebsite: ${data.website}` : "";

  const subject = `New inquiry ${data.inquiryId}: ${units} from ${data.name}`;

  const html = emailShell({
    preheader: `New inquiry ${data.inquiryId} from ${data.name} (${data.email})`,
    title: `New Inquiry ${data.inquiryId}`,
    intro: `A new inquiry has been submitted via the website contact form.`,
    content: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:16px 0;border-top:1px solid ${BRAND.line};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};width:34%;vertical-align:top;">Inquiry ID</td>
              <td style="padding:6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:${BRAND.ink};">${escapeHtml(data.inquiryId)}</td>
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
    footerNote: `Inquiry ${data.inquiryId} · Reply directly to ${escapeHtml(data.email)} to continue the conversation.`,
  });

  const text = [
    `New Inquiry ${data.inquiryId}`,
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
    `Inquiry ID: ${data.inquiryId}`,
    `Source: ${data.sourcePath}`,
    "",
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}