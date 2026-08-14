export interface EmailResult {
  ok: boolean;
  provider: "resend" | "none";
  id?: string;
  error?: string;
}

export const DEFAULT_CONTACT_TO = "sobber.id@gmail.com";
const RESEND_API = "https://api.resend.com/emails";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { ok: false, provider: "none", error: "EMAIL_NOT_CONFIGURED" };
  }

  const from =
    process.env.CONTACT_FROM_EMAIL || "Deux <onboarding@resend.dev>";
  const to = Array.isArray(opts.to) ? opts.to : [opts.to];

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: opts.subject,
        html: opts.html,
        ...(opts.text ? { text: opts.text } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        provider: "resend",
        error: `RESEND_ERROR:${res.status}:${detail.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as { id?: string };
    return { ok: true, provider: "resend", id: data.id };
  } catch (err) {
    return {
      ok: false,
      provider: "resend",
      error: err instanceof Error ? err.message : "EMAIL_SEND_FAILED",
    };
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
