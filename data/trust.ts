/**
 * Trust bar content (client logos + technology logos).
 *
 * Rules — do not bypass:
 * 1. Client logos render ONLY when `permissionConfirmed: true`. Never add a
 *    client logo we do not have written permission to display.
 * 2. Technology logos are labelled "Technologies we build with" unless the
 *    entry's `relationship` is "official partner" (a signed partnership).
 *    Using a tool does not make us an "official partner".
 * 3. Every entry must be a technology we genuinely use and can stand behind.
 *
 * To add a new mark, drop the SVG into /public/logos and see
 * /public/logos/README.md.
 */

export type TrustRelationship = "built with" | "official partner";

export interface TrustLogo {
  /** Display name, also used for the accessible label. */
  name: string;
  /** SVG filename inside /public/logos (without the folder). */
  logo: string;
  /** Optional public website the logo links to. */
  url?: string;
}

export interface ClientLogo extends TrustLogo {
  /**
   * Set to true ONLY once the client has agreed (in writing) to being shown
   * here. Unconfirmed entries are filtered out before rendering.
   */
  permissionConfirmed: boolean;
}

export interface TechLogo extends TrustLogo {
  /**
   * "built with"       → rendered under "Technologies we build with"
   * "official partner" → rendered under "Partners" (signed partnership only)
   */
  relationship: TrustRelationship;
}

/**
 * Client logos. Empty by default — add entries only with permission.
 *
 * Example:
 *   { name: "Acme Corp", logo: "acme.svg", url: "https://acme.com", permissionConfirmed: true }
 */
export const clients: ClientLogo[] = [];

/**
 * Technologies Deuvix AI Factory actually builds with.
 *
 * TODO(owner): confirm each technology below is in active use and remove any
 * that are not, so the trust bar stays honest.
 */
export const techPartners: TechLogo[] = [
  { name: "OpenAI", logo: "openai.svg", url: "https://openai.com", relationship: "built with" },
  { name: "Anthropic", logo: "anthropic.svg", url: "https://www.anthropic.com", relationship: "built with" },
  { name: "Google", logo: "google.svg", url: "https://ai.google", relationship: "built with" },
  { name: "Vercel", logo: "vercel.svg", url: "https://vercel.com", relationship: "built with" },
  { name: "Docker", logo: "docker.svg", url: "https://www.docker.com", relationship: "built with" },
  { name: "Kubernetes", logo: "kubernetes.svg", url: "https://kubernetes.io", relationship: "built with" },
];
