import { NextResponse } from "next/server";
import { createProject, deleteProject, listProjects, updateProject } from "@/lib/projects";

const MAX_PROJECTS = 1000;

export async function GET() {
  try {
    return NextResponse.json(await listProjects(MAX_PROJECTS));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const project = await createProject({
      title: body.title,
      description: body.description,
      category: body.category,
      status: body.status,
      image: body.image,
      url: body.url,
    });
    return NextResponse.json(project, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const updated = await updateProject(body.id, {
      title: body.title,
      description: body.description,
      category: body.category,
      status: body.status,
      image: body.image,
      url: body.url,
    });
    if (!updated) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    const ok = await deleteProject(id);
    if (!ok) throw new Error("delete failed");
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
