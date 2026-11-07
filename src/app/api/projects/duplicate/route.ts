import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/ai/auth";
import { duplicateProject } from "@/lib/projects";

/** POST /api/projects/duplicate — copies a project as an unpublished draft. */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error || "Unauthorized" }, { status: admin.status ?? 401 });
  }

  try {
    const { id } = await request.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing project id" }, { status: 400 });
    }
    const copy = await duplicateProject(id);
    if (!copy) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(copy, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to duplicate project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
