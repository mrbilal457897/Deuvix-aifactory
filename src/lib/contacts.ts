import { supabase } from "./supabase";
import { sendEmail, escapeHtml, DEFAULT_CONTACT_TO } from "./email";

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  portfolio?: string;
  message: string;
  leadStatus?: string;
  leadScore?: number;
  emailSent?: boolean;
  emailProvider?: string;
  createdAt: string;
}

function rowToContact(row: Record<string, unknown>): Contact {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    phone: row.phone as string,
    service: row.service as string,
    portfolio: row.portfolio as string | undefined,
    message: row.message as string,
    leadStatus: row.lead_status as string | undefined,
    leadScore: row.lead_score as number | undefined,
    emailSent: row.email_sent as boolean | undefined,
    emailProvider: row.email_provider as string | undefined,
    createdAt: row.created_at as string,
  };
}

export async function saveContact(input: {
  name: string;
  email: string;
  phone: string;
  service: string;
  portfolio?: string;
  message: string;
}): Promise<{ contact: Contact; email: { ok: boolean; provider: string; error?: string } }> {
  const contact: Contact = {
    id: Date.now().toString(),
    name: input.name,
    email: input.email,
    phone: input.phone,
    service: input.service,
    portfolio: input.portfolio || "",
    message: input.message,
    createdAt: new Date().toISOString(),
  };

  const to = process.env.CONTACT_TO_EMAIL || DEFAULT_CONTACT_TO;

  const email = await sendEmail({
    to,
    subject: `New contact request from ${contact.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="margin-top:0;color:#2F6B46">New Contact Request — DEUX AI Factory</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#6b7280;width:110px">Name</td><td style="padding:6px 0;font-weight:600">${escapeHtml(contact.name)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Email</td><td style="padding:6px 0"><a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a></td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Phone</td><td style="padding:6px 0">${escapeHtml(contact.phone || "—")}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Service</td><td style="padding:6px 0">${escapeHtml(contact.service || "—")}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Website</td><td style="padding:6px 0">${contact.portfolio ? `<a href="${escapeHtml(contact.portfolio)}">${escapeHtml(contact.portfolio)}</a>` : "—"}</td></tr>
        </table>
        <div style="margin-top:16px;padding:14px;background:#f9fafb;border-radius:8px;font-size:14px;white-space:pre-wrap">${escapeHtml(contact.message)}</div>
        <p style="margin-top:16px;font-size:12px;color:#9ca3af">Sent via deux-site contact form at ${new Date(contact.createdAt).toUTCString()}</p>
      </div>
    `,
    text: `New contact request from ${contact.name}\n\nName: ${contact.name}\nEmail: ${contact.email}\nPhone: ${contact.phone || "—"}\nService: ${contact.service || "—"}\nWebsite: ${contact.portfolio || "—"}\n\nMessage:\n${contact.message}\n\nSent: ${contact.createdAt}`,
  });

  contact.emailSent = email.ok;
  contact.emailProvider = email.provider;

  await supabase.from("contacts").insert({
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    service: contact.service,
    portfolio: contact.portfolio,
    message: contact.message,
    email_sent: contact.emailSent,
    email_provider: contact.emailProvider,
    created_at: contact.createdAt,
  });

  return { contact, email };
}

export async function listContacts(): Promise<Contact[]> {
  const { data } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
  if (!data) return [];
  return data.map(rowToContact);
}
