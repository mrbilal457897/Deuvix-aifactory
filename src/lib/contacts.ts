import fs from "fs/promises";
import path from "path";
import { sendEmail, escapeHtml, DEFAULT_CONTACT_TO } from "./email";

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  leadStatus?: string;
  leadScore?: number;
  emailSent?: boolean;
  emailProvider?: string;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const CONTACTS_PATH = path.join(DATA_DIR, "contacts.json");

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function readContacts(): Promise<Contact[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(CONTACTS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeContacts(items: Contact[]) {
  await ensureDataDir();
  await fs.writeFile(CONTACTS_PATH, JSON.stringify(items, null, 2));
}

export async function saveContact(input: {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
}): Promise<{ contact: Contact; email: { ok: boolean; provider: string; error?: string } }> {
  const contact: Contact = {
    id: Date.now().toString(),
    name: input.name,
    email: input.email,
    phone: input.phone,
    service: input.service,
    message: input.message,
    createdAt: new Date().toISOString(),
  };

  const to = process.env.CONTACT_TO_EMAIL || DEFAULT_CONTACT_TO;

  const email = await sendEmail({
    to,
    subject: `New contact request from ${contact.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="margin-top:0;color:#2F6B46">New Contact Request — Deux</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#6b7280;width:110px">Name</td><td style="padding:6px 0;font-weight:600">${escapeHtml(contact.name)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Email</td><td style="padding:6px 0"><a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a></td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Phone</td><td style="padding:6px 0">${escapeHtml(contact.phone || "—")}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Service</td><td style="padding:6px 0">${escapeHtml(contact.service || "—")}</td></tr>
        </table>
        <div style="margin-top:16px;padding:14px;background:#f9fafb;border-radius:8px;font-size:14px;white-space:pre-wrap">${escapeHtml(contact.message)}</div>
        <p style="margin-top:16px;font-size:12px;color:#9ca3af">Sent via deux-site contact form at ${new Date(contact.createdAt).toUTCString()}</p>
      </div>
    `,
    text: `New contact request from ${contact.name}\n\nName: ${contact.name}\nEmail: ${contact.email}\nPhone: ${contact.phone || "—"}\nService: ${contact.service || "—"}\n\nMessage:\n${contact.message}\n\nSent: ${contact.createdAt}`,
  });

  contact.emailSent = email.ok;
  contact.emailProvider = email.provider;

  const items = await readContacts();
  items.unshift(contact);
  await writeContacts(items);

  return { contact, email };
}

export async function listContacts(): Promise<Contact[]> {
  return readContacts();
}
