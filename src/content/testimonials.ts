/**
 * Testimonials data file.
 *
 * Every entry is a placeholder until a client approves a quote. Entries with
 * `verified: false` never render publicly. Replace the placeholders with real
 * quotes and set `verified: true` when they are approved.
 */
export interface Testimonial {
  name: string;
  role: string;
  company: string;
  quote: string;
  result: string;
  verified: boolean;
}

// TODO: replace with real, client-approved testimonials.
export const testimonials: Testimonial[] = [
  {
    name: "TODO — client name withheld",
    role: "TODO — role",
    company: "TODO — company",
    quote: "TODO — verified quote approved by the client.",
    result: "TODO — measured result after the engagement",
    verified: false,
  },
  {
    name: "TODO — client name withheld",
    role: "TODO — role",
    company: "TODO — company",
    quote: "TODO — verified quote approved by the client.",
    result: "TODO — measured result after the engagement",
    verified: false,
  },
  {
    name: "TODO — client name withheld",
    role: "TODO — role",
    company: "TODO — company",
    quote: "TODO — verified quote approved by the client.",
    result: "TODO — measured result after the engagement",
    verified: false,
  },
];
