import { getDefaultFrom, sendEmail, type EmailResult } from "@/lib/email";

/**
 * Transactional mail wrapper.
 *
 * Reuses the existing transport chain in lib/email (Resend -> Hostinger SMTP
 * -> Gmail). Set SMTP_HOST=smtp.hostinger.com, SMTP_PORT=465, SMTP_USER and
 * SMTP_PASS in the environment to deliver through Hostinger SMTP. Credentials
 * are never read in client code and never logged.
 *
 * TODO(bulk): do NOT send newsletters or other bulk mail through Hostinger
 * SMTP. When bulk sending is needed, add a provider abstraction here (e.g.
 * Brevo/Resend) and route campaigns through it; this module stays reserved for
 * transactional and double-opt-in confirmation messages.
 */
export function mailFrom(): string {
  return process.env.MAIL_FROM?.trim() || getDefaultFrom();
}

export function adminRecipient(): string {
  return process.env.MAIL_TO_ADMIN?.trim() || mailFrom();
}

export function siteUrl(): string {
  // Fallback to the canonical origin: a relative link in an email is broken in
  // most mail clients and can land the visitor on the wrong host.
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://deuvix-ai.com").replace(/\/+$/, "");
}

export function sendTransactional(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<EmailResult> {
  // Strip CR/LF from header values to prevent header injection.
  const clean = (value: string) => value.replace(/[\r\n]+/g, " ").trim();
  return sendEmail({
    to: clean(opts.to),
    subject: clean(opts.subject),
    html: opts.html,
    text: opts.text,
    ...(opts.replyTo ? { replyTo: clean(opts.replyTo) } : {}),
  });
}

export function mailerConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY ||
      (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
  );
}
