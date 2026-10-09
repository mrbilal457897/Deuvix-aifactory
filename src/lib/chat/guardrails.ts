/**
 * Guardrail layer 1 - everything checked BEFORE the model is called (§6).
 *
 * Layer 2 is the system prompt (systemPrompt.ts).
 * Layer 3 is output-guard.ts.
 */

import { chatConfig } from "./config";
import { uiStrings } from "./ui-strings";
import { redact, stripCardNumbers, hasPaymentData, type RedactionResult } from "./redact";

export { RESTRICTED_RESPONSE } from "./output-guard";

/* -------------------------------------------------------------------------- */
/* Input sanitising                                                           */
/* -------------------------------------------------------------------------- */

/** Strip control chars, collapse whitespace, cap length (§6I). */
export function sanitizeInput(raw: string): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, chatConfig.maxInputChars);
}

/** Escape anything that could be interpreted as HTML/markdown-injected markup. */
export function escapeMarkup(raw: string): string {
  return raw.replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"));
}

/* -------------------------------------------------------------------------- */
/* Prompt injection / jailbreak (§6G)                                          */
/* -------------------------------------------------------------------------- */

const INJECTION_PATTERNS: RegExp[] = [
  /\bignore\b.{0,40}\b(previous|prior|above|all|your)\b.{0,40}\b(instructions|prompts?|messages|rules)\b/i,
  /\b(reveal|expose|leak|disclose|print|echo|output|show|share|give|repeat|dump|display)\b.{0,30}\b(instructions|system prompt|system message|prompt|rules|guidelines)\b/i,
  /\b(system prompt|system message|initial prompt|original prompt|your prompt|hidden prompt|developer message)\b/i,
  /\b(simulate|pretend|act as|role ?play|jailbreak|developer mode|god mode)\b/i,
  /\bDAN\b|\bdo anything now\b/i,
  /\b(forget|disregard|override|bypass|circumvent)\b.{0,30}\b(rules|instructions|guidelines|restrictions|safety)\b/i,
  /\b(api ?key|secret key|access token|oauth token|password|passphrase|credential)s?\b.{0,30}\b(your|the|this|show|reveal|give|print)\b/i,
  /\b(show|reveal|print|repeat|output)\b.{0,20}\b(your|the)\b.{0,20}\b(setup|configuration|settings|backend|instructions|prompt)\b/i,
  /\b(database|db)\b.{0,20}\b(password|login|url|host|port)\b/i,
  /\b(admin|internal|confidential|secret|private)\b.{0,30}\b(panel|account|data|info|details|system)\b/i,
  /\b(other|another)\b.{0,20}\b(users?|customers?|clients?|data)\b/i,
  /\b(environment variables|env ?vars?|process\.env|config\.(json|ts)|\benv file)\b/i,
  /(^|\s)\.env(\s|$)/i,
  /\b(source code|raw html|backend|server code|your rules|these rules)\b/i,
  /\bnew instructions|updated instructions|actual instructions|real instructions\b/i,
  /<\|im_start\|>|<\|im_end\|>|\[INST\]|\[\/INST\]|<<\s*SYS\s*>>/i,
];

export function isInjectionAttempt(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

/* -------------------------------------------------------------------------- */
/* Abuse detection (§6E) - English, Urdu script, Roman Urdu                    */
/* -------------------------------------------------------------------------- */

const ABUSE_PATTERNS: RegExp[] = [
  // English profanity
  /\b(fuck(?:ing|er|s)?|shit(?:ty|s)?|bullshit|bastard|asshole|dickhead|cunt|whore|slut)\b/i,
  // Insults - only counted when aimed at a person, so a user complaining
  // "this build is garbage" about their own code is not treated as abuse.
  /\b(you(?:r)?|u|ur|this (?:bot|assistant|company)|everyone)\s+(?:are\s+)?(?:an?\s+)?(idiot|moron|stupid|dumb|loser|pathetic|useless|trash|garbage)\b/i,
  /\b(idiot|moron|dumbass|retard(?:ed)?|pathetic)\b/i,
  // Threats / violence (context-bounded so "shoot a video" is fine)
  /\b(kill|murder|rape|molest|lynch|behead|shoot|bomb)\w*\b\s+(?:you|him|her|them|ur|your|this|all|everyone)\b/i,
  /\b(wish you|hope you)\s+(?:were|are)\s+(?:dead|gone)\b/i,
  /\bhate\s+(?:you|this|everything)\b/i,
  /\b(nazi|white supremacist|supremacist)\b/i,
  // Roman Urdu / Hinglish
  /\b(?:bewakoof|kamina|kaminay|harami|haramkhor|bakwas|bikau|chawal|chutiy(?:a|ay)|gandu|badtameez|beyhaya|bewajah|lanat|kutta|kamzor)\b/i,
  /\b(?:tera|teri|tumhara|apka)\s+(?:baap|abba)\b/i,
  /\b(?:mar(?:a|o)|uro|khatam)\s+(?:do|de|dia|jao)\b/i,
  // Urdu script - whole words only. Never a bare character class: that would
  // flag every message written in Urdu script as abusive.
  /بے غیرت|کمینے?|حرامی|عشرتی|بے ادب|گندی بات|بے حیا|عُرصہ/u,
];

export function isAbusive(text: string): boolean {
  return ABUSE_PATTERNS.some((p) => p.test(text));
}

/* -------------------------------------------------------------------------- */
/* Off-topic + scope (§6F)                                                     */
/* -------------------------------------------------------------------------- */

const OFF_TOPIC_PATTERNS: RegExp[] = [
  /\b(legal advice|sue|lawsuit|divorce|custody)\b/i,
  /\b(diagnos(e|is)|symptoms|prescri(b|ption)|medication|dosage)\b/i,
  /\b(invest in|stocks?|shares?|trading|crypto|forex|lottery|betting)\b/i,
  /\b(write my (essay|homework|assignment|thesis))\b/i,
  /\b(girlfriend|boyfriend|dating|nsfw|porn|sex chat)\b/i,
  /\b(celebrity|gossip|sports (score|news)|horoscope|tarot)\b/i,
  /\bhow (?:to|do i|can i|would i)\s+(?:hack|phish|crack|steal|bypass)\b/i,
  /\b(?:hack|phish|crack|bypass)\w*\s+(?:a\s+|the\s+)?(?:paywall|license|account|website|site)\b/i,
  /\b(malware|ransomware|keylogger|botnet)\b/i,
];

export function isOffTopic(text: string): boolean {
  return OFF_TOPIC_PATTERNS.some((p) => p.test(text));
}

/** Topic label used inside the boundary sentence. */
function offTopicLabel(text: string): string {
  if (/\b(diagnos|symptom|prescri|medication)\b/i.test(text)) return "medical questions";
  if (/\b(legal|sue|lawsuit|divorce)\b/i.test(text)) return "legal questions";
  if (/\b(invest|stock|trading|crypto|forex|lottery)\b/i.test(text)) return "financial advice";
  if (/\b(hack|phish|crack|steal|malware|ransomware)\b/i.test(text)) return "anything harmful or illegal";
  if (/\b(girlfriend|boyfriend|dating|nsfw|porn|sex)\b/i.test(text)) return "that topic";
  return "topics outside AI agents and what Deux does";
}

/* -------------------------------------------------------------------------- */
/* Pricing intent (§5)                                                         */
/* -------------------------------------------------------------------------- */

const PRICING_PATTERNS: RegExp[] = [
  /\b(pric(e|es|ing)|cost|costs|charge|charges|fee|fees|rate|rates|budget|afford)\b/i,
  /\b(quote|quotation|estimate|pricing plan|payment plan|installment|subscription)\b/i,
  // NOTE: bare "offer" is deliberately absent — "What services do you offer?"
  // is one of the two most common questions and must never be priced-gated.
  /\b(discount|discounts|coupon|pricing plan|payment plan|installment|subscription)\b/i,
  /\b(?:limited[- ]time|special|best)\s+offer\b/i,
  /\b(cheap|cheaper|expensive|affordable)\b/i,
  /\b(how much|kitna|kitne|kits|کتنا|کتنے)\b/i,
  /\b(monthly|per month|\/mo|\/month|annually|yearly)\b/i,
  /\b(pay|paid|payment|invoice|billing|refund)\b/i,
  /\b(timeline|deadline|how long|kitne din|kab tak|delivery date|turnaround)\b/i,
  /[$€£¥₹]\s?\d/,
  /\b\d+\s?(usd|pkr|dollars?|rupees?)\b/i,
];

export function isPricingIntent(text: string): boolean {
  return PRICING_PATTERNS.some((p) => p.test(text));
}

/* -------------------------------------------------------------------------- */
/* Order / commitment intent (§6B)                                             */
/* -------------------------------------------------------------------------- */

const ORDER_PATTERNS: RegExp[] = [
  /\b(cancel|refund|reschedul(e|ing)|book(ed|ing)?|confirm(ed|ation)?|place an order|order (status|tracking))\b/i,
  /\b(my|the|this)\s+(order|booking|contract|delivery|invoice|subscription)\b/i,
  /\b(update|change|modify|process|ship|dispatch)\b\s+(my|the)\s+(order|booking)\b/i,
  /\b(order cancel|booking cancel|kar do|karwa do|kara do|cancel kar)\b/i,
  /\b(paise (wapas|refund)|payment wapas|bill kam)\b/i,
];

export function isOrderIntent(text: string): boolean {
  return ORDER_PATTERNS.some((p) => p.test(text));
}

/* -------------------------------------------------------------------------- */
/* Spam / empty (§6I)                                                          */
/* -------------------------------------------------------------------------- */

export function isSpam(text: string): boolean {
  if (!text) return true;
  if (text.length < 2) return true;
  const distinct = new Set(text.toLowerCase().split(/\s+/)).size;
  if (distinct <= 1 && text.length > 12) return true;
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length >= 20) {
    const unique = new Set(letters.toLowerCase()).size;
    if (unique <= 4) return true;
  }
  if (/^(.)\1{9,}$/.test(text.replace(/\s+/g, ""))) return true;
  return false;
}

/* -------------------------------------------------------------------------- */
/* The combined pre-model verdict                                              */
/* -------------------------------------------------------------------------- */

export type PreModelVerdict =
  | { action: "block"; reason: string; reply: string }
  | { action: "redact"; reason: string; reply: string; cleaned: string }
  | { action: "allow"; cleaned: string; redaction: RedactionResult };

export function evaluateInput(raw: string): PreModelVerdict {
  const cleaned = sanitizeInput(raw);

  if (isSpam(cleaned)) {
    return { action: "block", reason: "empty_or_spam", reply: "" };
  }

  const cardCheck = stripCardNumbers(cleaned);
  if (cardCheck.found) {
    return {
      action: "redact",
      reason: "payment_data",
      reply: uiStrings.paymentWarning,
      cleaned: cardCheck.text,
    };
  }

  if (hasPaymentData(cleaned)) {
    const red = redact(cleaned, false);
    return {
      action: "redact",
      reason: "payment_data",
      reply: uiStrings.paymentWarning,
      cleaned: red.text,
    };
  }

  if (isInjectionAttempt(cleaned)) {
    return { action: "block", reason: "prompt_injection", reply: INJECTION_REPLY };
  }

  if (isOrderIntent(cleaned)) {
    return { action: "block", reason: "order_request", reply: uiStrings.orderDecline };
  }

  if (isPricingIntent(cleaned)) {
    return { action: "block", reason: "pricing_request", reply: uiStrings.pricingReply };
  }

  if (isOffTopic(cleaned)) {
    return {
      action: "block",
      reason: "off_topic",
      reply: uiStrings.boundary(offTopicLabel(cleaned)),
    };
  }

  const red = redact(cleaned, false);
  return { action: "allow", cleaned: red.text, redaction: red };
}

export const INJECTION_REPLY =
  "I can't show you my instructions, configuration, or internal details — and I won't change how I work because a message asks me to.\n\nI can help with building AI agents or with what Deux does. What would you like to know?";
