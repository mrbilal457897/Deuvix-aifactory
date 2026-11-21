/**
 * Public pricing data — the single source of truth for the visible price lines
 * on the homepage and for the Offer structured data that describes them.
 *
 * The monetary values below are exactly the ones supplied by the site owner.
 * A `custom` item has no number: the page shows "Custom quote" and NO Offer is
 * emitted for it.
 */

export type PriceType = "fixed" | "from" | "custom";

export interface PricingItem {
  /** Stable id used in the JSON-LD @id. */
  id: string;
  /** Anchor on /products for the full service description. */
  anchor: string;
  /** Service name as shown on the site and in the schema. */
  name: string;
  /** One-line description, taken from the visible copy on /products. */
  description: string;
  /** How the price is presented. */
  priceType: PriceType;
  /** Numeric price, or null for quote-only services. */
  price: number | null;
  /** ISO 4217 currency for this price. */
  currency: string;
  /** Optional billing note, e.g. "per month". */
  billingNote?: string;
}

export const PRICING_DATA: { currency: string; services: PricingItem[] } = {
  currency: "USD",
  services: [
    {
      id: "digital-ftes",
      anchor: "digital-fte-deployment",
      name: "Digital FTEs",
      description:
        "Deploy Digital FTEs that work 168 hours a week, with up to 85% lower cost per completed task versus fully-loaded human delivery.",
      priceType: "custom",
      price: null,
      currency: "USD",
    },
    {
      id: "ai-chatbots",
      anchor: "ai-chatbots",
      name: "AI Chatbots",
      description:
        "Conversational AI assistants deployed on your website or product. Trained on your business data to qualify leads, answer questions, and resolve support tickets 24/7.",
      priceType: "from",
      price: 500,
      currency: "USD",
    },
    {
      id: "voice-agents",
      anchor: "voice-agents",
      name: "Voice Agents",
      description:
        "AI phone agents that answer calls, qualify leads, and run support conversations in natural language. Your business never misses a call, day or night.",
      priceType: "custom",
      price: null,
      currency: "USD",
    },
    {
      id: "custom-agents",
      anchor: "custom-agents",
      name: "Custom Agents",
      description:
        "Bespoke AI agents engineered for your domain-specific workflows. From triage to reporting, we design agents that act on your tools — not just suggest.",
      priceType: "custom",
      price: null,
      currency: "USD",
    },
    {
      id: "loop-engineering",
      anchor: "loop-engineering",
      name: "Loop Engineering",
      description:
        "A loop starts work, checks it, records the result, and repeats on its own. The prompt was yesterday — today we design the loop.",
      priceType: "custom",
      price: null,
      currency: "USD",
    },
    {
      id: "fde-consulting",
      anchor: "fde-consulting",
      name: "FDE Consulting",
      description:
        "Expert engineers deployed to your site to implement AI-native solutions. Spec-driven development with production-ready architecture.",
      priceType: "custom",
      price: null,
      currency: "USD",
    },
  ],
};

/** Existing imports elsewhere in the app use this array directly. */
export const pricingItems = PRICING_DATA.services;

const CURRENCY_PREFIX: Record<string, string> = { USD: "$" };

/** The exact text rendered next to a service on the page. */
export function priceLabel(item: PricingItem): string {
  if (item.priceType === "custom" || item.price === null) return "Custom quote";
  const prefix = item.priceType === "from" ? "From " : "";
  const symbol = CURRENCY_PREFIX[item.currency] ?? `${item.currency} `;
  return `${prefix}${symbol}${item.price}${item.billingNote ? ` ${item.billingNote}` : ""}`;
}
