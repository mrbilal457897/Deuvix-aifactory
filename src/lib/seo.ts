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
import { company, companyLocationLabel } from "@config/company";

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

  if (company.logo?.trim()) node.logo = new URL(company.logo, SITE_URL).toString();
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
