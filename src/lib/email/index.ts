import nodemailer from "nodemailer";

export interface EmailResult {
  ok: boolean;
  provider: "smtp" | "gmail" | "none";
  id?: string;
  error?: string;
}

export const DEFAULT_CONTACT_TO = [
  "sobber.id@gmail.com",
  "deuxaiinfo786@gmail.com",
  "sharshab007@gmail.com",
];

export function getDefaultFrom(): string {
  return process.env.EMAIL_FROM || "DEUX AI Factory <hello@yourdomain.com>";
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
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
