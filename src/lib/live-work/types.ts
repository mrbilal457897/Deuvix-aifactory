/**
 * Shared, dependency-free types for the "Our live Work" showcase.
 *
 * This module is imported by BOTH the public site and the admin dashboard, so it
 * must never pull in a database client, `next/cache` or any server-only code —
 * otherwise admin code would leak into the public bundle.
 */

/** The only two values the `status` column may hold going forward. */
export const PROJECT_STATUSES = ["draft", "published"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** How many projects the home page shows before the "View all" link. */
export const HOME_LIMIT = 6;

/** Hard limits mirrored by the zod schema — keep both in sync. */
export const DESCRIPTION_MAX = 280;
export const TAGS_MAX = 4;
export const STATS_COUNT = 3;
export const GALLERY_MAX = 12;

/** An image uploaded from the admin. `path` is the Supabase Storage key (bucket
 *  `deuvix`) so the file can be removed again when the project is deleted. */
export interface Thumbnail {
  url: string;
  path: string;
  width: number;
  height: number;
  alt: string;
}

export interface ProjectStat {
  value: string;
  label: string;
}

/** What the public site renders — one object per stacked block. */
export interface PublicProject {
  id: string;
  slug: string;
  name: string;
  unitId?: string;
  description: string;
  stats: ProjectStat[];
  tags: string[];
  desktopThumbnail: Thumbnail | null;
  mobileThumbnail: Thumbnail | null;
  liveUrl?: string;
  caseStudyUrl?: string;
  browserUrlLabel?: string;
  chipTitle?: string;
  chipSubtitle?: string;
  content: string;
  gallery: Thumbnail[];
  order: number;
  featured: boolean;
  updatedAt: string;
}

/** The full record as the admin sees it. */
export interface Project extends PublicProject {
  status: ProjectStatus;
  /** Legacy label kept for the AI agent tools and older rows. */
  category: string;
  /** Former slugs, so a renamed project keeps its old URL working (301). */
  previousSlugs: string[];
  createdAt: string;

  /* --- legacy aliases ---------------------------------------------------
   * `title`/`image`/`url` are the pre-migration column names. They are still
   * populated on read so the AI agent tools (`src/lib/ai/tools/*`) keep working
   * without a rewrite, but new writes only use `name`/thumbnails/`liveUrl`. */
  title: string;
  image?: string;
  url?: string;
}

/** What the admin form submits. Validated by `projectInputSchema`. */
export interface ProjectInput {
  name: string;
  slug: string;
  description: string;
  status: ProjectStatus;
  featured: boolean;
  order?: number;
  unitId?: string;
  stats: ProjectStat[];
  tags: string[];
  desktopThumbnail: Thumbnail;
  mobileThumbnail: Thumbnail;
  liveUrl?: string;
  caseStudyUrl?: string;
  browserUrlLabel?: string;
  chipTitle?: string;
  chipSubtitle?: string;
  content?: string;
  gallery?: Thumbnail[];
  category?: string;
}
