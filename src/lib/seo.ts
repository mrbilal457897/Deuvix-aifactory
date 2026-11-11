/**
 * Canonical origin used for sitemap.xml, robots.txt, metadataBase and OG tags.
 *
 * Server-and-client safe resolution order: NEXT_PUBLIC_SITE_URL (the public,
 * build-time site URL) → SITE_URL → the production origin. Trailing slashes
 * are stripped because callers append paths.
 */
import { company, companyLocationLabel } from "@config/company";
import type { Metadata } from "next";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  process.env.SITE_URL?.trim() ||
  "https://deuvix-aifactory-3yqx.vercel.app"
).replace(/\/+$/, "");

export const SITE_NAME = "Deuvix AI Factory";

export const SITE_DESCRIPTION =
  "Deuvix AI Factory builds and operates Digital FTEs — AI workers your team supervises, not tools that watch it. From AI chatbots and voice agents to Loop Engineering and FDE consulting.";

export const SITE_KEYWORDS = [
  "Deuvix AI Factory",
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
export const OG_IMAGE_ABSOLUTE = `${SITE_URL}${OG_IMAGE}`;

/** Absolute URL for a path on this origin (path begins with `/`). */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

/** Title matching what root `title.template` (%s | Deuvix AI Factory) renders. */
export function fullTitle(title: string): string {
  return title.includes(` | ${SITE_NAME}`) ? title : `${title} | ${SITE_NAME}`;
}

export interface PageMetaInput {
  title: string;
  description: string;
  /** Path including leading slash, e.g. `/about`. Used for canonical + og:url. */
  path: string;
  keywords?: string | string[];
  /** Absolute og:image; defaults to the site-wide hero image. */
  image?: string;
}

/**
 * Builds page-level metadata where title, description, canonical, og:* and
 * twitter:* all describe THIS page — not the homepage.
 */
export function pageMetadata({ title, description, path, keywords, image }: PageMetaInput): Metadata {
  const url = `${SITE_URL}${path}`;
  const img = image || OG_IMAGE_ABSOLUTE;
  const socialTitle = fullTitle(title);
  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: socialTitle,
      description,
      url,
      locale: "en_US",
      images: [{ url: img, width: 1920, height: 1080, alt: `${SITE_NAME}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [img],
    },
  };
}

/**
 * Organization JSON-LD, generated from config/company.ts. Only the fields the
 * owner has actually filled in are emitted — an empty registered address or
 * phone number must never show up in the schema, because a broken-looking
 * Organization block is worse than none.
 */
export function organizationJsonLd(): Record<string, unknown> | null {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.legalName?.trim() || company.tradingName,
    url: SITE_URL,
  };

  // JSON-LD logo must be an absolute URL on the production origin; fall back to
  // the exported wordmark PNG when the owner has not configured one.
  node.logo = company.logo?.trim()
    ? new URL(company.logo, SITE_URL).toString()
    : absoluteUrl("/images/logo-light.png");
  if (company.tradingName?.trim() && company.tradingName !== company.legalName) {
    node.alternateName = company.tradingName;
  }
  if (company.registrationNumber?.trim()) node.registrationNumber = company.registrationNumber;
  if (company.foundedYear) node.foundingDate = String(company.foundedYear);
  if (company.taxId?.trim()) node.taxID = company.taxId;

  if (company.registeredAddress?.trim() || company.city?.trim() || company.country?.trim()) {
    const address: Record<string, string> = { "@type": "PostalAddress" };
    if (company.registeredAddress?.trim()) address.streetAddress = company.registeredAddress.trim();
    if (company.city?.trim()) address.addressLocality = company.city.trim();
    if (company.country?.trim()) address.addressCountry = company.country.trim();
    node.address = address;
  } else {
    const location = companyLocationLabel();
    if (location) {
      node.address = { "@type": "PostalAddress", addressCountry: location };
    }
  }

  if (company.businessEmail?.trim() || company.phone?.trim()) {
    const contactPoint: Record<string, string> = {
      "@type": "ContactPoint",
      contactType: "customer support",
    };
    if (company.businessEmail?.trim()) contactPoint.email = company.businessEmail.trim();
    if (company.phone?.trim()) contactPoint.telephone = company.phone.trim();
    node.contactPoint = contactPoint;
  }

  const sameAs = Object.values(company.socials)
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v));
  if (sameAs.length) node.sameAs = sameAs;

  return node;
}
