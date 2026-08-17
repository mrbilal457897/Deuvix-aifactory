import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    category: row.category as string,
    status: row.status as string,
    image: row.image as string | undefined,
    url: row.url as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json((data || []).map(rowToProject));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newProject = {
      id: Date.now().toString(),
      title: body.title,
      description: body.description,
      category: body.category || "General",
      status: body.status || "Active",
      image: body.image || "",
      url: body.url || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("projects").insert(newProject);
    if (error) throw error;

    return NextResponse.json(rowToProject(newProject), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const { data: existing, error: fetchError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", body.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const updates = {
      title: body.title,
      description: body.description,
      category: body.category,
      status: body.status,
      image: body.image,
      url: body.url,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", body.id)
      .select()
      .single();

    if (updateError) throw updateError;
    return NextResponse.json(rowToProject(updated));
  } catch {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
