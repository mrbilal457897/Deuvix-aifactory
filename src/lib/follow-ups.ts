import fs from "fs/promises";
import path from "path";
import type { Lead } from "@/lib/leads";

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

const DATA_DIR = path.join(process.cwd(), "data");
const PATH = path.join(DATA_DIR, "follow-ups.json");

export async function scheduleFollowUp(input: {
  lead: Lead;
  dueInHours: number;
  subject: string;
  body: string;
}): Promise<FollowUp> {
  await fs.mkdir(DATA_DIR, { recursive: true });

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

  let items: FollowUp[] = [];
  try {
    items = JSON.parse(await fs.readFile(PATH, "utf-8"));
  } catch {}

  items.unshift(entry);
  await fs.writeFile(PATH, JSON.stringify(items, null, 2));
  return entry;
}

export async function listFollowUps(): Promise<FollowUp[]> {
  try {
    const raw = await fs.readFile(PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
