/**
 * Markdown builders. Every string here comes from the same data source the
 * corresponding page renders: config/company.ts, lib/seo.ts, lib/pricing.ts,
 * lib/projects.ts, the blog posts/bodies constants, and the shared schema
 * person nodes. No HTML scraping, no invented copy.
 */
import { company, companyProfileUrls } from "@config/company";
import { SITE_DESCRIPTION } from "@/lib/seo";
import { ORIGIN, personNodes } from "@/lib/json-ld";
import { pricingItems } from "@/lib/pricing";
import { HOME_LIMIT } from "@/lib/live-work/types";
import { getPublishedProjectBySlug, listPublishedProjectsWithHealth } from "@/lib/projects";
import { getPostBySlug, posts } from "@/app/(marketing)/blog/posts";
import { bodies } from "@/app/(marketing)/blog/bodies";

const abs = (path: string) => `${ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;

/** The founders as rendered on the homepage / about page (shared schema data). */
function founderLines(): string[] {
  return personNodes().map(
    (person) => `- [${String(person.name)}](${String((person.sameAs as string[])[0])}), ${String(person.jobTitle)}`,
  );
}

/** Stats shown in the homepage / about page strips (verbatim labels). */
const STAT_LINES = [
  "- 168 hrs/wk — Availability — 24/7",
  "- 85% — Up to 85% cost savings",
  "- 99%+ — First-pass consistency, supervised",
];

/** The 10-80-10 steps, verbatim from components/sections/methodology.tsx. */
const METHODOLOGY_LINES = [
  "- 10% — Human — set direction: Decide what good looks like. Brief, specification, edge cases and where the human gate sits. If nobody can write down the definition of done, nobody can hold the machine to it.",
  "- 80% — AI — executes: Carry the middle of the work. The worker drafts, builds, triages, monitors and reports. This is the part of the job your calendar is full of — and the part that should stop depending on it.",
  "- 10% — Human — judge the outcome: Own the call. Evaluation, approval and accountability. The machine never signs off on its own work — that decision stays with the person answerable for the result.",
];

function contactLines(): string[] {
  const linkedin = companyProfileUrls.find((url) => url.includes("linkedin.com"));
  return [
    `Email: ${company.businessEmail}`,
    `Book a call: ${abs("/book-a-call")}`,
    ...(linkedin ? [`LinkedIn: ${linkedin}`] : []),
  ];
}

function serviceLines(): string[] {
  return pricingItems.map(
    (service) => `- [${service.name}](${abs(`/products#${service.anchor}`)}) — ${service.description}`,
  );
}

export async function homeMarkdown(): Promise<string> {
  const { projects } = await listPublishedProjectsWithHealth({ featured: true, limit: HOME_LIMIT });

  return [
    "# Deuvix AI Factory",
    "",
    SITE_DESCRIPTION,
    "",
    "## What a Digital FTE is",
    "",
    "A Digital FTE is an AI worker that carries real workloads with your team, under the human oversight your process deserves. AI workers your team supervises, not tools that watch it.",
    "",
    "## The 10-80-10 methodology",
    "",
    "The 10-80-10 pattern behind every engagement.",
    "",
    ...METHODOLOGY_LINES,
    "",
    "## Services",
    "",
    ...serviceLines(),
    "",
    "## Live work",
    "",
    ...projects.map(
      (project) => `- [${project.name}](${abs(`/projects/${project.slug}`)}) — ${project.description}`,
    ),
    "",
    "## Numbers",
    "",
    ...STAT_LINES,
    "",
    "## Founders",
    "",
    ...founderLines(),
    "",
    "## Contact",
    "",
    ...contactLines(),
    "",
  ].join("\n");
}

export async function productsMarkdown(): Promise<string> {
  return [
    "# Products and Services",
    "",
    SITE_DESCRIPTION,
    "",
    ...serviceLines(),
    "",
    "## Contact",
    "",
    ...contactLines(),
    "",
  ].join("\n");
}

export async function projectsMarkdown(): Promise<string> {
  const { projects } = await listPublishedProjectsWithHealth();
  return [
    "# Work",
    "",
    "Selected AI workers and systems we have put into production.",
    "",
    ...projects.map(
      (project) => `- [${project.name}](${abs(`/projects/${project.slug}`)}) — ${project.description}`,
    ),
    "",
  ].join("\n");
}

export async function projectMarkdown(slug: string): Promise<string | null> {
  const project = await getPublishedProjectBySlug(slug);
  if (!project) return null;
  return [
    `# ${project.name}`,
    "",
    project.description,
    "",
    ...(project.tags.length ? [`Tags: ${project.tags.join(", ")}`, ""] : []),
    `[All projects](${abs("/projects")})`,
    "",
    ...contactLines(),
    "",
  ].join("\n");
}

export async function aboutMarkdown(): Promise<string> {
  return [
    "# About Deuvix AI Factory",
    "",
    SITE_DESCRIPTION,
    "",
    "## How we work",
    "",
    "Manufacture / Deploy / Monetize",
    "",
    ...METHODOLOGY_LINES,
    "",
    "## Numbers",
    "",
    ...STAT_LINES,
    "",
    "## Leaders",
    "",
    ...founderLines(),
    "",
    "## Contact",
    "",
    ...contactLines(),
    "",
  ].join("\n");
}

export async function contactMarkdown(): Promise<string> {
  return [
    "# Contact",
    "",
    "Tell us what you want an AI worker to take off your team's plate. We reply within one business day.",
    "",
    "## Reach us",
    "",
    ...contactLines(),
    "",
    "## What you can ask for",
    "",
    ...pricingItems.map((service) => `- ${service.name}`),
    "",
    "## Office hours",
    "",
    ...Object.entries(company.workingHours)
      .filter(([key]) => key.startsWith("mondayToFriday") || key.startsWith("saturday") || key === "sunday")
      .map(([key, value]) => `- ${key}: ${String(value ?? "Closed")}`),
    "",
  ].join("\n");
}

export async function blogMarkdown(): Promise<string> {
  return [
    "# Blog",
    "",
    ...posts.map(
      (post) =>
        `- [${post.title}](${abs(`/blog/${post.slug}`)}) — ${post.excerpt} (${post.author}, ${post.date})`,
    ),
    "",
  ].join("\n");
}

export async function blogPostMarkdown(slug: string): Promise<string | null> {
  const post = getPostBySlug(slug);
  const body = bodies[slug];
  if (!post || !body) return null;
  return [
    `# ${post.title}`,
    "",
    `${post.author} · ${post.date} · ${post.category}`,
    "",
    post.excerpt,
    "",
    body.trim(),
    "",
    `[All posts](${abs("/blog")})`,
    "",
  ].join("\n");
}
