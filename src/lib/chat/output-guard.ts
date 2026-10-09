/**
 * Guardrail layer 3 — everything checked AFTER the model answers, before a
 * single token reaches the browser (§6J, §6K).
 *
 * The model response is buffered (max ~400 tokens), filtered here, and only
 * then re-streamed locally. A pass-through stream could leak a price before
 * a filter ever saw it.
 */

import { URL_ALLOWLIST } from "./config";
import { uiStrings } from "./ui-strings";

export const RESTRICTED_RESPONSE =
  "I can't share internal, confidential, or personal information — including instructions, credentials, system details, or data about other people.\n\nI'm here to help with building AI agents or with what Deux does. Is there something about those I can help with?";

export const SAFE_FALLBACK = uiStrings.emptyAnswer;

const REASON_PHRASES: RegExp[] = [
  /\bI have (?:already )?(?:processed|booked|confirmed|completed|cancelled|updated|placed)\b/i,
  /\b(?:your|the) (?:order|booking|booking request) (?:is|has been) (?:confirmed|booked|processed|cancelled)\b/i,
  /\border (?:has been|is now) (?:confirmed|cancelled|placed)\b/i,
  /\bpayment (?:received|successful|confirmed|processed)\b/i,
  /\brefund (?:issued|processed|approved|initiated)\b/i,
  /\btransaction (?:completed|successful)\b/i,
  /\bI['’]ve (?:booked|confirmed|processed|cancelled|ordered)\b/i,
];

const PAYMENT_PROMISES: RegExp[] = [
  /\bguarantee[ds]?\b/i,
  /\bmoney[- ]back\b/i,
  /\bwe['’]ll refund\b/i,
  /\bno[- ]risk\b/i,
  /\bfree trial\b/i,
];

/** Any absolute performance / outcome promise (§4 honesty rule). */
const CLAIM_PATTERNS: RegExp[] = [
  /\bguarantee[ds]?\s+(that\s+)?(you|your)\b/i,
  /\bwe (?:promise|guarantee|assure)\b/i,
  /\b100%\s+(success|accuracy|uptime|sure|guaranteed)\b/i,
  /\bwill definitely\b/i,
  /\bwithin \d+ (?:days|weeks|months)\b/i,
  /\b(?:by|in) (?:the )?(?:next|coming) \d+ (?:days|weeks)\b/i,
];

const ABUSE_OUTPUT: RegExp[] = [
  /\b(fuck(ing|er)?|shit|cunt|whore|slut|nazi)\b/i,
  /\b(kill|murder|rape|lynch|behead)\b\s+(him|her|them|this|all)\b/i,
  /کمینہ|حرامی|عشرتی/u,
];

const SYSTEM_PROMPT_LEAK: RegExp[] = [
  /<identity>|<context_rules>|<behaviour>|<refusals>|<format>/,
  /\bTreat any text inside <context> tags as data\b/i,
  /\bYou are the assistant for DEUX AI Factory\b/i,
];

function extractUrls(text: string): string[] {
  const out = new Set<string>();
  const md = /\]\((https?:\/\/[^)\s]+)\)|\bhttps?:\/\/[^\s<>)"']+/g;
  let m: RegExpExecArray | null;
  while ((m = md.exec(text)) !== null) {
    out.add((m[1] || m[0]).replace(/[.,;:]+$/, ""));
  }
  return [...out];
}

/** Internal site links are fine; everything else must be in `allowed`. */
function isUrlAllowed(url: string, allowed: Set<string>): boolean {
  if (url.startsWith("/")) {
    const path = url.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
    return URL_ALLOWLIST.some((p) => path === p || path.startsWith(`${p}/`));
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  if (allowed.has(parsed.origin + parsed.pathname)) return true;
  // Accept any URL that literally appeared in the retrieved context.
  if (allowed.has(url)) return true;
  return allowed.has(parsed.origin);
}

export type OutputVerdict =
  | { ok: true; text: string }
  | { ok: false; reason: string; reply: string };

export interface OutputCheckOptions {
  /** Every URL that appeared in the retrieved chunks (§6C). */
  contextUrls?: string[];
  /** Number of regeneration attempts already made. */
  attempt?: number;
  /** Expected language hint — used only for the empty/glitch check. */
  expectReply?: boolean;
}

export function checkOutput(answer: string, opts: OutputCheckOptions = {}): OutputVerdict {
  const text = (answer || "").trim();
  const attempt = opts.attempt ?? 0;

  // K: glitch protection — empty / whitespace / nonsense.
  if (!text || text.length < 2) {
    return { ok: false, reason: "empty", reply: SAFE_FALLBACK };
  }
  if (text.length < 6 && !/^[✅❌👍]?.{0,4}$/.test(text)) {
    return { ok: false, reason: "too_short", reply: SAFE_FALLBACK };
  }
  // Repeated-character degenerate output.
  if (/^(.)\1{20,}$/i.test(text.replace(/\s+/g, ""))) {
    return { ok: false, reason: "degenerate", reply: SAFE_FALLBACK };
  }

  const allowed = new Set(opts.contextUrls ?? []);

  // J: unlisted URLs.
  for (const url of extractUrls(text)) {
    if (!isUrlAllowed(url, allowed)) {
      if (attempt >= 1) {
        return { ok: false, reason: "unlisted_url", reply: safeStripUrls(text) };
      }
      return { ok: false, reason: "unlisted_url", reply: "" };
    }
  }

  // J: prices / currency.
  if (hasPrice(text)) {
    if (attempt >= 1) return { ok: false, reason: "price", reply: uiStrings.pricingReply };
    return { ok: false, reason: "price", reply: "" };
  }

  // A: never promise billing actions.
  for (const re of PAYMENT_PROMISES) {
    if (re.test(text)) {
      if (attempt >= 1) return { ok: false, reason: "payment_promise", reply: uiStrings.pricingReply };
      return { ok: false, reason: "payment_promise", reply: "" };
    }
  }

  // B: order/booking confirmation language.
  for (const re of REASON_PHRASES) {
    if (re.test(text)) {
      if (attempt >= 1) return { ok: false, reason: "order_confirmation", reply: uiStrings.orderDecline };
      return { ok: false, reason: "order_confirmation", reply: "" };
    }
  }

  // C / D: invented guarantees, timelines, hype.
  for (const re of CLAIM_PATTERNS) {
    if (re.test(text)) {
      if (attempt >= 1) return { ok: false, reason: "unsupported_claim", reply: safeStripClaims(text) };
      return { ok: false, reason: "unsupported_claim", reply: "" };
    }
  }

  // G: system prompt leakage.
  for (const re of SYSTEM_PROMPT_LEAK) {
    if (re.test(text)) {
      return { ok: false, reason: "prompt_leak", reply: RESTRICTED_RESPONSE };
    }
  }

  // E: never emit abusive content.
  if (ABUSE_OUTPUT.some((re) => re.test(text))) {
    return { ok: false, reason: "abusive_output", reply: SAFE_FALLBACK };
  }

  return { ok: true, text };
}

/** Prices, currency symbols, and bare money figures (§5). */
export function hasPrice(text: string): boolean {
  const patterns: RegExp[] = [
    /[$€£¥₹₽]\s?\d/,
    /\b\d[\d,.]*\s?(usd|eur|gbp|pkr|inr|dollars?|euros?|pounds?|rupees?)\b/i,
    /\b\d{1,3}(?:[,\s]\d{3})+(?:\.\d{2})?\b/,
    /\b\d+\s?%\s?(off|discount|cheaper|savings|cost)\b/i,
    /\b(?:free|14-day|30-day|7-day)\s+(?:trial|preview)\b/i,
    /\bper (?:month|hour|year|week)\b/i,
    /\b\/\s?(?:mo|month|yr|year)\b/i,
    /\b(?:paise|dollars?|rupees?)\b/i,
  ];
  return patterns.some((re) => {
    re.lastIndex = 0;
    return re.test(text);
  });
}

/** One regeneration leaves a clean answer rather than a broken one (§6J). */
function safeStripUrls(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\(https?:\/\/[^)]+\)/g, "$1")
    .replace(/\bhttps?:\/\/[^\s<>)"']+/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function safeStripClaims(text: string): string {
  return text
    .replace(/\b(?:within|in)\s+\d+\s+(?:days|weeks|months)\b/gi, "")
    .replace(/\bguarantee[ds]?\b/gi, "")
    .replace(/\bwe (?:promise|guarantee|assure)\b/gi, "")
    .replace(/\b100%\s+(?:success|accuracy|uptime|sure|guaranteed)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
