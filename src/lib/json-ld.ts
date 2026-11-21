/**
 * Server-rendered structured data for the site.
 *
 * Plain, typed data only — no env access, no I/O, no client JavaScript. Every
 * node is built from data that is actually visible on the page, and every
 * cross-reference uses a stable @id so the same entity is never declared twice.
 *
 * The origin is pinned to the production domain: structured data is consumed by
 * crawlers on deuvix-ai.com, so it must not pick up a local or preview URL.
 */

import { companyProfileUrls } from "@config/company";
import { pricingItems, type PriceValue } from "@/lib/pricing";

/** Canonical origin used for every absolute URL in the graph. */
export const ORIGIN = "https://deuvix-ai.com";

/** Stable @id values shared by every page's graph. */
export const ORG_ID = `${ORIGIN}/#organization`;
export const WEBSITE_ID = `${ORIGIN}/#website`;
export const WEBPAGE_ID = `${ORIGIN}/#webpage`;
export const BILAL_ID = `${ORIGIN}/#person-bilal-ali`;
export const ASAD_ID = `${ORIGIN}/#person-asadullah`;
export const SERVICES_ID = `${ORIGIN}/#services`;
export const BLOG_ID = `${ORIGIN}/#blog`;

export interface SchemaNode {
  "@type": string;
  "@id"?: string;
  [key: string]: unknown;
}

export interface JsonLdDocument {
  "@context": "https://schema.org";
  "@graph": SchemaNode[];
}

/** Turn a site-relative path into an absolute https URL on the canonical origin. */
export function absolute(path: string): string {
  return `${ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

/** A lightweight @id reference to a node declared elsewhere in the graph. */
function ref(id: string): { "@id": string } {
  return { "@id": id };
}

/** Wrap nodes in a single @graph document. */
export function graph(nodes: SchemaNode[]): JsonLdDocument {
  return { "@context": "https://schema.org", "@graph": nodes };
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** BreadcrumbList matching the visible Breadcrumb component trail. */
export function breadcrumbJsonLd(items: BreadcrumbItem[]): SchemaNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: absolute(item.href) } : {}),
    })),
  };
}

/** The two founders, as standalone Person nodes referenced by @id everywhere. */
export function personNodes(): SchemaNode[] {
  return [
    {
      "@type": "Person",
      "@id": BILAL_ID,
      name: "Bilal Ali",
      jobTitle: "Co-Founder / CEO",
      worksFor: ref(ORG_ID),
      sameAs: ["https://www.linkedin.com/in/bilal-alee-6769462ba/"],
    },
    {
      "@type": "Person",
      "@id": ASAD_ID,
      name: "Asadullah",
      jobTitle: "Co-Founder / CTO",
      worksFor: ref(ORG_ID),
      sameAs: ["https://www.linkedin.com/in/asad-ullah-17758a358/"],
    },
  ];
}

/** Map a blog author name to the matching Person @id. */
export function authorRef(name: string): { "@id": string } {
  return ref(name === "Asadullah" ? ASAD_ID : BILAL_ID);
}

const SERVICES = [
  { name: "Digital FTEs", anchor: "digital-fte-deployment" },
  { name: "AI Chatbots", anchor: "ai-chatbots" },
  { name: "Voice Agents", anchor: "voice-agents" },
  { name: "Custom Agents", anchor: "custom-agents" },
  { name: "Loop Engineering", anchor: "loop-engineering" },
  { name: "FDE Consulting", anchor: "fde-consulting" },
] as const;

export interface ServiceInput {
  anchor: string;
  title: string;
  description: string;
}

/** A Service node pointing at the section of /products the visitor can read. */
export function serviceJsonLd(service: ServiceInput): SchemaNode {
  return {
    "@type": "Service",
    "@id": `${ORIGIN}/products#${service.anchor}-service`,
    name: service.title,
    description: service.description,
    url: absolute(`/products#${service.anchor}`),
    provider: ref(ORG_ID),
  };
}

function organizationNode(): SchemaNode {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "Deuvix AI Factory",
    alternateName: "Deuvix",
    url: ORIGIN,
    logo: absolute("/images/logo-light.png"),
    image: absolute("/images/hero-bg.jpg"),
    description:
      "Deuvix AI Factory builds and operates Digital FTEs: AI workers your team supervises, not tools that watch it. From AI chatbots and voice agents to Loop Engineering and FDE consulting.",
    email: "team.deuvixai@gmail.com",
    address: { "@type": "PostalAddress", addressCountry: "PK" },
    sameAs: [...companyProfileUrls],
    founder: [ref(BILAL_ID), ref(ASAD_ID)],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      email: "team.deuvixai@gmail.com",
      availableLanguage: ["English"],
    },
    makesOffer: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: SERVICES.map((service) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: service.name,
          url: absolute(`/products#${service.anchor}`),
        },
      })),
    },
  };
}

function websiteNode(): SchemaNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: ORIGIN,
    name: "Deuvix AI Factory",
    inLanguage: "en",
    publisher: ref(ORG_ID),
  };
}

function webpageNode(): SchemaNode {
  return {
    "@type": "WebPage",
    "@id": WEBPAGE_ID,
    url: ORIGIN,
    name: "Deuvix AI Factory",
    isPartOf: ref(WEBSITE_ID),
    about: ref(ORG_ID),
    inLanguage: "en",
  };
}

function servicesItemList(): SchemaNode {
  return {
    "@type": "ItemList",
    "@id": SERVICES_ID,
    name: "AI-Native services",
    itemListElement: SERVICES.map((service) => {
      const priced = pricingItems.find((item) => item.anchor === service.anchor);
      return {
        "@type": "Service",
        "@id": `${ORIGIN}/products#${service.anchor}-service`,
        name: service.name,
        url: absolute(`/products#${service.anchor}`),
        provider: ref(ORG_ID),
        ...(priced ? { offers: offerJsonLd(priced.price) } : {}),
      };
    }),
  };
}

/**
 * An Offer for a service. Custom quotes deliberately carry NO price fields —
 * emitting a made-up price would be worse than no price at all.
 */
export function offerJsonLd(price: PriceValue): SchemaNode {
  const offer: SchemaNode = {
    "@type": "Offer",
    url: absolute("/products"),
    availability: "https://schema.org/InStock",
  };
  if (price.kind === "exact") {
    offer.priceCurrency = price.currency;
    offer.price = String(price.amount);
  } else if (price.kind === "from") {
    offer.priceSpecification = {
      "@type": "PriceSpecification",
      minPrice: price.amount,
      priceCurrency: price.currency,
    };
  }
  return offer;
}

/**
 * The homepage graph. Emitted from the root layout so every page shares the
 * same site-wide entities (Organization, WebSite, Person) and their @ids.
 */
export const homeJsonLd: JsonLdDocument = graph([
  organizationNode(),
  websiteNode(),
  webpageNode(),
  ...personNodes(),
  servicesItemList(),
]);

export interface CreativeWorkInput {
  slug: string;
  name: string;
  description: string;
  image?: string | null;
  tags?: string[];
  updatedAt?: string;
}

/** CreativeWork for a case study / project, from the data the page renders. */
export function creativeWorkJsonLd(project: CreativeWorkInput): SchemaNode {
  return {
    "@type": "CreativeWork",
    "@id": `${ORIGIN}/projects/${project.slug}#creativework`,
    name: project.name,
    description: project.description,
    url: absolute(`/projects/${project.slug}`),
    ...(project.image
      ? { image: project.image.startsWith("http") ? project.image : absolute(project.image) }
      : {}),
    ...(project.tags?.length ? { keywords: project.tags.join(", ") } : {}),
    ...(project.updatedAt ? { datePublished: new Date(project.updatedAt).toISOString() } : {}),
    publisher: ref(ORG_ID),
  };
}

export interface BlogPostInput {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  image: string;
  author: string;
}

/** BlogPosting for an article, from the data source the page already reads. */
export function blogPostJsonLd(post: BlogPostInput): SchemaNode {
  const published = new Date(post.date).toISOString();
  return {
    "@type": "BlogPosting",
    "@id": `${ORIGIN}/blog/${post.slug}#blogposting`,
    headline: post.title,
    description: post.excerpt,
    image: [post.image.startsWith("http") ? post.image : absolute(post.image)],
    datePublished: published,
    dateModified: published,
    author: authorRef(post.author),
    publisher: ref(ORG_ID),
    mainEntityOfPage: absolute(`/blog/${post.slug}`),
    inLanguage: "en",
  };
}

/** The Blog index node. */
export function blogJsonLd(): SchemaNode {
  return {
    "@type": "Blog",
    "@id": BLOG_ID,
    name: "Insights & AI-Native",
    description:
      "Deep dives into building AI-Native companies — from AI chatbots and voice agents to Loop Engineering and Digital FTEs.",
    url: absolute("/blog"),
    inLanguage: "en",
    publisher: ref(ORG_ID),
  };
}

export function aboutPageJsonLd(): SchemaNode {
  return {
    "@type": "AboutPage",
    "@id": `${ORIGIN}/about#webpage`,
    url: absolute("/about"),
    name: "Building the workforce of tomorrow.",
    description:
      "We build Digital FTEs and put them to work inside real processes — meet the founders and the story behind Deuvix AI Factory.",
    isPartOf: ref(WEBSITE_ID),
    about: [ref(BILAL_ID), ref(ASAD_ID)],
    inLanguage: "en",
  };
}

export function contactPageJsonLd(): SchemaNode {
  return {
    "@type": "ContactPage",
    "@id": `${ORIGIN}/contact#webpage`,
    url: absolute("/contact"),
    name: "Tell us what you want to automate.",
    description:
      "Get in touch with Deuvix AI Factory to book a free consultation. Reply within 24 hours, NDA on request.",
    isPartOf: ref(WEBSITE_ID),
    inLanguage: "en",
  };
}

export interface FaqInput {
  q: string;
  a: string;
}

/** FAQPage only from a page that actually renders a visible FAQ section. */
export function faqPageJsonLd(faqs: FaqInput[]): SchemaNode {
  return {
    "@type": "FAQPage",
    "@id": `${ORIGIN}/faq#webpage`,
    url: absolute("/faq"),
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a.replace(/\[TODO[^\]]*\]/g, "").trim(),
      },
    })),
  };
}
