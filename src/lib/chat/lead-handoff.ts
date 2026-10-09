/**
 * Lead handoff to the founders (§5).
 *
 * Consent is mandatory, inputs are validated with zod, payment data is
 * redacted before storage, and the success copy promises nothing beyond
 * "the founders will get your message".
 */

import { z } from "zod";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { chatLeads } from "@/lib/db/schema";
import { sendEmail, escapeHtml, DEFAULT_CONTACT_TO } from "@/lib/email";
import { foundersContact, chatConfig } from "./config";
import { redact } from "./redact";
import { uiStrings } from "./ui-strings";

export const leadSchema = z.object({
  name: z.string().trim().min(2, uiStrings.leadValidation.name).max(80),
  contact: z
    .string()
    .trim()
    .min(5, uiStrings.leadValidation.contact)
    .max(120)
    .refine(
      (v) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ||
        /^\+?[0-9][0-9\s\-().]{7,19}$/.test(v),
      uiStrings.leadValidation.contact,
    ),
  summary: z.string().trim().min(10, uiStrings.leadValidation.summary).max(500),
  consent: z.literal(true, {
    message: uiStrings.leadValidation.consent,
  }),
});

export type LeadInput = z.infer<typeof leadSchema>;

export type LeadResult =
  | { ok: true }
  | { ok: false; field?: string; message: string };

export async function submitLead(raw: unknown): Promise<LeadResult> {
  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, field: first?.path?.[0] as string | undefined, message: first?.message || uiStrings.leadError };
  }

  const data = parsed.data;
  // Never persist card/bank material a user may have pasted into the summary.
  const safeSummary = redact(data.summary, false).text;
  const safeContact = redact(data.contact, false).text;
  const safeName = data.name.replace(/[<>]/g, "").slice(0, 80);

  if (isDatabaseConfigured()) {
    try {
      await getDb().insert(chatLeads).values({
        name: safeName,
        contact: safeContact,
        summary: safeSummary,
        consent: true,
        channel: /@/.test(safeContact) ? "email" : "whatsapp",
      });
    } catch {
      // Storage failure must not block delivery — the email below is the
      // primary channel the founders actually read.
    }
  }

  const delivered = await deliverLead({ name: safeName, contact: safeContact, summary: safeSummary });
  return delivered;
}

async function deliverLead(data: { name: string; contact: string; summary: string }): Promise<LeadResult> {
  const webhook = foundersContact.leadWebhook;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "deux-chat",
          ...data,
          consent: true,
          at: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return { ok: true };
    } catch {
      // fall through to email
    }
  }

  const to = foundersContact.email || DEFAULT_CONTACT_TO;
  if (!to || to.length === 0) return { ok: false, message: uiStrings.leadError };

  try {
    const result = await sendEmail({
      to,
      subject: `Chat lead — ${data.name}`,
      replyTo: /@/.test(data.contact) ? data.contact : undefined,
      text: [
        "New lead from the website chatbot.",
        "",
        `Name: ${data.name}`,
        `Contact: ${data.contact}`,
        `Problem: ${data.summary}`,
        "",
        "Consent was given in the chat before sending.",
      ].join("\n"),
      html: `
        <p>New lead from the website chatbot.</p>
        <table cellpadding="6" style="border-collapse:collapse">
          <tr><td><strong>Name</strong></td><td>${escapeHtml(data.name)}</td></tr>
          <tr><td><strong>Contact</strong></td><td>${escapeHtml(data.contact)}</td></tr>
          <tr><td><strong>Problem</strong></td><td>${escapeHtml(data.summary)}</td></tr>
        </table>
        <p style="color:#666;font-size:12px">Consent was given in the chat before sending.</p>`,
    });
    return result.ok ? { ok: true } : { ok: false, message: uiStrings.leadError };
  } catch {
    return { ok: false, message: uiStrings.leadError };
  }
}

/** Static contact card shown regardless of whether the lead form is used. */
export function contactCard() {
  return {
    email: foundersContact.email || DEFAULT_CONTACT_TO[0] || "",
    url: foundersContact.url,
    whatsapp: foundersContact.whatsapp,
    bookCall: "/book-a-call",
    timeoutMs: chatConfig.timeoutMs,
  };
}
