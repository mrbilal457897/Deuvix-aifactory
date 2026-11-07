import { revalidatePath } from "next/cache";
import { supabase } from "./supabase";
import {
  PROJECT_STATUSES,
  type Project,
  type ProjectInput,
  type ProjectStatus,
  type PublicProject,
  type Thumbnail,
} from "./live-work/types";
import { dedupeSlug, slugify } from "./live-work/schema";
import {
  EMPTY_THUMBNAIL,
  byOrder,
  isComplete,
  rowToProject,
  toPublicProject,
} from "./live-work/mapping";

export { PROJECT_STATUSES, rowToProject };

/** Table name is unchanged — the model was EXTENDED, not replaced. */
const TABLE = "projects";
const BUCKET = "deuvix";

export type { Project, ProjectInput, ProjectStatus, PublicProject, Thumbnail };

/**
 * Fields the AI agent tools (`src/lib/ai/tools/*`) still send under their
 * pre-migration names. They are translated to the new model on write.
 */
export interface ProjectPatch extends Partial<ProjectInput> {
  title?: string;
  image?: string;
  url?: string;
}

export interface CreateProjectInput extends Partial<ProjectInput> {
  description: string;
  name?: string;
  /** Legacy alias for `name`. */
  title?: string;
  image?: string;
  url?: string;
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Every row, in site order. Ordering happens in JS on purpose: `sort_order` may
 * not exist yet on a database that has not run the migration, and failing the
 * whole query would blank the section instead of degrading to creation order.
 */
async function fetchProjects(): Promise<Project[]> {
  try {
    const { data, error } = await supabase.from(TABLE).select("*");
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(rowToProject).sort(byOrder);
  } catch {
    return [];
  }
}

async function fetchPublished(): Promise<Project[]> {
  const all = await fetchProjects();
  return all.filter((project) => project.status === "published");
}

export async function listProjects(limit = 500): Promise<Project[]> {
  const all = await fetchProjects();
  return limit >= all.length ? all : all.slice(0, limit);
}

export async function getProject(id: string): Promise<Project | null> {
  const all = await fetchProjects();
  return all.find((project) => project.id === id) ?? null;
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const clean = slug.trim().toLowerCase();
  const all = await fetchProjects();
  return (
    all.find((project) => project.slug === clean) ??
    all.find((project) => project.previousSlugs.includes(clean)) ??
    null
  );
}

/** Published projects only, in site order — the public section's data source. */
export async function listPublishedProjects(
  options: { featured?: boolean; limit?: number } = {}
): Promise<PublicProject[]> {
  const published = await fetchPublished();
  const filtered = options.featured ? published.filter((project) => project.featured) : published;
  const limited = options.limit ? filtered.slice(0, options.limit) : filtered;
  return limited.map(toPublicProject);
}

export async function countPublishedProjects(): Promise<number> {
  return (await listPublishedProjects()).length;
}

/**
 * Resolves a slug against published projects, including a renamed project's
 * previous slugs — the caller decides whether to serve it or 301 it.
 */
export async function getPublishedProjectBySlug(slug: string): Promise<PublicProject | null> {
  const clean = slug.trim().toLowerCase();
  const published = await fetchPublished();
  const match =
    published.find((project) => project.slug === clean) ??
    published.find((project) => project.previousSlugs.includes(clean));
  return match ? toPublicProject(match) : null;
}

/** Old slug -> current slug, for the 301 after a rename. */
export async function resolvePreviousSlug(slug: string): Promise<string | null> {
  const clean = slug.trim().toLowerCase();
  if (!clean) return null;
  const published = await fetchPublished();
  const match = published.find(
    (project) => project.slug !== clean && project.previousSlugs.includes(clean)
  );
  return match ? match.slug : null;
}

/** Prev/next neighbours by `order`, for the detail page. */
export async function getAdjacentProjects(
  slug: string
): Promise<{ previous: PublicProject | null; next: PublicProject | null }> {
  const all = await listPublishedProjects();
  const index = all.findIndex((project) => project.slug === slug);
  if (index < 0) return { previous: null, next: null };
  return {
    previous: index > 0 ? all[index - 1] : null,
    next: index < all.length - 1 ? all[index + 1] : null,
  };
}

export async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const clean = slug.trim().toLowerCase();
  const all = await fetchProjects();
  // A previous slug is reserved too, otherwise an old URL would 301 into a
  // different project after a rename.
  return all.some(
    (project) =>
      project.id !== excludeId && (project.slug === clean || project.previousSlugs.includes(clean))
  );
}

/* -------------------------------------------------------------------------- */
/* Cache invalidation                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Pushes every surface a project appears on out of the Next.js cache, so an
 * admin change shows up without a redeploy. Safe to call outside a request
 * scope (build/CLI) — `revalidatePath` warns rather than throwing there.
 */
export function revalidateProjectSite(slugs: string[] = []): void {
  try {
    revalidatePath("/");
    revalidatePath("/projects");
    for (const slug of slugs) {
      if (slug) revalidatePath(`/projects/${slug}`);
    }
    revalidatePath("/sitemap.xml");
  } catch {
    /* not inside a request scope — nothing to invalidate */
  }
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                      */
/* -------------------------------------------------------------------------- */

function storedPaths(project: Project): string[] {
  const paths = [
    project.desktopThumbnail?.path,
    project.mobileThumbnail?.path,
    ...project.gallery.map((image) => image.path),
  ];
  return [...new Set(paths.filter((path): path is string => Boolean(path)))];
}

async function removeStoredImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    await supabase.storage.from(BUCKET).remove(paths);
  } catch {
    /* best effort — the row is already gone */
  }
}

/**
 * Publishes a project only when it has BOTH screenshots; otherwise it is forced
 * back to `draft` so a half-filled record can never reach the public site.
 */
function gateStatus(
  status: ProjectStatus | undefined,
  desktop: Thumbnail,
  mobile: Thumbnail
): ProjectStatus {
  if (status !== "published") return "draft";
  return isComplete(desktop, mobile) ? "published" : "draft";
}

function baseRow(project: Project): Record<string, unknown> {
  return {
    title: project.name,
    name: project.name,
    slug: project.slug,
    description: project.description,
    category: project.category,
    status: project.status,
    featured: project.featured,
    sort_order: project.order,
    unit_id: project.unitId ?? null,
    stats: project.stats,
    tags: project.tags,
    desktop_thumbnail: project.desktopThumbnail ?? EMPTY_THUMBNAIL,
    mobile_thumbnail: project.mobileThumbnail ?? EMPTY_THUMBNAIL,
    live_url: project.liveUrl ?? null,
    case_study_url: project.caseStudyUrl ?? null,
    browser_url_label: project.browserUrlLabel ?? null,
    chip_title: project.chipTitle ?? null,
    chip_subtitle: project.chipSubtitle ?? null,
    content: project.content,
    gallery: project.gallery,
    previous_slugs: project.previousSlugs,
    image: project.desktopThumbnail?.url ?? "",
    url: project.liveUrl ?? "",
    updated_at: new Date().toISOString(),
  };
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const all = await fetchProjects();
  const name = (input.name || input.title || "").trim() || "Untitled project";
  const now = new Date().toISOString();

  const desktop: Thumbnail = input.desktopThumbnail ?? {
    ...EMPTY_THUMBNAIL,
    url: (input.image || "").trim(),
    alt: name,
  };
  const mobile: Thumbnail = input.mobileThumbnail ?? { ...EMPTY_THUMBNAIL, alt: name };

  const liveUrl = (input.liveUrl || input.url || "").trim() || undefined;
  const maxOrder = all.reduce((max, project) => Math.max(max, project.order), 0);

  const project: Project = {
    id: newId(),
    slug: dedupeSlug(input.slug || slugify(name), all.map((entry) => entry.slug)),
    name,
    unitId: (input.unitId || "").trim() || undefined,
    description: input.description,
    stats: input.stats ?? [],
    tags: input.tags ?? [],
    desktopThumbnail: desktop,
    mobileThumbnail: mobile,
    liveUrl,
    caseStudyUrl: (input.caseStudyUrl || "").trim() || undefined,
    browserUrlLabel: (input.browserUrlLabel || "").trim() || undefined,
    chipTitle: (input.chipTitle || "").trim() || undefined,
    chipSubtitle: (input.chipSubtitle || "").trim() || undefined,
    content: input.content ?? "",
    gallery: input.gallery ?? [],
    order: input.order ?? maxOrder + 1,
    featured: input.featured === true,
    updatedAt: now,
    status: gateStatus(input.status, desktop, mobile),
    category: (input.category || "").trim() || "General",
    previousSlugs: [],
    createdAt: now,
    title: name,
    image: desktop.url || undefined,
    url: liveUrl,
  };

  const { error } = await supabase.from(TABLE).insert({
    ...baseRow(project),
    id: project.id,
    created_at: now,
  });
  if (error) throw new Error(projectWriteError(error.message));

  revalidateProjectSite([project.slug]);
  return project;
}

export async function updateProject(id: string, patch: ProjectPatch): Promise<Project | null> {
  const existing = await getProject(id);
  if (!existing) return null;

  const name = (patch.name ?? patch.title ?? existing.name).trim() || existing.name;
  const slug = (patch.slug ? slugify(patch.slug) : existing.slug) || existing.slug;

  // Changing the URL keeps the old one alive as a 301 source.
  const previousSlugs =
    slug !== existing.slug && !existing.previousSlugs.includes(existing.slug)
      ? [...existing.previousSlugs, existing.slug].slice(-20)
      : existing.previousSlugs;

  const desktop: Thumbnail = patch.desktopThumbnail
    ? patch.desktopThumbnail
    : patch.image
      ? { ...EMPTY_THUMBNAIL, url: patch.image, alt: name, width: 1600, height: 1000 }
      : (existing.desktopThumbnail ?? { ...EMPTY_THUMBNAIL, alt: name });

  const mobile: Thumbnail = patch.mobileThumbnail
    ? patch.mobileThumbnail
    : (existing.mobileThumbnail ?? { ...EMPTY_THUMBNAIL, alt: name });

  const liveUrl =
    patch.liveUrl !== undefined
      ? patch.liveUrl || undefined
      : patch.url !== undefined
        ? patch.url || undefined
        : existing.liveUrl;

  const next: Project = {
    ...existing,
    name,
    slug,
    previousSlugs,
    description: patch.description ?? existing.description,
    unitId: patch.unitId !== undefined ? patch.unitId || undefined : existing.unitId,
    stats: patch.stats ?? existing.stats,
    tags: patch.tags ?? existing.tags,
    desktopThumbnail: desktop,
    mobileThumbnail: mobile,
    liveUrl,
    caseStudyUrl:
      patch.caseStudyUrl !== undefined ? patch.caseStudyUrl || undefined : existing.caseStudyUrl,
    browserUrlLabel:
      patch.browserUrlLabel !== undefined
        ? patch.browserUrlLabel || undefined
        : existing.browserUrlLabel,
    chipTitle: patch.chipTitle !== undefined ? patch.chipTitle || undefined : existing.chipTitle,
    chipSubtitle:
      patch.chipSubtitle !== undefined ? patch.chipSubtitle || undefined : existing.chipSubtitle,
    content: patch.content ?? existing.content,
    gallery: patch.gallery ?? existing.gallery,
    order: patch.order ?? existing.order,
    featured: patch.featured ?? existing.featured,
    category: patch.category !== undefined ? patch.category || existing.category : existing.category,
    status: gateStatus(patch.status ?? existing.status, desktop, mobile),
    updatedAt: new Date().toISOString(),
    title: name,
    image: desktop.url || undefined,
    url: liveUrl,
  };

  const { error } = await supabase.from(TABLE).update(baseRow(next)).eq("id", id);
  if (error) throw new Error(projectWriteError(error.message));

  revalidateProjectSite([next.slug, existing.slug]);
  return next;
}

export async function deleteProject(id: string): Promise<boolean> {
  const existing = await getProject(id);
  if (!existing) return false;

  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) return false;

  await removeStoredImages(storedPaths(existing));
  revalidateProjectSite([existing.slug, ...existing.previousSlugs]);
  return true;
}

/** Copies a project as an unpublished draft with a fresh slug. */
export async function duplicateProject(id: string): Promise<Project | null> {
  const source = await getProject(id);
  if (!source) return null;

  const all = await fetchProjects();
  const now = new Date().toISOString();
  const name = `${source.name} (copy)`;
  const copy: Project = {
    ...source,
    id: newId(),
    name,
    slug: dedupeSlug(`${source.slug}-copy`, all.map((entry) => entry.slug)),
    status: "draft",
    featured: false,
    order: all.reduce((max, project) => Math.max(max, project.order), 0) + 1,
    previousSlugs: [],
    createdAt: now,
    updatedAt: now,
    title: name,
  };

  const { error } = await supabase
    .from(TABLE)
    .insert({ ...baseRow(copy), id: copy.id, created_at: now });
  if (error) throw new Error(projectWriteError(error.message));

  revalidateProjectSite([copy.slug]);
  return copy;
}

/** Persists drag-and-drop order — this array IS the top-to-bottom block order. */
export async function reorderProjects(ids: string[]): Promise<number> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return 0;

  const results = await Promise.all(
    unique.map((id, index) =>
      supabase.from(TABLE).update({ sort_order: index, updated_at: new Date().toISOString() }).eq("id", id)
    )
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(projectWriteError(failed.error.message));

  revalidateProjectSite();
  return unique.length;
}

/**
 * Supabase reports a missing column as `column "x" does not exist`. Surface it
 * verbatim so the admin sees "run the migration" instead of a generic 500.
 */
function projectWriteError(message: string): string {
  if (/does not exist|schema cache/i.test(message)) {
    return `${message} — the projects table needs the "Our live Work" migration (supabase/migrations/).`;
  }
  return message;
}
