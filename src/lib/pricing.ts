/**
 * Public pricing data — the single source of truth for the service offers on
 * /products and their structured data. Both read from this constant so the
 * visible prices and the Offer markup can never drift apart.
 *
 * IMPORTANT: no monetary values have been supplied yet. Every entry is
 * therefore a custom quote, which means:
 *   - the page shows "Custom quote"
 *   - the JSON-LD Offer carries no price / priceCurrency / priceSpecification
 *
 * When real values arrive, replace `price` with either
 *   { kind: "exact", amount: 123, currency: "USD" }  or
 *   { kind: "from",  amount: 123, currency: "USD" }
 * and the page, schema and sitemap stay in sync automatically.
 */

export type PriceValue =
  | { kind: "custom" }
  | { kind: "exact"; amount: number; currency: string }
  | { kind: "from"; amount: number; currency: string };

export interface PricingItem {
  /** Stable id used in the JSON-LD @id. */
  id: string;
  /** Anchor on /products for the full service description. */
  anchor: string;
  /** Service name as shown on /products and in the schema. */
  name: string;
  /** One-line description, taken from the visible copy on /products. */
  description: string;
  price: PriceValue;
}

export const pricingItems: PricingItem[] = [
  {
    id: "digital-ftes",
    anchor: "digital-fte-deployment",
    name: "Digital FTEs",
    description:
      "Deploy Digital FTEs that work 168 hours a week, with up to 85% lower cost per completed task versus fully-loaded human delivery.",
    price: { kind: "custom" },
  },
  {
    id: "ai-chatbots",
    anchor: "ai-chatbots",
    name: "AI Chatbots",
    description:
      "Conversational AI assistants deployed on your website or product. Trained on your business data to qualify leads, answer questions, and resolve support tickets 24/7.",
    price: { kind: "custom" },
  },
  {
    id: "voice-agents",
    anchor: "voice-agents",
    name: "Voice Agents",
    description:
      "AI phone agents that answer calls, qualify leads, and run support conversations in natural language. Your business never misses a call, day or night.",
    price: { kind: "custom" },
  },
  {
    id: "custom-agents",
    anchor: "custom-agents",
    name: "Custom Agents",
    description:
      "Bespoke AI agents engineered for your domain-specific workflows. From triage to reporting, we design agents that act on your tools — not just suggest.",
    price: { kind: "custom" },
  },
  {
    id: "loop-engineering",
    anchor: "loop-engineering",
    name: "Loop Engineering",
    description:
      "A loop starts work, checks it, records the result, and repeats on its own. The prompt was yesterday — today we design the loop.",
    price: { kind: "custom" },
  },
  {
    id: "fde-consulting",
    anchor: "fde-consulting",
    name: "FDE Consulting",
    description:
      "Expert engineers deployed to your site to implement AI-native solutions. Spec-driven development with production-ready architecture.",
    price: { kind: "custom" },
  },
];

/** The exact string rendered on the page — also used by the verification check. */
export function priceLabel(price: PriceValue): string {
  if (price.kind === "custom") return "Custom quote";
  const prefix = price.kind === "from" ? "From " : "";
  return `${prefix}${price.currency} ${price.amount}`;
}
