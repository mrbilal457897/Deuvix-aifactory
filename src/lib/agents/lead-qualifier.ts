import { BaseAgent } from "./base-agent";
import type { AgentResult, AgentTask } from "./types";
import type { Contact } from "@/lib/contacts";
import { saveLead, leadFromContact, type Lead } from "@/lib/leads";
import { FollowUpSchedulerAgent } from "./follow-up-scheduler";

const HOT_SERVICES = ["digital fte", "fde", "deployed engineer"];
const WARM_SERVICES = ["web app", "ai-powered", "business ai"];

const BUYING_KEYWORDS = [
  "budget",
  "urgent",
  "deploy",
  "hire",
  "team",
  "project",
  "startup",
  "pricing",
  "cost",
  "scale",
  "automation",
  "timeline",
  "contract",
  "freelance",
  "agency",
];

export class LeadQualifierAgent extends BaseAgent {
  name = "lead-qualifier";
  description =
    "Scores inbound contacts into hot/warm/cold leads, persists them to data/leads.json, and hands off to the follow-up scheduler. Fully autonomous, no manual intervention.";

  async run(task: AgentTask): Promise<AgentResult> {
    const contact = task.input.contact as Contact | undefined;
    if (!contact || !contact.email) {
      return { ok: false, error: "CONTACT_REQUIRED" };
    }

    const score = this.score(contact);
    const status = score >= 8 ? "hot" : score >= 5 ? "warm" : "cold";
    const priority = status === "hot" ? "high" : status === "warm" ? "medium" : "low";

    const lead: Lead = leadFromContact(contact, score, status, priority);
    lead.notes = this.notes(contact);

    await saveLead(lead);
    await this.log("lead_scored", {
      leadId: lead.id,
      score,
      status,
      service: contact.service,
    });

    // Autonomous hand-off: schedule a follow-up based on lead quality.
    const followUp = await new FollowUpSchedulerAgent().run({
      type: "schedule-follow-up",
      input: { lead },
    });

    return {
      ok: true,
      output: {
        leadId: lead.id,
        status,
        score,
        priority,
        followUpScheduled: followUp.ok,
      },
    };
  }

  private score(contact: Contact): number {
    let score = 3;

    const service = contact.service.toLowerCase();
    if (HOT_SERVICES.some((s) => service.includes(s))) score += 4;
    else if (WARM_SERVICES.some((s) => service.includes(s))) score += 2;

    const message = contact.message.toLowerCase();
    const hits = BUYING_KEYWORDS.filter((k) => message.includes(k)).length;
    score += Math.min(hits, 3);

    if (contact.phone) score += 1;
    if (message.length >= 100) score += 1;

    return Math.max(1, Math.min(10, score));
  }

  private notes(contact: Contact): string {
    const parts: string[] = [];
    if (contact.phone) parts.push("phone provided");
    if (contact.service) parts.push(`interested in ${contact.service}`);
    if (contact.message.length >= 100) parts.push("detailed inquiry");
    return parts.join(", ");
  }
}
