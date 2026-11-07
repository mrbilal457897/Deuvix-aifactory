import { z } from "zod";
import { ToolExecutionError, defineTool, type ToolDefinition } from "./types";
import { getLead, createLead, updateLeadNotes, updateLeadPriority, updateLeadStatus, type Lead } from "@/lib/leads";
import { scheduleFollowUp, markFollowUpStatus } from "@/lib/follow-ups";
import {
  createProject,
  deleteProject,
  getProject,
  updateProject,
  PROJECT_STATUSES,
  type ProjectPatch,
} from "@/lib/projects";
import { deleteMedia } from "@/lib/media";
import { deleteUser, getAllUsers, isOwner } from "@/lib/users";
import { readSiteConfig, writeSiteConfig } from "@/lib/site-config-server";
import { SLOT_KEYS, SLOT_LABELS } from "@/lib/site-config";

/**
 * An absolute http(s) image URL, a site-relative path, or "" to clear it.
 *
 * Kept as a plain string on purpose: a `z.union([z.literal(""), ...])` becomes an
 * `any_of` with an empty enum, which the Google provider rejects with a 400
 * ("enum[0]: cannot be empty"), failing the entire request. Format is validated
 * in `execute` via `assertImageUrl` instead.
 */
const imageUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .describe("An http(s) URL, a site path starting with '/', or an empty string to clear it.");

const optionalImageUrl = imageUrlSchema.optional();

const projectStatusSchema = z.enum(PROJECT_STATUSES);
const projectContentSchema = z.string().max(20_000).optional()
  .describe("Markdown case-study content for the project detail page.");

function assertImageUrl(value: string | undefined, field: string): void {
  if (value === undefined || value === "") return;
  if (!/^(https?:\/\/|\/)/i.test(value)) {
    throw new ToolExecutionError(
      `"${field}" must be an http(s) URL or a path starting with '/'.`,
      400,
    );
  }
}

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

const createProjectTool: ToolDefinition<{
  title: string;
  description: string;
  category?: string;
  status?: "draft" | "published";
  image?: string;
  url?: string;
  content?: string;
}> = {
  name: "create_project",
  description:
    "Create a portfolio/case-study project that appears in 'Our live Work'. Give a title and description; status defaults to draft. A project only goes public once BOTH a desktop and a mobile screenshot exist, so a record created here stays a draft until the admin uploads them. `image` seeds the desktop screenshot and `url` is the project's live link. Pass `content` as finished Markdown for the full case study when the admin has asked you to write it. This is a WRITE: it is proposed to the admin and only runs after they confirm.",
  risk: "write",
  roles: ["admin"],
  inputSchema: z.object({
    title: z.string().min(1).max(200).describe("The project title."),
    description: z.string().min(1).max(4000).describe("A short description of the project."),
    category: z.string().max(80).optional().describe("Category label, e.g. AI, Data, Web (default General)."),
    status: projectStatusSchema.optional().describe("draft (default) or published."),
    image: optionalImageUrl.describe("Optional desktop screenshot URL, e.g. from list_media."),
    url: optionalImageUrl.describe("Optional live project URL."),
    content: projectContentSchema,
  }),
  execute: async (input, ctx) => {
    assertImageUrl(input.image, "image");
    assertImageUrl(input.url, "url");
    const project = await createProject(input);
    return {
      projectId: project.id,
      title: project.title,
      category: project.category,
      status: project.status,
      createdBy: ctx.adminEmail,
    };
  },
};

const updateProjectTool: ToolDefinition<{
  id: string;
  title?: string;
  description?: string;
  category?: string;
  status?: "draft" | "published";
  image?: string;
  url?: string;
  content?: string;
}> = {
  name: "update_project",
  description:
    "Change one or more fields of an existing 'Our live Work' project. Identify it by the id from list_projects and pass only the fields that change (title, description, category, status, image, url, content). Setting status to published requires both screenshots to exist. Pass content as finished Markdown for the case-study detail page. This is a WRITE: it is proposed to the admin and only runs after they confirm.",
  risk: "write",
  roles: ["admin"],
  inputSchema: z.object({
    id: z.string().min(1).describe("The project id from list_projects."),
    title: z.string().min(1).max(200).optional().describe("New title."),
    description: z.string().min(1).max(4000).optional().describe("New description."),
    category: z.string().max(80).optional().describe("New category."),
    status: projectStatusSchema.optional().describe("New status (draft/published)."),
    image: optionalImageUrl.describe("New desktop screenshot URL (pass an empty string to clear it)."),
    url: optionalImageUrl.describe("New live URL (pass an empty string to clear it)."),
    content: projectContentSchema,
  }),
  execute: async ({ id, ...patch }, ctx) => {
    const changedFields = Object.keys(patch);
    if (changedFields.length === 0) {
      throw new ToolExecutionError("Provide at least one field to change besides the id.", 400);
    }
    assertImageUrl(patch.image, "image");
    assertImageUrl(patch.url, "url");
    const updated = await updateProject(id, patch as ProjectPatch);
    if (!updated) throw new ToolExecutionError(`Project "${id}" was not found.`, 404);
    return {
      projectId: updated.id,
      title: updated.title,
      status: updated.status,
      changedFields,
      updatedBy: ctx.adminEmail,
    };
  },
};

const setSiteImageTool: ToolDefinition<{ slot: string; imageUrl: string }> = {
  name: "set_site_image",
  description:
    "Replace the image in one of the site's fixed slots (logo, hero background, team photo, etc.). Use list_image_slots for the valid slot keys and their current image. This is a WRITE: it is proposed to the admin and only runs after they confirm.",
  risk: "write",
  roles: ["admin"],
  inputSchema: z.object({
    slot: z.enum(SLOT_KEYS as [string, ...string[]]).describe("The slot key from list_image_slots."),
    imageUrl: imageUrlSchema.describe("The new image URL, e.g. from list_media."),
  }),
  execute: async ({ slot, imageUrl }, ctx) => {
    assertImageUrl(imageUrl, "imageUrl");
    const config = await readSiteConfig();
    config[slot] = imageUrl;
    await writeSiteConfig(config);
    return {
      slot,
      label: SLOT_LABELS[slot] || slot,
      imageUrl,
      updatedBy: ctx.adminEmail,
    };
  },
};

const deleteProjectTool: ToolDefinition<{ id: string }> = {
  name: "delete_project",
  description:
    "Permanently delete a portfolio project. This is DESTRUCTIVE and cannot be undone, so it requires explicit admin confirmation. Identify the project by the id from list_projects.",
  risk: "destructive",
  roles: ["admin"],
  inputSchema: z.object({
    id: z.string().min(1).describe("The project id from list_projects."),
  }),
  execute: async ({ id }, ctx) => {
    const existing = await getProject(id);
    if (!existing) throw new ToolExecutionError(`Project "${id}" was not found.`, 404);
    const ok = await deleteProject(id);
    if (!ok) throw new ToolExecutionError("The project could not be deleted.", 500);
    return { deletedId: id, title: existing.title, deletedBy: ctx.adminEmail };
  },
};

const deleteMediaTool: ToolDefinition<{ id: string }> = {
  name: "delete_media",
  description:
    "Permanently delete an image from the media library, removing both the stored file and its record. This is DESTRUCTIVE and cannot be undone, so it requires explicit admin confirmation. Identify the image by the id from list_media.",
  risk: "destructive",
  roles: ["admin"],
  inputSchema: z.object({
    id: z.string().min(1).describe("The media id from list_media."),
  }),
  execute: async ({ id }, ctx) => {
    const ok = await deleteMedia(id);
    if (!ok) throw new ToolExecutionError(`Media "${id}" was not found.`, 404);
    return { deletedId: id, deletedBy: ctx.adminEmail };
  },
};

const deleteUserTool: ToolDefinition<{ id: string }> = {
  name: "delete_user",
  description:
    "Permanently delete a dashboard user account. Owner/admin accounts and your own account are protected and cannot be deleted. This is DESTRUCTIVE and cannot be undone, so it requires explicit admin confirmation. Identify the user by the id from list_users.",
  risk: "destructive",
  roles: ["admin"],
  inputSchema: z.object({
    id: z.string().min(1).describe("The user id from list_users."),
  }),
  execute: async ({ id }, ctx) => {
    const target = (await getAllUsers()).find((u) => u.id === id);
    if (!target) throw new ToolExecutionError(`User "${id}" was not found.`, 404);
    if (isOwner(target.email) || target.role === "admin") {
      throw new ToolExecutionError("Admin/owner accounts cannot be deleted.", 403);
    }
    if (target.email.toLowerCase() === ctx.adminEmail.toLowerCase()) {
      throw new ToolExecutionError("You cannot delete your own account.", 403);
    }
    const ok = await deleteUser(id);
    if (!ok) throw new ToolExecutionError("The user could not be deleted.", 500);
    return { deletedId: id, email: target.email, deletedBy: ctx.adminEmail };
  },
};

export const writeTools: ToolDefinition[] = [
  defineTool(updateLeadStatusTool),
  defineTool(updateLeadPriorityTool),
  defineTool(updateLeadNotesTool),
  defineTool(scheduleFollowUpTool),
  defineTool(resolveFollowUpTool),
  defineTool(createLeadTool),
  defineTool(createProjectTool),
  defineTool(updateProjectTool),
  defineTool(setSiteImageTool),
  defineTool(deleteProjectTool),
  defineTool(deleteMediaTool),
  defineTool(deleteUserTool),
];