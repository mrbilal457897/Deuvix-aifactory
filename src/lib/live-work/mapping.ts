/**
 * Row <-> model mapping for the projects table.
 *
 * Kept separate from the data layer (and free of any database import) so it can
 * be unit-tested and so every read path — public pages, admin, AI agent —
 * applies exactly the same legacy fallbacks.
 */
import {
  type Project,
  type ProjectStat,
  type ProjectStatus,
  type PublicProject,
  type Thumbnail,
} from "./types";
import { slugify } from "./schema";

export const EMPTY_THUMBNAIL: Thumbnail = { url: "", path: "", width: 0, height: 0, alt: "" };

/** Local dev URLs must never reach the public HTML — strip them at read time. */
export const LOCALHOST_PATTERN = /(localhost|127\.0\.0\.1|0\.0\.0\.0)/i;

/** Returns the value, or `undefined` when it points at a local dev server. */
function stripLocalhost(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return LOCALHOST_PATTERN.test(value) ? undefined : value;
}

export function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function strList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => str(entry)).filter(Boolean);
}

export function toThumbnail(value: unknown): Thumbnail | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const url = str(source.url);
  if (!url || LOCALHOST_PATTERN.test(url)) return null;
  return {
    url,
    path: str(source.path),
    width: Number(source.width) || 0,
    height: Number(source.height) || 0,
    alt: str(source.alt),
  };
}

export function toThumbnailList(value: unknown): Thumbnail[] {
  if (!Array.isArray(value)) return [];
  return value.map(toThumbnail).filter((entry): entry is Thumbnail => entry !== null);
}

export function toStats(value: unknown): ProjectStat[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const source = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
      return { value: str(source.value), label: str(source.label) };
    })
    .filter((entry) => entry.value && entry.label)
    .slice(0, 3);
}

/** A project can only be published once BOTH screenshots exist. */
export function isComplete(desktop: Thumbnail | null, mobile: Thumbnail | null): boolean {
  return Boolean(desktop && mobile && desktop.url && mobile.url);
}

/**
 * The `status` column historically held a lifecycle label (Active / Planning /
 * Completed / Paused). It now holds `draft` | `published`; anything else is a
 * legacy value, which maps to `published` only when the record is complete.
 * That is what keeps an unfinished migrated row off the public site.
 */
export function normalizeStatus(raw: unknown, complete: boolean): ProjectStatus {
  const value = str(raw).toLowerCase();
  if (value === "published") return "published";
  if (value === "draft") return "draft";
  return complete ? "published" : "draft";
}

export function numberOr(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function rowToProject(row: Record<string, unknown>): Project {
  const name = str(row.name) || str(row.title) || "Untitled project";
  const desktopThumbnail = toThumbnail(row.desktop_thumbnail);
  const mobileThumbnail = toThumbnail(row.mobile_thumbnail);
  const image = str(row.image) || undefined;
  const legacyUrl = str(row.url);
  const complete = isComplete(desktopThumbnail, mobileThumbnail);
  const status = normalizeStatus(row.status, complete);

  return {
    id: str(row.id),
    slug: str(row.slug) || slugify(name) || "project",
    name,
    unitId: str(row.unit_id) || undefined,
    description: str(row.description),
    stats: toStats(row.stats),
    tags: strList(row.tags),
    desktopThumbnail,
    mobileThumbnail,
    liveUrl: stripLocalhost(str(row.live_url) || legacyUrl || undefined),
    caseStudyUrl: stripLocalhost(str(row.case_study_url)) || undefined,
    browserUrlLabel: stripLocalhost(str(row.browser_url_label)) || undefined,
    chipTitle: stripLocalhost(str(row.chip_title)) || undefined,
    chipSubtitle: stripLocalhost(str(row.chip_subtitle)) || undefined,
    content: str(row.content),
    gallery: toThumbnailList(row.gallery),
    order: numberOr(row.sort_order, 0),
    featured: row.featured === true,
    updatedAt: str(row.updated_at) || str(row.created_at),
    // Belt and braces: a row marked published that is missing a screenshot can
    // never render (the block needs both), so it is held back as a draft.
    status: status === "published" && !complete ? "draft" : status,
    category: str(row.category) || "General",
    previousSlugs: strList(row.previous_slugs),
    createdAt: str(row.created_at) || str(row.updated_at),
    // Legacy aliases kept so the AI agent tools keep compiling and working.
    title: name,
    image,
    url: stripLocalhost(legacyUrl) || undefined,
  };
}

/** The subset of a project the public site needs. */
export function toPublicProject(project: Project): PublicProject {
  return {
    id: project.id,
    slug: project.slug,
    name: project.name,
    unitId: project.unitId,
    description: project.description,
    stats: project.stats,
    tags: project.tags,
    desktopThumbnail: project.desktopThumbnail,
    mobileThumbnail: project.mobileThumbnail,
    liveUrl: project.liveUrl,
    caseStudyUrl: project.caseStudyUrl,
    browserUrlLabel: project.browserUrlLabel,
    chipTitle: project.chipTitle,
    chipSubtitle: project.chipSubtitle,
    content: project.content,
    gallery: project.gallery,
    order: project.order,
    featured: project.featured,
    updatedAt: project.updatedAt,
  };
}

/** Site order: `order` ascending, newest first when `order` ties. */
export function byOrder(a: Project, b: Project): number {
  if (a.order !== b.order) return a.order - b.order;
  return b.createdAt.localeCompare(a.createdAt);
}

/** Hostname of an absolute URL, or "" — the URL pill's default label. */
export function hostnameFromUrl(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
