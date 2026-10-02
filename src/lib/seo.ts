/**
 * Canonical origin used for sitemap.xml, robots.txt, metadataBase and OG tags.
 *
 * Server-only (never NEXT_PUBLIC_) so the domain can change in the Vercel env
 * without a code edit. It falls back to the Vercel deployment URL so a missing
 * variable degrades to a working build instead of `new URL(undefined)` throwing
 * in layout.tsx. Trailing slashes are stripped because callers append paths.
 *
 * NOTE: `deux.ai` is not live yet — the site currently runs on the Vercel domain,
 * so that is the fallback. Update both this default and SITE_URL in the Vercel
 * project when the real domain is attached.
 */
export const SITE_URL = (
  process.env.SITE_URL?.trim() || "https://deux-aicompany.vercel.app"
).replace(/\/+$/, "");

export const SITE_NAME = "DEUX AI Factory";

export const SITE_DESCRIPTION =
  "DEUX AI Factory manufactures, deploys, and monetizes Digital FTEs — AI workers that run your business 24/7. From AI chatbots, voice agents, and custom agents to Loop Engineering and FDE consulting.";

export const SITE_KEYWORDS = [
  "DEUX AI Factory",
  "AI Agent Factory",
  "Digital FTE",
  "AI workers",
  "AI agents",
  "AI chatbots",
  "voice agents",
  "custom AI agents",
  "Loop Engineering",
  "Forward Deployed Engineer",
  "FDE consulting",
  "AI automation",
  "AI-Native company",
  "AI workers 24/7",
  "AI development services",
  "AI consulting",
];

export const OG_IMAGE = "/images/hero-bg.jpg";
