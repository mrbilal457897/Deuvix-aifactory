import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "projects.json");

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  image?: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

async function ensureDataDir() {
  const dir = path.join(process.cwd(), "data");
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  if (!existsSync(DATA_FILE)) {
    await writeFile(DATA_FILE, JSON.stringify([], null, 2));
  }
}

async function readProjects(): Promise<Project[]> {
  await ensureDataDir();
  const data = await readFile(DATA_FILE, "utf-8");
  return JSON.parse(data);
}

async function writeProjects(projects: Project[]) {
  await ensureDataDir();
  await writeFile(DATA_FILE, JSON.stringify(projects, null, 2));
}

export async function GET() {
  try {
    const projects = await readProjects();
    return NextResponse.json(projects);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projects = await readProjects();

    const newProject: Project = {
      id: Date.now().toString(),
      title: body.title,
      description: body.description,
      category: body.category || "General",
      status: body.status || "Active",
      image: body.image || "",
      url: body.url || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    projects.push(newProject);
    await writeProjects(projects);

    return NextResponse.json(newProject, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const projects = await readProjects();

    const index = projects.findIndex((p) => p.id === body.id);
    if (index === -1) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    projects[index] = {
      ...projects[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };

    await writeProjects(projects);
    return NextResponse.json(projects[index]);
  } catch {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    let projects = await readProjects();
    projects = projects.filter((p) => p.id !== id);
    await writeProjects(projects);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
