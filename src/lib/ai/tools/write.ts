import { z } from "zod";
import { ToolExecutionError, defineTool, type ToolDefinition } from "./types";
import { getLead, createLead, updateLeadNotes, updateLeadPriority, updateLeadStatus, type Lead } from "@/lib/leads";
import { scheduleFollowUp, markFollowUpStatus } from "@/lib/follow-ups";

/**
 * WRITE tools. Their `execute` is the REAL action, but the toolset handed to the
 * model NEVER calls it (see registry.buildTools): writes are proposed and only
 * run when the admin confirms, via registry.executeTool. Keeping the real action
 * here means there is exactly one implementation per write.
 */

const updateLeadStatusTool: ToolDefinition<{ leadId: string; status: Lead["status"] }> = {
  name: "update_lead_status",
  description:
    "Change a lead's qualification status (hot, warm or cold). Identify the lead by the id returned from list_leads. This is a WRITE: it is proposed to the admin and only runs after they confirm.",
  risk: "write",
  roles: ["admin"],
  inputSchema: z.object({
    leadId: z.string().min(1).describe("The lead id from list_leads."),
    status: z.enum(["hot", "warm", "cold"]).describe("The new status."),
  }),
  execute: async ({ leadId, status }, ctx) => {
    await updateLeadStatus(leadId, status);
    return { leadId, status, updatedBy: ctx.adminEmail };
  },
};

const updateLeadPriorityTool: ToolDefinition<{ leadId: string; priority: Lead["priority"] }> = {
  name: "update_lead_priority",
  description:
    "Set a lead's priority (high, medium or low) to control follow-up order. Identify the lead by the id returned from list_leads. This is a WRITE: it is proposed to the admin and only runs after they confirm.",
  risk: "write",
  roles: ["admin"],
  inputSchema: z.object({
    leadId: z.string().min(1).describe("The lead id from list_leads."),
    priority: z.enum(["high", "medium", "low"]).describe("The new priority."),
  }),
  execute: async ({ leadId, priority }, ctx) => {
    await updateLeadPriority(leadId, priority);
    return { leadId, priority, updatedBy: ctx.adminEmail };
  },
};

const updateLeadNotesTool: ToolDefinition<{ leadId: string; notes: string }> = {
  name: "update_lead_notes",
  description:
    "Attach or replace the note on a lead (e.g. a summary of a call). Identify the lead by the id returned from list_leads. This is a WRITE: it is proposed to the admin and only runs after they confirm.",
  risk: "write",
  roles: ["admin"],
  inputSchema: z.object({
    leadId: z.string().min(1).describe("The lead id from list_leads."),
    notes: z.string().max(2000).describe("The note text to store on the lead."),
  }),
  execute: async ({ leadId, notes }, ctx) => {
    await updateLeadNotes(leadId, notes);
    return { leadId, noteCharacters: notes.length, updatedBy: ctx.adminEmail };
  },
};

const scheduleFollowUpTool: ToolDefinition<{
  leadId: string;
  dueInHours: number;
  subject: string;
  body: string;
}> = {
  name: "schedule_follow_up",
  description:
    "Queue an email follow-up for a lead, due in the given number of hours. The lead is looked up by id and the reminder is sent by the existing scheduler. This is a WRITE: it is proposed to the admin and only runs after they confirm.",
  risk: "write",
  roles: ["admin"],
  inputSchema: z.object({
    leadId: z.string().min(1).describe("The lead id from list_leads."),
    dueInHours: z
      .number()
      .int()
      .min(1)
      .max(24 * 14)
      .describe("How many hours from now the reminder is due (1–336)."),
    subject: z.string().min(3).max(200).describe("The reminder's subject line."),
    body: z.string().min(1).max(4000).describe("The reminder body."),
  }),
  execute: async ({ leadId, dueInHours, subject, body }, ctx) => {
    const lead = await getLead(leadId);
    if (!lead) throw new ToolExecutionError(`Lead "${leadId}" was not found.`, 404);
    const followUp = await scheduleFollowUp({ lead, dueInHours, subject, body });
    return {
      followUpId: followUp.id,
      leadId: followUp.leadId,
      dueAt: followUp.dueAt,
      channel: followUp.channel,
      scheduledBy: ctx.adminEmail,
    };
  },
};

const resolveFollowUpTool: ToolDefinition<{
  ids: string[];
  status: "done" | "skipped";
}> = {
  name: "resolve_follow_up",
  description:
    "Mark scheduled follow-up reminders as done or skipped. ids come from list_follow_ups. This is a WRITE: it is proposed to the admin and only runs after they confirm.",
  risk: "write",
  roles: ["admin"],
  inputSchema: z.object({
    ids: z
      .array(z.string().min(1))
      .min(1)
      .max(20)
      .describe("One or more follow-up ids from list_follow_ups."),
    status: z
      .enum(["done", "skipped"])
      .describe("done = the reminder was handled, skipped = it is no longer needed."),
  }),
  execute: async ({ ids, status }, ctx) => {
    const updated = await markFollowUpStatus(ids, status);
    return {
      status,
      updated,
      note: updated === 0 ? "No follow-ups matched those ids." : undefined,
      updatedBy: ctx.adminEmail,
    };
  },
};

const createLeadTool: ToolDefinition<{
  name: string;
  email: string;
  phone?: string;
  service?: string;
  message?: string;
  status?: Lead["status"];
  priority?: Lead["priority"];
}> = {
  name: "create_lead",
  description:
    "Create a new CRM lead from details the admin gives (for example a phone enquiry). Prefer linking an existing contact when one already exists. This is a WRITE: it is proposed to the admin and only runs after they confirm.",
  risk: "write",
  roles: ["admin"],
  inputSchema: z.object({
    name: z.string().min(1).max(200).describe("The lead's full name."),
    email: z.string().email().max(200).describe("The lead's email address."),
    phone: z.string().max(40).optional().describe("Optional phone/WhatsApp number."),
    service: z.string().max(200).optional().describe("Which service they are interested in."),
    message: z.string().max(2000).optional().describe("Optional context or the enquiry text."),
    status: z.enum(["hot", "warm", "cold"]).optional().describe("Initial status (default warm)."),
    priority: z.enum(["high", "medium", "low"]).optional().describe("Initial priority (default medium)."),
  }),
  execute: async (input, ctx) => {
    const lead = await createLead(input);
    return {
      leadId: lead.id,
      name: lead.name,
      email: lead.email,
      status: lead.status,
      priority: lead.priority,
      createdBy: ctx.adminEmail,
    };
  },
};

export const writeTools: ToolDefinition[] = [
  defineTool(updateLeadStatusTool),
  defineTool(updateLeadPriorityTool),
  defineTool(updateLeadNotesTool),
  defineTool(scheduleFollowUpTool),
  defineTool(resolveFollowUpTool),
  defineTool(createLeadTool),
];