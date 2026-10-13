import { supabase } from "./supabase";

export interface Project {
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

/** Statuses the dashboard offers. Stored as free text so older values still work. */
export const PROJECT_STATUSES = ["Active", "Planning", "Completed"] as const;

export interface ProjectInput {
  title: string;
  description: string;
  category?: string;
  status?: string;
  image?: string;
  url?: string;
}

export type ProjectPatch = Partial<ProjectInput>;

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

export async function listProjects(limit = 50): Promise<Project[]> {
  const { data } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!data) return [];
  return data.map(rowToProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const { data } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!data) return null;
  return rowToProject(data);
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const now = new Date().toISOString();
  const row = {
    id: Date.now().toString(),
    title: input.title,
    description: input.description,
    category: input.category || "General",
    status: input.status || "Active",
    image: input.image || "",
    url: input.url || "",
    created_at: now,
    updated_at: now,
  };
  const { error } = await supabase.from("projects").insert(row);
  if (error) throw new Error(error.message);
  return rowToProject(row);
}

/**
 * Applies only the fields present in `patch`, so the agent can change one field
 * (e.g. the image) without resending the whole record. Returns null when the id
 * does not exist.
 */
export async function updateProject(id: string, patch: ProjectPatch): Promise<Project | null> {
  const existing = await getProject(id);
  if (!existing) return null;

  const updates = {
    title: patch.title ?? existing.title,
    description: patch.description ?? existing.description,
    category: patch.category ?? existing.category,
    status: patch.status ?? existing.status,
    image: patch.image ?? existing.image ?? "",
    url: patch.url ?? existing.url ?? "",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("projects").update(updates).eq("id", id);
  if (error) throw new Error(error.message);
  return { ...existing, ...updates, id };
}

export async function deleteProject(id: string): Promise<boolean> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  return !error;
}
