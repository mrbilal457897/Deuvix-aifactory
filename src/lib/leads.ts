import fs from "fs/promises";
import path from "path";
import type { Contact } from "@/lib/contacts";

export interface Lead {
  id: string;
  contactId?: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  score: number;
  status: "hot" | "warm" | "cold";
  priority: "high" | "medium" | "low";
  notes?: string;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const LEADS_PATH = path.join(DATA_DIR, "leads.json");

async function readLeads(): Promise<Lead[]> {
  try {
    const raw = await fs.readFile(LEADS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function listLeads(): Promise<Lead[]> {
  return readLeads();
}

export async function saveLead(lead: Lead): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const leads = await readLeads();
  leads.unshift(lead);
  await fs.writeFile(LEADS_PATH, JSON.stringify(leads, null, 2));
}

export async function updateLeadStatus(id: string, status: Lead["status"]): Promise<void> {
  const leads = await readLeads();
  const index = leads.findIndex((l) => l.id === id);
  if (index === -1) return;
  leads[index].status = status;
  await fs.writeFile(LEADS_PATH, JSON.stringify(leads, null, 2));
}

export function leadFromContact(contact: Contact, score: number, status: Lead["status"], priority: Lead["priority"]): Lead {
  return {
    id: `lead_${contact.id}`,
    contactId: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    service: contact.service,
    message: contact.message,
    score,
    status,
    priority,
    createdAt: contact.createdAt,
  };
}
