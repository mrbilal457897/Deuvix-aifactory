import { supabase } from "./supabase";
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

function rowToLead(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    contactId: row.contact_id as string | undefined,
    name: row.name as string,
    email: row.email as string,
    phone: row.phone as string,
    service: row.service as string,
    message: row.message as string,
    score: row.score as number,
    status: (row.status as "hot" | "warm" | "cold") || "cold",
    priority: (row.priority as "high" | "medium" | "low") || "low",
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
  };
}

export async function listLeads(): Promise<Lead[]> {
  const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (!data) return [];
  return data.map(rowToLead);
}

export async function saveLead(lead: Lead): Promise<void> {
  await supabase.from("leads").insert({
    id: lead.id,
    contact_id: lead.contactId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    service: lead.service,
    message: lead.message,
    score: lead.score,
    status: lead.status,
    priority: lead.priority,
    notes: lead.notes,
    created_at: lead.createdAt,
  });
}

export async function updateLeadStatus(id: string, status: Lead["status"]): Promise<void> {
  await supabase.from("leads").update({ status }).eq("id", id);
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
