import nodemailer from "nodemailer";

export interface EmailResult {
  ok: boolean;
  provider: "resend" | "smtp" | "gmail" | "none";
  id?: string;
  error?: string;
}

export const DEFAULT_CONTACT_TO = [
  "deuxaiinfo786@gmail.com",
];

export function getDefaultFrom(): string {
  return process.env.EMAIL_FROM || "DEUX AI Factory <hello@yourdomain.com>";
}

/**
 * `List-Unsubscribe` target. A `mailto:` to the team inbox rather than an HTTPS
 * endpoint: there is no unsubscribe state in the schema yet, and a link that
 * pretends to unsubscribe but does not is worse than none at all — it would
 * score worse and annoy recipients. Swap this for an HTTPS endpoint once
 * `contacts.unsubscribed_at` exists.
 */
export function getListUnsubscribe(): string | null {
  const to = process.env.NOTIFY_EMAIL?.trim() || DEFAULT_CONTACT_TO[0];
  if (!to) return null;
  return `mailto:${to}?subject=unsubscribe`;
}

/**
 * Gmail's bulk-sender rules expect a one-click List-Unsubscribe on mail sent to
 * strangers, and its absence is a strong negative spam signal.
 */
function unsubscribeHeaders(): Record<string, string> {
  const unsub = getListUnsubscribe();
  if (!unsub) return {};
  return {
    "List-Unsubscribe": `<${unsub}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY ||
      (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
  );
}

/**
 * Resend over HTTPS, preferred whenever RESEND_API_KEY is set.
 *
 * Sending from a consumer mailbox (any @gmail.com / @outlook.com address) cannot
 * pass SPF/DKIM for a domain you control, because those records belong to Google
 * or Microsoft. Gmail then treats the message as unsolicited bulk mail and files
 * it under spam. Resend signs for a verified domain instead, so SPF, DKIM and
 * DMARC all align and the mail lands in the inbox.
 *
 * Calls the REST API with fetch rather than taking the SDK dependency.
 */
async function deliverViaResend(opts: {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, provider: "none", error: "RESEND_NOT_CONFIGURED" };

  // The From domain must be one Resend has verified; `from` overrides the
  // display name while keeping the address in sync with the dashboard.
  const from = process.env.RESEND_FROM?.trim() || getDefaultFrom();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        reply_to: opts.replyTo,
        headers: unsubscribeHeaders(),
      }),
    });

    const body = (await res.json().catch(() => null)) as { id?: string; message?: string } | null;
    if (!res.ok) {
      return { ok: false, provider: "resend", error: body?.message || `RESEND_HTTP_${res.status}` };
    }
    return { ok: true, provider: "resend", id: body?.id };
  } catch (err) {
    return { ok: false, provider: "resend", error: err instanceof Error ? err.message : "RESEND_SEND_FAILED" };
  }
}

let smtpTransporter: nodemailer.Transporter | null = null;
let gmailTransporter: nodemailer.Transporter | null = null;

/** Primary transport: generic SMTP (works with any self-hosted or provider mailbox). */
function getSmtpTransporter(): nodemailer.Transporter | null {
  if (smtpTransporter) return smtpTransporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  smtpTransporter = nodemailer.createTransport({
    host,
    port,
    // 465 is implicit TLS; everything else uses STARTTLS.
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass },
    pool: true,
    maxConnections: 3,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
  });
  return smtpTransporter;
}

/** Legacy fallback kept so existing Gmail-only deployments do not break on upgrade. */
function getGmailTransporter(): nodemailer.Transporter | null {
  if (gmailTransporter) return gmailTransporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  gmailTransporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  return gmailTransporter;
}

async function deliver(
  transporter: nodemailer.Transporter | null,
  provider: "smtp" | "gmail",
  opts: { to: string[]; subject: string; html: string; text?: string; replyTo?: string },
): Promise<EmailResult> {
  if (!transporter) {
    return { ok: false, provider: "none", error: `${provider.toUpperCase()}_NOT_CONFIGURED` };
  }

  try {
    const info = await transporter.sendMail({
      from: getDefaultFrom(),
      to: opts.to.join(", "),
      replyTo: opts.replyTo,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      headers: unsubscribeHeaders(),
    });
    return { ok: true, provider, id: info.messageId };
  } catch (err) {
    return { ok: false, provider, error: err instanceof Error ? err.message : `${provider.toUpperCase()}_SEND_FAILED` };
  }
}

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<EmailResult> {
  const to = Array.isArray(opts.to) ? opts.to : [opts.to];

  // Resend first: it is the only transport that can present a verified sending
  // domain, which is what keeps the message out of the spam folder.
  if (process.env.RESEND_API_KEY?.trim()) {
    const resend = await deliverViaResend({ ...opts, to });
    if (resend.ok) return resend;
    console.error("[email] resend failed, falling back to SMTP:", resend.error);
  }

  const smtp = await deliver(getSmtpTransporter(), "smtp", { ...opts, to });
  if (smtp.ok) return smtp;

  const gmail = await deliver(getGmailTransporter(), "gmail", { ...opts, to });
  if (gmail.ok) return gmail;

  console.error(`[email] all transports failed. smtp=${smtp.error} gmail=${gmail.error}`);
  return smtp.error !== "SMTP_NOT_CONFIGURED" ? smtp : gmail;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
