import { escapeHtml, getDefaultFrom } from "@/lib/email";
import { siteUrl } from "@/lib/mailer";

const BRAND = "Deuvix AI Factory";
const FOOTER = `${BRAND}, Pakistan`;

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f6f4;color:#0e100d;font-family:Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px">
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(title)}</h1>
      ${body}
      <p style="margin:24px 0 0;font-size:12px;color:#6b7280">${FOOTER}</p>
    </td></tr>
  </table></body></html>`;
}

export function newsletterConfirmation(input: { confirmUrl: string; unsubscribeUrl: string }) {
  const url = escapeHtml(input.confirmUrl);
  const unsub = escapeHtml(input.unsubscribeUrl);
  const html = layout(
    "Confirm your subscription",
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6">Thanks for subscribing to ${BRAND}. Please confirm your email address to complete double opt-in.</p>
     <p style="margin:0 0 24px"><a href="${url}" style="display:inline-block;padding:12px 20px;background:#2f6b46;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600">Confirm subscription</a></p>
     <p style="margin:0 0 8px;font-size:12px;color:#6b7280;word-break:break-all">Or paste this link in your browser:<br>${url}</p>
     <p style="margin:0;font-size:12px;color:#6b7280">If you did not request this, you can <a href="${unsub}">unsubscribe</a>.</p>`,
  );
  return {
    subject: `Confirm your ${BRAND} newsletter subscription`,
    html,
    text: `Confirm your ${BRAND} newsletter subscription:\n${input.confirmUrl}\n\nIf you did not request this, unsubscribe here:\n${input.unsubscribeUrl}\n\n${FOOTER}`,
  };
}

export function newsletterWelcome(input: { unsubscribeUrl: string }) {
  const unsub = escapeHtml(input.unsubscribeUrl);
  const html = layout(
    "You're subscribed",
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6">Your subscription to ${BRAND} is confirmed. Thanks for joining.</p>
     <p style="margin:0;font-size:12px;color:#6b7280">You can <a href="${unsub}">unsubscribe</a> at any time.</p>`,
  );
  return {
    subject: `Welcome to the ${BRAND} newsletter`,
    html,
    text: `Your ${BRAND} subscription is confirmed.\n\nUnsubscribe: ${input.unsubscribeUrl}\n\n${FOOTER}`,
  };
}

export function newsletterUrls(token: string, unsubscribeToken: string) {
  const base = siteUrl();
  return {
    // Public page routes, not /api/*: they work even if a stale middleware
    // build still gates API routes behind an admin session.
    confirmUrl: `${base}/newsletter/confirm?token=${encodeURIComponent(token)}`,
    unsubscribeUrl: `${base}/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`,
  };
}

export const NEWSLETTER_FROM = getDefaultFrom();
