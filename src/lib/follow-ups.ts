import { supabase } from "./supabase";
import type { Lead } from "./leads";

export interface FollowUp {
  id: string;
  leadId: string;
  email: string;
  name: string;
  dueAt: string;
  channel: "email";
  subject: string;
  body: string;
  status: "pending" | "done" | "skipped";
  createdAt: string;
}

function rowToFollowUp(row: Record<string, unknown>): FollowUp {
  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    email: row.email as string,
    name: row.name as string,
    dueAt: row.due_at as string,
    channel: "email",
    subject: row.subject as string,
    body: row.body as string,
    status: (row.status as "pending" | "done" | "skipped") || "pending",
    createdAt: row.created_at as string,
  };
}

export async function scheduleFollowUp(input: {
  lead: Lead;
  dueInHours: number;
  subject: string;
  body: string;
}): Promise<FollowUp> {
  const entry: FollowUp = {
    id: `followup_${Date.now()}`,
    leadId: input.lead.id,
    email: input.lead.email,
    name: input.lead.name,
    dueAt: new Date(Date.now() + input.dueInHours * 3_600_000).toISOString(),
    channel: "email",
    subject: input.subject,
    body: input.body,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  await supabase.from("follow_ups").insert({
    id: entry.id,
    lead_id: entry.leadId,
    email: entry.email,
    name: entry.name,
    due_at: entry.dueAt,
    channel: entry.channel,
    subject: entry.subject,
    body: entry.body,
    status: entry.status,
    created_at: entry.createdAt,
  });

  return entry;
}

export async function listFollowUps(): Promise<FollowUp[]> {
  const { data } = await supabase.from("follow_ups").select("*").order("created_at", { ascending: false });
  if (!data) return [];
  return data.map(rowToFollowUp);
}

/**
 * Resolves follow-ups as done or skipped.
 *
 * Only ever called when an admin clicks the button in /deux/leads — never on a
 * schedule. Accepts every id in a collapsed duplicate group so one click clears
 * the lot. Returns the number of rows actually updated.
 */
export async function markFollowUpStatus(
  ids: string[],
  status: "done" | "skipped",
): Promise<number> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return 0;

  const { data, error } = await supabase
    .from("follow_ups")
    .update({ status })
    .in("id", unique)
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}
