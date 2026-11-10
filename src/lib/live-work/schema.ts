/**
 * Validation + slug helpers for "Our live Work".
 *
 * Pure and side-effect free so it can be unit-tested and imported from both the
 * client (live form validation) and the server (authoritative re-validation).
 */
import { z } from "zod";
import {
  DESCRIPTION_MAX,
  GALLERY_MAX,
  PROJECT_STATUSES,
  STATS_COUNT,
  TAGS_MAX,
} from "./types";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Lowercases, strips accents/punctuation and collapses runs into hyphens. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/**
 * Returns `base`, or `base-2`, `base-3`, … until it is not in `taken`.
 * Used for the auto-generated slug and for the uniqueness check.
 */
export function dedupeSlug(base: string, taken: Iterable<string>): string {
  const root = slugify(base) || "project";
  const used = taken instanceof Set ? taken : new Set(taken);
  if (!used.has(root)) return root;
  let n = 2;
  while (used.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}

/** Absolute https only — relative paths and http are rejected on purpose. */
const httpsUrl = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => /^https:\/\/\S+$/.test(value), {
    message: "Must be an https:// URL",
  })
  .refine((value) => !/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(value), {
    message: "Local URLs are not allowed",
  });

/** Internal path (/...) or a public https:// URL — no local hosts. */
const pathOrHttpsUrl = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => value.startsWith("/") || /^https:\/\/\S+$/.test(value), {
    message: "Must start with / or be an https:// URL",
  })
  .refine((value) => !/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(value), {
    message: "Local URLs are not allowed",
  });

/** Free text that may not point at a local dev server. */
const noLocalhostText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((value) => !/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(value), {
      message: "Local URLs are not allowed",
    });

export const thumbnailSchema = z.object({
  url: httpsUrl,
  path: z.string().trim().max(300).default(""),
  width: z.number().int().min(1).max(20000),
  height: z.number().int().min(1).max(20000),
  alt: z.string().trim().max(200).default(""),
});

export const statSchema = z.object({
  value: z.string().trim().min(1).max(24, "Max 24 characters"),
  label: z.string().trim().min(1).max(32, "Max 32 characters"),
});

const optText = (max: number) => z.string().trim().max(max).optional();

export const projectInputSchema = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(80),
  slug: z
    .string()
    .trim()
    .min(2, "At least 2 characters")
    .max(80)
    .regex(SLUG_PATTERN, "Lowercase letters, numbers and hyphens only"),
  description: z
    .string()
    .trim()
    .min(10, "At least 10 characters")
    .max(DESCRIPTION_MAX, `Max ${DESCRIPTION_MAX} characters`),
  status: z.enum(PROJECT_STATUSES),
  featured: z.boolean(),
  order: z.number().int().min(0).max(99999).default(0),
  unitId: optText(32),
  // Optional: 0–3 rows. Half-filled rows are dropped rather than rejected so
  // an empty stat slot can never block a save.
  stats: z.preprocess(
    (value) =>
      Array.isArray(value)
        ? value.filter((row) => {
            if (!row || typeof row !== "object") return false;
            const { value: statValue, label } = row as { value?: unknown; label?: unknown };
            return (
              typeof statValue === "string" &&
              statValue.trim() !== "" &&
              typeof label === "string" &&
              label.trim() !== ""
            );
          })
        : value,
    z.array(statSchema).max(STATS_COUNT, `Max ${STATS_COUNT} stats`).default([])
  ),
  tags: z.array(z.string().trim().min(1).max(24)).max(TAGS_MAX, `Max ${TAGS_MAX} tags`).default([]),
  desktopThumbnail: thumbnailSchema,
  mobileThumbnail: thumbnailSchema,
  liveUrl: httpsUrl.optional(),
  caseStudyUrl: pathOrHttpsUrl.optional(),
  browserUrlLabel: noLocalhostText(120).optional(),
  chipTitle: noLocalhostText(60).optional(),
  chipSubtitle: noLocalhostText(80).optional(),
  content: z.string().max(20000).default(""),
  gallery: z.array(thumbnailSchema).max(GALLERY_MAX).default([]),
  category: optText(80),
});

export type ProjectInputParsed = z.infer<typeof projectInputSchema>;

/**
 * Empty strings from a form mean "not provided" — normalise them to `undefined`
 * so `.optional()` fields validate, then hand the result to the schema.
 */
export function normalizeProjectInput(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const source = raw as Record<string, unknown>;
  const out: Record<string, unknown> = { ...source };

  for (const key of [
    "unitId",
    "liveUrl",
    "caseStudyUrl",
    "browserUrlLabel",
    "chipTitle",
    "chipSubtitle",
    "category",
  ]) {
    const value = out[key];
    if (value !== null && typeof value === "string") out[key] = value.trim();
    // An empty optional field must be ABSENT, not "", or `.optional()` fails.
    if (out[key] === "" || out[key] === null) delete out[key];
  }

  if (typeof out.name === "string") out.name = out.name.trim();
  if (typeof out.slug === "string") out.slug = out.slug.trim().toLowerCase();
  if (typeof out.description === "string") out.description = out.description.trim();

  if (Array.isArray(out.tags)) {
    // Trimmed and de-blanked here; the LENGTH limit is the schema's job so an
    // over-long list is rejected instead of silently truncated.
    out.tags = out.tags
      .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
      .filter(Boolean);
  }

  return out;
}

/**
 * Deliberately hand-written instead of `z.SafeParseReturnType`, whose name has
 * moved between zod majors — this keeps the public surface stable.
 */
export type ParseResult =
  | { success: true; data: ProjectInputParsed }
  | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } };

/** Returns the parsed input, or the zod error for inline form messages. */
export function parseProjectInput(raw: unknown): ParseResult {
  return projectInputSchema.safeParse(normalizeProjectInput(raw)) as ParseResult;
}

/** First error message for a field, or undefined when it is valid. */
export function fieldError(result: ParseResult, field: string): string | undefined {
  if (result.success) return undefined;
  const issue = result.error.issues.find((entry) => entry.path[0] === field);
  return issue?.message;
}
