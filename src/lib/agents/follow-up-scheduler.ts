import { BaseAgent } from "./base-agent";
import type { AgentResult, AgentTask } from "./types";
import type { Lead } from "@/lib/leads";
import { scheduleFollowUp } from "@/lib/follow-ups";

export class FollowUpSchedulerAgent extends BaseAgent {
  name = "follow-up-scheduler";
  description =
    "Creates time-boxed, score-aware follow-up tasks in data/follow-ups.json (hot: 4h, warm: 24h, cold: 72h) so no lead is dropped.";

  async run(task: AgentTask): Promise<AgentResult> {
    const lead = task.input.lead as Lead | undefined;
    if (!lead || !lead.email) {
      return { ok: false, error: "LEAD_REQUIRED" };
    }

    const dueInHours = lead.status === "hot" ? 4 : lead.status === "warm" ? 24 : 72;
    const subject =
      lead.status === "hot"
        ? `Quick question about your ${lead.service || "DEUX AI Factory"} inquiry`
        : `Following up on your ${lead.service || "DEUX AI Factory"} inquiry`;

    const body =
      `Hi ${lead.name},\n\n` +
      `Thanks for reaching out to DEUX AI Factory about ${lead.service || "our AI solutions"}. ` +
      `We wanted to follow up on your inquiry and see if you'd like to book a free consultation.\n\n` +
      `We'll reply to any questions — just hit reply on this email.\n\nBest regards,\nThe DEUX AI Factory Team`;

    const entry = await scheduleFollowUp({ lead, dueInHours, subject, body });
    await this.log("followup_scheduled", {
      followUpId: entry.id,
      leadId: lead.id,
      dueAt: entry.dueAt,
      status: lead.status,
    });

    return {
      ok: true,
      output: { followUpId: entry.id, dueAt: entry.dueAt },
    };
  }
}
