export interface SiteConfig {
  [slot: string]: string;
}

export const DEFAULTS: SiteConfig = {
  logo: "/images/logo.png",
  "hero-bg": "/images/hero-bg.jpg",
  "cta-bg": "/images/cta-bg.jpg",
  "about-main": "/images/about1.jpg",
  "about-secondary": "/images/about2.jpg",
  "team-bilal": "/images/bilal.jpg",
  "team-asad": "/images/asad.jpg",
  "product-bg": "/images/product-bg.jpg",
  "contact-bg": "/images/hero-bg.jpg",
};

export const SLOT_LABELS: Record<string, string> = {
  logo: "Logo",
  "hero-bg": "Hero Background",
  "cta-bg": "CTA Background",
  "about-main": "About Main Image",
  "about-secondary": "About Corner Badge",
  "team-bilal": "Team — Bilal Ali",
  "team-asad": "Team — Asadullah",
  "product-bg": "Products Background",
  "contact-bg": "Contact Background",
};

export const SLOT_KEYS = Object.keys(DEFAULTS);

export function getImageUrl(slot: string, config?: SiteConfig): string {
  if (config && config[slot]) return config[slot];
  return DEFAULTS[slot] || DEFAULTS.logo;
}
