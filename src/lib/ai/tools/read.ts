import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { defineTool, type ToolDefinition } from "./types";
import { listLeads, type Lead } from "@/lib/leads";
import { listContacts } from "@/lib/contacts";
import { countBookings, listBookings, parseBookingFilter, type BookingFilter } from "@/lib/bookings/queries";
import { listFollowUps, type FollowUp } from "@/lib/follow-ups";
import { countFollowUps } from "@/lib/crm";
import { readSiteConfig } from "@/lib/site-config-server";
import { supabase } from "@/lib/supabase";
import { company } from "@config/company";
import { posts } from "@/app/(marketing)/blog/posts";
import { listSkills, loadSkill } from "@/lib/ai/skills";

/* -------------------------------------------------------------------------- */
/* helpers                                                                     */
/* -------------------------------------------------------------------------- */

function clamp(text: string | null | undefined, max: number): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}\u2026` : text;
}

function iso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function readDataFile(name: string): string {
  try {
    return readFileSync(path.join(process.cwd(), "data", name), "utf8");
  } catch {
    return "";
  }
}

interface ProjectRow {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  image: string;
  url: string;
  createdAt: string | null;
}

async function fetchProjects(limit: number): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    title: row.title as string,
    description: clamp(row.description as string, 300),
    category: row.category as string,
    status: row.status as string,
    image: (row.image as string) || "",
    url: (row.url as string) || "",
    createdAt: iso(row.created_at as string),
  }));
}

/** Parses the hand-maintained data/deux-faq.md into question/answer pairs. */
function parseFaq(markdown: string): Array<{ question: string; answer: string }> {
  const cleaned = markdown.replace(/\r/g, "");
  const out: Array<{ question: string; answer: string }> = [];
  const re = /\*\*([^*\n]+)\*\*\s*\n([\s\S]*?)(?=\n\*\*[^*\n]+\*\*\s*\n|\n##\s|$)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(cleaned)) !== null) {
    const question = match[1].trim();
    const answer = match[2].trim();
    if (question && answer) out.push({ question, answer });
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* READ tools                                                                  */
/* -------------------------------------------------------------------------- */

const listLeadsTool: ToolDefinition<{ status?: Lead["status"]; q?: string; limit?: number }> = {
  name: "list_leads",
  description:
    "List CRM leads, newest first. Filter by status (hot/warm/cold) or search by name, email, phone or service. Use for 'show recent leads', 'how many hot leads', or 'find a lead called X'.",
  risk: "read",
  roles: ["admin"],
  inputSchema: z.object({
    status: z.enum(["hot", "warm", "cold"]).optional().describe("Only leads with this status."),
    q: z.string().max(120).optional().describe("Search term matched against name, email, phone or service."),
    limit: z.number().int().min(1).max(50).optional().describe("Max leads to return (default 20, max 50)."),
  }),
  async execute({ status, q, limit }) {
    const all = await listLeads();
    const needle = q?.trim().toLowerCase();
    const filtered = all.filter((l) => {
      if (status && l.status !== status) return false;
      if (needle) {
        const hay = `${l.name} ${l.email} ${l.phone} ${l.service} ${l.message}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const capped = filtered.slice(0, limit ?? 20);
    return {
      total: filtered.length,
      returned: capped.length,
      search: needle || undefined,
      leads: capped.map((l) => ({
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        service: l.service,
        score: l.score,
        status: l.status,
        priority: l.priority,
        message: clamp(l.message, 400),
        createdAt: iso(l.createdAt),
      })),
    };
  },
};

const getLeadTool: ToolDefinition<{ id: string }> = {
  name: "get_lead",
  description: "Fetch one lead by its id (from list_leads or the dashboard).",
  risk: "read",
  roles: ["admin"],
  inputSchema: z.object({ id: z.string().min(1).describe("The lead id.") }),
  async execute({ id }) {
    const lead = (await listLeads()).find((l) => l.id === id);
    if (!lead) return { found: false, id };
    return { found: true, lead: { ...lead, message: clamp(lead.message, 800) } };
  },
};

const listContactsTool: ToolDefinition<{ q?: string; limit?: number }> = {
  name: "list_contacts",
  description:
    "List contact-form submissions, newest first. Optionally search by name, email, phone, service or message text.",
  risk: "read",
  roles: ["admin"],
  inputSchema: z.object({
    q: z.string().max(120).optional().describe("Search term matched against name, email, phone, service or message."),
    limit: z.number().int().min(1).max(50).optional().describe("Max contacts to return (default 20)."),
  }),
  async execute({ q, limit }) {
    const all = await listContacts();
    const needle = q?.trim().toLowerCase();
    const filtered = needle
      ? all.filter((c) =>
          `${c.name} ${c.email} ${c.phone} ${c.service} ${c.message}`
            .toLowerCase()
            .includes(needle),
        )
      : all;
    const capped = filtered.slice(0, limit ?? 20);
    return {
      total: filtered.length,
      returned: capped.length,
      search: needle || undefined,
      contacts: capped.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        service: c.service,
        message: clamp(c.message, 300),
        createdAt: iso(c.createdAt),
      })),
    };
  },
};

const listFollowUpsTool: ToolDefinition<{
  leadId?: string;
  status?: FollowUp["status"];
  limit?: number;
}> = {
  name: "list_follow_ups",
  description:
    "List scheduled follow-up reminders, newest first. Optionally filter by lead id (from list_leads) or status (pending/done/skipped).",
  risk: "read",
  roles: ["admin"],
  inputSchema: z.object({
    leadId: z.string().min(1).optional().describe("Only follow-ups for this lead."),
    status: z
      .enum(["pending", "done", "skipped"])
      .optional()
      .describe("Only follow-ups in this state."),
    limit: z.number().int().min(1).max(50).optional().describe("Max follow-ups (default 20)."),
  }),
  async execute({ leadId, status, limit }) {
    const all = await listFollowUps();
    const filtered = all.filter(
      (f) => (!leadId || f.leadId === leadId) && (!status || f.status === status),
    );
    const capped = filtered.slice(0, limit ?? 20);
    return {
      total: filtered.length,
      returned: capped.length,
      followUps: capped.map((f) => ({
        id: f.id,
        leadId: f.leadId,
        name: f.name,
        email: f.email,
        dueAt: iso(f.dueAt),
        status: f.status,
        subject: clamp(f.subject, 120),
      })),
    };
  },
};

const listBookingsTool: ToolDefinition<{ filter?: BookingFilter; q?: string; limit?: number }> = {
  name: "list_bookings",
  description:
    "List call bookings. Optionally filter by range (upcoming/past/cancelled/all) or search by name, email, company or event title. Searching matches across all bookings.",
  risk: "read",
  roles: ["admin"],
  inputSchema: z.object({
    filter: z
      .enum(["upcoming", "past", "cancelled", "all"])
      .optional()
      .describe("Which bookings to return (default upcoming)."),
    q: z.string().max(120).optional().describe("Search term matched against name, email, company or event title."),
    limit: z.number().int().min(1).max(100).optional().describe("Max bookings to return (default 20, max 100)."),
  }),
  async execute({ filter, q, limit }) {
    const needle = q?.trim().toLowerCase();
    const useFilter = needle ? "all" : parseBookingFilter(filter);
    const rows = await listBookings(useFilter, needle ? 500 : limit ?? 20);
    const filtered = needle ? rows.filter((b) => `${b.name} ${b.email} ${b.company} ${b.eventTitle}`.toLowerCase().includes(needle)) : rows;
    const capped = filtered.slice(0, limit ?? 20);
    return {
      filter: useFilter,
      returned: capped.length,
      search: needle || undefined,
      bookings: capped.map((b) => ({
        id: b.calUid,
        status: b.status,
        name: b.name,
        email: b.email,
        company: b.company,
        eventTitle: b.eventTitle,
        startTime: iso(b.startTime),
        endTime: iso(b.endTime),
        timezone: b.timezone,
        meetingUrl: b.meetingUrl,
      })),
    };
  },
};

const listProjectsTool: ToolDefinition<{ limit?: number }> = {
  name: "list_projects",
  description: "List portfolio/case-study projects, newest first.",
  risk: "read",
  roles: ["admin"],
  inputSchema: z.object({
    limit: z.number().int().min(1).max(50).optional().describe("Max projects (default 20)."),
  }),
  async execute({ limit }) {
    const rows = await fetchProjects(limit ?? 20);
    return { returned: rows.length, projects: rows };
  },
};

const listBlogPostsTool: ToolDefinition<Record<string, never>> = {
  name: "list_blog_posts",
  description:
    "List blog posts (slug, title, category, author, date). The blog is static content: it can be read but not created or edited yet.",
  risk: "read",
  roles: ["admin"],
  inputSchema: z.object({}),
  async execute() {
    return {
      total: posts.length,
      posts: posts.map((p) => ({
        slug: p.slug,
        title: p.title,
        category: p.category,
        author: p.author,
        date: p.date,
        excerpt: clamp(p.excerpt, 240),
      })),
      note: "Static content — reading only. Drafting is not available yet.",
    };
  },
};

const listFaqsTool: ToolDefinition<{ query?: string }> = {
  name: "list_faqs",
  description:
    "List FAQ entries from the hand-maintained knowledge file. Optionally filter by a keyword. Static content: read-only for now.",
  risk: "read",
  roles: ["admin"],
  inputSchema: z.object({
    query: z.string().max(120).optional().describe("Optional keyword to filter questions/answers."),
  }),
  async execute({ query }) {
    const faqs = parseFaq(readDataFile("deux-faq.md"));
    const q = query?.trim().toLowerCase();
    const filtered = q
      ? faqs.filter((f) => `${f.question} ${f.answer}`.toLowerCase().includes(q))
      : faqs;
    return { total: filtered.length, faqs: filtered.slice(0, 50) };
  },
};

const getCompanyInfoTool: ToolDefinition<Record<string, never>> = {
  name: "get_company_info",
  description:
    "Read the company's public/legal identity (name, email, location, working hours, socials). Empty fields mean 'not provided' — never invent them.",
  risk: "read",
  roles: ["admin"],
  inputSchema: z.object({}),
  async execute() {
    const config = await readSiteConfig();
    return {
      legalName: company.legalName,
      tradingName: company.tradingName,
      registrationNumber: company.registrationNumber,
      country: company.country,
      city: company.city,
      registeredAddress: company.registeredAddress,
      businessEmail: company.businessEmail,
      phone: company.phone,
      taxId: company.taxId,
      foundedYear: company.foundedYear,
      workingHours: company.workingHours,
      socials: company.socials,
      imageSlots: config,
      note: "Empty strings mean the value has not been provided. Say so instead of inventing it.",
    };
  },
};

const getSiteStatsTool: ToolDefinition<Record<string, never>> = {
  name: "get_site_stats",
  description:
    "High-level counts for the whole site: leads by status, contacts, bookings, follow-ups, projects, blog posts, FAQs. Use for 'how are we doing' style questions.",
  risk: "read",
  roles: ["admin"],
  inputSchema: z.object({}),
  async execute() {
    const [leads, contacts, followUps, bookings, projects] = await Promise.all([
      listLeads(),
      listContacts(),
      listFollowUps(),
      countBookings(),
      fetchProjects(1),
    ]);
    const faqCount = parseFaq(readDataFile("deux-faq.md")).length;
    return {
      leads: {
        total: leads.length,
        hot: leads.filter((l) => l.status === "hot").length,
        warm: leads.filter((l) => l.status === "warm").length,
        cold: leads.filter((l) => l.status === "cold").length,
      },
      contacts: { total: contacts.length },
      bookings,
      followUps: countFollowUps(followUps),
      projects: { total: projects.length },
      blogPosts: { total: posts.length },
      faqs: { total: faqCount },
      generatedAt: iso(new Date()),
    };
  },
};

const loadSkillTool: ToolDefinition<{ name: string }> = {
  name: "load_skill",
  description:
    "Load the full instructions of a skill by name. Call this before acting on a task whose skill matches (e.g. safe-actions).",
  risk: "read",
  roles: ["admin"],
  inputSchema: z.object({
    name: z.string().min(1).describe("Skill name, e.g. safe-actions."),
  }),
  async execute({ name }) {
    const skill = loadSkill(name);
    if (!skill) {
      return { ok: false, error: "unknown_skill", available: listSkills().map((s) => s.name) };
    }
    return { ok: true, name: skill.name, content: skill.content };
  },
};

/** Every READ tool, in registration order. */
export const readTools: ToolDefinition[] = [
  defineTool(listLeadsTool),
  defineTool(getLeadTool),
  defineTool(listContactsTool),
  defineTool(listFollowUpsTool),
  defineTool(listBookingsTool),
  defineTool(listProjectsTool),
  defineTool(listBlogPostsTool),
  defineTool(listFaqsTool),
  defineTool(getCompanyInfoTool),
  defineTool(getSiteStatsTool),
  defineTool(loadSkillTool),
];
