import { supabase } from "./supabase";
import { sendEmail, escapeHtml, DEFAULT_CONTACT_TO } from "./email";
import { contactConfirmationEmail } from "./email/contact-templates";

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
  confirmationSent?: boolean;
  createdAt: string;
}

export interface ContactEmailOutcome {
  ok: boolean;
  provider: string;
  error?: string;
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
    confirmationSent: row.confirmation_sent as boolean | undefined,
    createdAt: row.created_at as string,
  };
}

/**
 * Internal recipients for new contact submissions.
 *
 * CONTACT_TO_EMAIL holds a comma-separated list so several addresses can be
 * notified at once; falls back to DEFAULT_CONTACT_TO when unset or blank.
 */
export function getContactRecipients(): string[] {
  const configured = process.env.CONTACT_TO_EMAIL?.trim();
  if (!configured) return DEFAULT_CONTACT_TO;

  const parsed = configured
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : DEFAULT_CONTACT_TO;
}

export async function saveContact(input: {
  name: string;
  email: string;
  phone: string;
  service: string;
  portfolio?: string;
  message: string;
}): Promise<{
  contact: Contact;
  notification: ContactEmailOutcome;
  confirmation: ContactEmailOutcome;
}> {
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

  const to = getContactRecipients();

  // replyTo is the sender, so replying to the notification reaches the customer
  // rather than the shared mailbox the site sends from.
  const notification = await sendEmail({
    to,
    subject: `New contact request from ${contact.name}`,
    replyTo: contact.email,
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

  contact.emailSent = notification.ok;
  contact.emailProvider = notification.provider;
  if (!notification.ok) {
    console.error("[contacts] internal notification failed:", notification.error);
  }

  // Customer-facing greeting. Best-effort by design: the submission is already
  // captured above, so a failure here is recorded rather than thrown.
  const greeting = contactConfirmationEmail(contact);
  const confirmation = await sendEmail({
    to: contact.email,
    subject: greeting.subject,
    html: greeting.html,
    text: greeting.text,
    // The From address (EMAIL_FROM) is a real mailbox, so reply already works;
    // replyTo pins the destination to the team inbox as well.
    replyTo: to[0],
  });

  contact.confirmationSent = confirmation.ok;
  if (!confirmation.ok) {
    console.error("[contacts] confirmation email failed:", confirmation.error);
  }

  const row: Record<string, unknown> = {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    service: contact.service,
    portfolio: contact.portfolio,
    message: contact.message,
    email_sent: contact.emailSent,
    email_provider: contact.emailProvider,
    confirmation_sent: contact.confirmationSent,
    created_at: contact.createdAt,
  };

  let { error } = await supabase.from("contacts").insert(row);
  if (error && /confirmation_sent/.test(error.message)) {
    // Column not added yet — see the ALTER TABLE in docs/SETUP.md. Retry without
    // it so the submission is still stored instead of failing outright.
    console.warn(
      "[contacts] confirmation_sent column missing - run the ALTER TABLE from docs/SETUP.md",
    );
    const legacy = { ...row };
    delete legacy.confirmation_sent;
    ({ error } = await supabase.from("contacts").insert(legacy));
  }
  if (error) {
    console.error("[contacts] insert failed:", error.message);
  }

  return { contact, notification, confirmation };
}

export async function listContacts(): Promise<Contact[]> {
  const { data } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
  if (!data) return [];
  return data.map(rowToContact);
}
