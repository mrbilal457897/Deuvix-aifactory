/**
 * Read-only CRM aggregation for the /deux/leads dashboard.
 *
 * Every function here is pure — no database, no network. All timestamps are
 * normalised to ISO so the dashboard's string sort (components/dashboard/
 * data-table.tsx) is chronologically correct even though Supabase returns
 * mixed offsets and fractional-second widths.
 */
import type { Contact } from "./contacts";
import type { Lead } from "./leads";
import type { FollowUp } from "./follow-ups";

export interface ClientSummary {
  email: string;
  name: string;
  phone: string;
  service: string;
  firstContactAt: string;
  lastContactAt: string;
  /** How many separate submissions this person sent. */
  contactCount: number;
  // Nullable: a contact can exist without a lead row.
  score: number | null;
  status: Lead["status"] | null;
  priority: Lead["priority"] | null;
  notificationSent: boolean;
  greetingSent: boolean;
  pendingFollowUps: number;
}

export interface FollowUpSummary {
  id: string;
  leadId: string;
  email: string;
  name: string;
  dueAt: string;
  overdue: boolean;
  subject: string;
  body: string;
  status: FollowUp["status"];
  /** Identical pending rows collapsed into this one. */
  duplicateCount: number;
  /** Every id in the collapsed group, so "mark done" clears them all. */
  duplicateIds: string[];
  isInternal: boolean;
}

export interface FollowUpCounts {
  pending: number;
  done: number;
  skipped: number;
  overdue: number;
}

function toMs(value: string): number {
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

/** Normalises any Supabase timestamp to a sortable ISO string. */
function iso(value: string): string {
  return new Date(toMs(value)).toISOString();
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Test mailboxes and our own accounts. The lead qualifier creates a follow-up
 * for every submission, so these show up as pending work that must never be
 * emailed. Hidden behind a toggle in the dashboard by default.
 */
const INTERNAL_LOCAL_PARTS = [/^test/i, /^sobber/i, /^bilal/i];
const PLACEHOLDER_DOMAINS = /^(example|test)\.(com|org|net)$/;

export function isInternalAddress(email: string): boolean {
  const value = normaliseEmail(email);
  if (!value) return false;
  const at = value.lastIndexOf("@");
  if (at < 1) return false;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (PLACEHOLDER_DOMAINS.test(domain)) return true;
  return INTERNAL_LOCAL_PARTS.some((re) => re.test(local));
}

/**
 * One row per real person. Repeat submissions collapse together and
 * lastContactAt is the newest row, which is what "last time they approached"
 * means in practice.
 *
 * Score/status/priority come from `leads`, not from `contacts`: the
 * lead_status/lead_score columns on contacts are written by nobody.
 */
export function summariseClients(
  contacts: Contact[],
  leads: Lead[],
  followUps: FollowUp[],
): ClientSummary[] {
  const byEmail = new Map<string, Contact[]>();
  for (const contact of contacts) {
    const key = normaliseEmail(contact.email);
    if (!key) continue;
    const bucket = byEmail.get(key);
    if (bucket) bucket.push(contact);
    else byEmail.set(key, [contact]);
  }

  const newestLead = new Map<string, Lead>();
  for (const lead of leads) {
    const key = normaliseEmail(lead.email);
    if (!key) continue;
    const held = newestLead.get(key);
    if (!held || toMs(lead.createdAt) > toMs(held.createdAt)) newestLead.set(key, lead);
  }

  const pendingByEmail = new Map<string, number>();
  for (const followUp of followUps) {
    if (followUp.status !== "pending") continue;
    const key = normaliseEmail(followUp.email);
    pendingByEmail.set(key, (pendingByEmail.get(key) ?? 0) + 1);
  }

  const out: ClientSummary[] = [];
  for (const [email, rows] of byEmail) {
    const sorted = [...rows].sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
    const first = sorted[0];
    const latest = sorted[sorted.length - 1];
    const lead = newestLead.get(email);

    out.push({
      email,
      name: latest.name || lead?.name || "",
      phone: latest.phone || lead?.phone || "",
      service: latest.service || lead?.service || "",
      firstContactAt: iso(first.createdAt),
      lastContactAt: iso(latest.createdAt),
      contactCount: rows.length,
      score: lead?.score ?? null,
      status: lead?.status ?? null,
      priority: lead?.priority ?? null,
      notificationSent: latest.emailSent === true,
      greetingSent: latest.confirmationSent === true,
      pendingFollowUps: pendingByEmail.get(email) ?? 0,
    });
  }

  return out.sort((a, b) => toMs(b.lastContactAt) - toMs(a.lastContactAt));
}

/**
 * Pending follow-ups only — resolved rows are history, not work.
 *
 * The lead qualifier emits one follow-up per submission, so the same person can
 * get several identical pending rows. Same email + same subject collapse into
 * one actionable item; the most overdue row represents the group.
 */
export function summariseFollowUps(
  followUps: FollowUp[],
  now: Date = new Date(),
): FollowUpSummary[] {
  const groups = new Map<string, FollowUp[]>();
  for (const followUp of followUps) {
    if (followUp.status !== "pending") continue;
    const key = `${normaliseEmail(followUp.email)}\u0000${followUp.subject.trim().toLowerCase()}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(followUp);
    else groups.set(key, [followUp]);
  }

  const nowMs = now.getTime();
  const out: FollowUpSummary[] = [];

  for (const rows of groups.values()) {
    const sorted = [...rows].sort((a, b) => toMs(a.dueAt) - toMs(b.dueAt));
    const lead = sorted[0];
    out.push({
      id: lead.id,
      leadId: lead.leadId,
      email: lead.email,
      name: lead.name,
      dueAt: iso(lead.dueAt),
      overdue: toMs(lead.dueAt) < nowMs,
      subject: lead.subject,
      body: lead.body,
      status: lead.status,
      duplicateCount: sorted.length,
      duplicateIds: sorted.map((row) => row.id),
      isInternal: isInternalAddress(lead.email),
    });
  }

  return out.sort((a, b) => toMs(a.dueAt) - toMs(b.dueAt));
}

export function countFollowUps(
  followUps: FollowUp[],
  now: Date = new Date(),
): FollowUpCounts {
  const nowMs = now.getTime();
  let pending = 0;
  let done = 0;
  let skipped = 0;
  let overdue = 0;
  for (const followUp of followUps) {
    if (followUp.status === "done") done += 1;
    else if (followUp.status === "skipped") skipped += 1;
    else if (toMs(followUp.dueAt) < nowMs) {
      pending += 1;
      overdue += 1;
    } else pending += 1;
  }
  return { pending, done, skipped, overdue };
}

/**
 * Opens the visitor's own mail client with the drafted follow-up pre-filled.
 * The app never sends anything — the human presses Send. That is the whole
 * point: no automatic outreach to real prospects.
 */
export function followUpMailto(row: {
  email: string;
  subject: string;
  body: string;
}): string {
  const subject = encodeURIComponent(row.subject);
  const body = encodeURIComponent(row.body);
  return `mailto:${row.email}?subject=${subject}&body=${body}`;
}