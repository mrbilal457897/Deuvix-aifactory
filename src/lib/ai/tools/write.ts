import { z } from "zod";
import { defineTool, type ToolDefinition } from "./types";
import { updateLeadStatus, type Lead } from "@/lib/leads";

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

export const writeTools: ToolDefinition[] = [defineTool(updateLeadStatusTool)];
