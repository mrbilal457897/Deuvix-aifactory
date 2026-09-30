/**
 * Email-safe layout helpers. Every value that comes from a user or from a
 * third-party webhook MUST pass through `escapeHtml` before reaching these.
 *
 * Design tokens mirror src/app/globals.css (--primary: #4CAF7D, radius 8px).
 */
import { escapeHtml } from "./index";

export const BRAND = {
  name: "DEUX AI Factory",
  primary: "#4CAF7D",
  primaryDark: "#3d9066",
  ink: "#0F0F0B",
  body: "#1a1a1a",
  muted: "#6b6b6b",
  line: "#e5e5e5",
  surface: "#f6f6f4",
  whatsapp: "#25D366",
} as const;

export const FALLBACK_TIMEZONE = "Asia/Karachi";

export function formatInTimezone(value: Date | string | null | undefined, timeZone?: string | null): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const zone = timeZone?.trim() || FALLBACK_TIMEZONE;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: FALLBACK_TIMEZONE,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }
}

export function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

type BadgeTone = "new" | "rescheduled" | "cancelled";

const BADGE_STYLES: Record<BadgeTone, { bg: string; fg: string; label: string }> = {
  new: { bg: "#4CAF7D", fg: "#0F0F0B", label: "NEW" },
  rescheduled: { bg: "#f5a623", fg: "#0F0F0B", label: "RESCHEDULED" },
  cancelled: { bg: "#e5484d", fg: "#ffffff", label: "CANCELLED" },
};

function statusBadge(tone: BadgeTone): string {
  const s = BADGE_STYLES[tone];
  return `<tr><td style="padding:0 0 20px 0;">
    <span style="display:inline-block;background:${s.bg};color:${s.fg};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;padding:6px 12px;border-radius:6px;">${s.label}</span>
  </td></tr>`;
}

function row(label: string, valueHtml: string): string {
  return `<tr>
    <td style="padding:10px 0;border-top:1px solid ${BRAND.line};width:34%;vertical-align:top;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};">${label}</td>
    <td style="padding:10px 0;border-top:1px solid ${BRAND.line};vertical-align:top;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.body};line-height:1.5;">${valueHtml}</td>
  </tr>`;
}

function button(href: string, label: string, color: string = BRAND.primary, fg: string = "#0F0F0B"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0;"><tr><td style="border-radius:8px;background:${color};">
    <a href="${href}" style="display:inline-block;padding:13px 24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:${fg};text-decoration:none;border-radius:8px;">${label}</a>
  </td></tr></table>`;
}

function preheader(text: string): string {
  return `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${text}</div>`;
}

/** Wraps content in the shared branded shell (table layout, inline styles only). */
export function emailShell(options: { preheader: string; title: string; intro?: string; content: string; footerNote?: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.surface};">
${preheader(escapeHtml(options.preheader))}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.surface};padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td style="padding:0 0 20px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:17px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.2px;">
        <span style="color:${BRAND.primary};">&#9679;</span> ${BRAND.name}
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid ${BRAND.line};border-radius:12px;padding:28px 24px;">
        <h1 style="margin:0 0 8px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:22px;line-height:1.3;color:${BRAND.ink};font-weight:700;">${escapeHtml(options.title)}</h1>
        ${options.intro ? `<p style="margin:0 0 20px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:${BRAND.muted};">${escapeHtml(options.intro)}</p>` : ""}
        ${options.content}
      </td></tr>
      <tr><td style="padding:18px 8px 0 8px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${BRAND.muted};text-align:center;">
        ${BRAND.name} &middot; Digital FTEs &amp; AI Agents<br>
        ${options.footerNote ? escapeHtml(options.footerNote) : "This is an automated message. Reply directly to reach us."}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export { button, row, statusBadge, escapeHtml };
export type { BadgeTone };
