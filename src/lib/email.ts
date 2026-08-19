import nodemailer from "nodemailer";

export interface EmailResult {
  ok: boolean;
  provider: "gmail" | "resend" | "none";
  id?: string;
  error?: string;
}

export const DEFAULT_CONTACT_TO = [
  "sobber.id@gmail.com",
  "deuxaiinfo786@gmail.com",
  "sharshab007@gmail.com",
];

export function isEmailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) || Boolean(process.env.RESEND_API_KEY);
}

let gmailTransporter: nodemailer.Transporter | null = null;

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

async function sendViaGmail(opts: {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailResult> {
  const transporter = getGmailTransporter();
  if (!transporter) return { ok: false, provider: "none", error: "GMAIL_NOT_CONFIGURED" };

  try {
    const info = await transporter.sendMail({
      from: `"Deux" <${process.env.GMAIL_USER}>`,
      to: opts.to.join(", "),
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return { ok: true, provider: "gmail", id: info.messageId };
  } catch (err) {
    return { ok: false, provider: "gmail", error: err instanceof Error ? err.message : "GMAIL_SEND_FAILED" };
  }
}

async function sendViaResend(opts: {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, provider: "none", error: "EMAIL_NOT_CONFIGURED" };

  const from = process.env.CONTACT_FROM_EMAIL || "Deux <onboarding@resend.dev>";

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
        ...(opts.text ? { text: opts.text } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, provider: "resend", error: `RESEND_ERROR:${res.status}:${detail.slice(0, 200)}` };
    }

    const data = (await res.json()) as { id?: string };
    return { ok: true, provider: "resend", id: data.id };
  } catch (err) {
    return { ok: false, provider: "resend", error: err instanceof Error ? err.message : "EMAIL_SEND_FAILED" };
  }
}

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailResult> {
  const to = Array.isArray(opts.to) ? opts.to : [opts.to];

  const gmail = await sendViaGmail({ to, subject: opts.subject, html: opts.html, text: opts.text });
  if (gmail.ok) return gmail;

  const resend = await sendViaResend({ to, subject: opts.subject, html: opts.html, text: opts.text });
  if (resend.ok) return resend;

  return gmail.error !== "GMAIL_NOT_CONFIGURED" ? gmail : resend;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
