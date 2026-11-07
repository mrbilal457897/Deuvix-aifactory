import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/ai/auth";
import { PROJECT_STATUSES } from "@/lib/live-work/types";
import { fieldError, parseProjectInput } from "@/lib/live-work/schema";
import {
  createProject,
  deleteProject,
  isSlugTaken,
  listProjects,
  reorderProjects,
  updateProject,
} from "@/lib/projects";

const MAX_PROJECTS = 1000;

/**
 * Lenient per-field patch, used when the body is NOT a complete form payload.
 * This is what the AI agent's `update_project` tool sends: only the fields that
 * change, sometimes under their pre-migration names (`title`/`image`/`url`).
 */
const patchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  slug: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().min(1).max(4000).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  featured: z.boolean().optional(),
  order: z.number().int().min(0).max(99999).optional(),
  unitId: z.string().trim().max(32).optional(),
  category: z.string().trim().max(80).optional(),
  liveUrl: z.string().trim().max(500).optional(),
  caseStudyUrl: z.string().trim().max(500).optional(),
  browserUrlLabel: z.string().trim().max(120).optional(),
  chipTitle: z.string().trim().max(60).optional(),
  chipSubtitle: z.string().trim().max(80).optional(),
  content: z.string().max(20000).optional(),
  image: z.string().trim().max(2048).optional(),
  url: z.string().trim().max(500).optional(),
});

/** Server-side guard on every mutation — the middleware check is not enough. */
async function guard(): Promise<NextResponse | null> {
  const admin = await requireAdmin();
  if (admin.ok) return null;
  return NextResponse.json({ error: admin.error || "Unauthorized" }, { status: admin.status ?? 401 });
}

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

function serverError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "Failed to save project";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET() {
  try {
    return NextResponse.json(await listProjects(MAX_PROJECTS));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  try {
    const body = await request.json();
    const parsed = parseProjectInput(body);
    if (!parsed.success) return badRequest(fieldError(parsed, "name") || describe(parsed.error));

    if (await isSlugTaken(parsed.data.slug)) {
      return NextResponse.json({ error: "That slug is already in use" }, { status: 409 });
    }

    const project = await createProject(parsed.data);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  try {
    const body = await request.json();
    if (!body?.id || typeof body.id !== "string") return badRequest("Missing project id");

    // Full form payload → validate the whole thing; otherwise treat it as a patch.
    const full = parseProjectInput(body);
    const patch = full.success ? full.data : patchSchema.parse(body);

    if (full.success && (await isSlugTaken(full.data.slug, body.id))) {
      return NextResponse.json({ error: "That slug is already in use" }, { status: 409 });
    }

    const updated = await updateProject(body.id, patch);
    if (!updated) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return badRequest(describe(error));
    return serverError(error);
  }
}

/** Drag-and-drop reorder: `{ ids: [...] }` in the new top-to-bottom order. */
export async function PATCH(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  try {
    const body = await request.json();
    const ids = z.array(z.string().min(1)).min(1).max(500).parse(body?.ids);
    const updated = await reorderProjects(ids);
    return NextResponse.json({ success: true, updated });
  } catch (error) {
    if (error instanceof z.ZodError) return badRequest(describe(error));
    return serverError(error);
  }
}

export async function DELETE(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  try {
    const { id } = await request.json();
    if (!id || typeof id !== "string") return badRequest("Missing project id");
    const ok = await deleteProject(id);
    if (!ok) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error);
  }
}

function describe(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): string {
  const first = error.issues[0];
  if (!first) return "Invalid input";
  const field = first.path.length > 0 ? String(first.path.join(".")) : "value";
  return `${field}: ${first.message}`;
}
