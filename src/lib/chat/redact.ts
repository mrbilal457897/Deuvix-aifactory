/**
 * Redaction applied BEFORE anything is written to the database or a log (§6A, §3).
 * The chat never accepts payment data; if a user pastes some, it is destroyed
 * in place rather than stored or echoed back.
 */

export const REDACTED = "[redacted]";

const PAYMENT_PATTERNS: RegExp[] = [
  // Card-like digit runs: 13-19 digits, optionally separated by spaces/dashes.
  /\b(?:\d[ -]?){13,19}\b/g,
  // IBANs
  /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g,
  // CVV / CVC next to a label
  /\b(?:cvv|cvc|cvv2|cvc2|security code|pin)\b\s*[:=-]?\s*\d{3,4}/gi,
  // Wallet / crypto addresses
  /\b0x[a-fA-F0-9]{40,}\b/g,
  /\b(?:bc1|ltc1)[a-zA-HJ-NP-Z0-9]{20,}\b/g,
];

const SECRET_PATTERNS: RegExp[] = [
  /\b(?:password|passwd|pwd|passphrase|secret|api key|apikey|access token|refresh token|private key|otp|one[- ]time password)\b\s*[:=-]?\s*\S+/gi,
  /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{16,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bAIza[A-Za-z0-9_-]{30,}\b/g,
];

const PII_PATTERNS: Array<[RegExp, string]> = [
  // Email addresses → keep the shape, drop the identity.
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[email]"],
  // Long phone numbers (covers +92 300 1234567, 0300-1234567, etc.)
  [/(?<!\d)(?:\+?\d[ -]?){10,15}(?!\d)/g, "[phone]"],
];

export interface RedactionResult {
  text: string;
  /** Which categories fired — used for logging without storing the payload. */
  hitPayment: boolean;
  hitSecret: boolean;
  hitPii: boolean;
}

/** True when the string looks like payment credential material. */
export function hasPaymentData(raw: string): boolean {
  return PAYMENT_PATTERNS.some((re) => {
    re.lastIndex = 0;
    return re.test(raw);
  });
}

/**
 * Strips payment details and secrets outright, and optionally masks PII.
 * `maskPii` is false when the text is the user's own message being stored for
 * a logged-in session (they are allowed to write their own email into their
 * own history); it is true for anything we log.
 */
export function redact(raw: string, maskPii = true): RedactionResult {
  let text = raw;
  let hitPayment = false;
  let hitSecret = false;
  let hitPii = false;

  for (const re of PAYMENT_PATTERNS) {
    re.lastIndex = 0;
    if (re.test(text)) {
      hitPayment = true;
      re.lastIndex = 0;
      text = text.replace(re, REDACTED);
    }
  }

  for (const re of SECRET_PATTERNS) {
    re.lastIndex = 0;
    if (re.test(text)) {
      hitSecret = true;
      re.lastIndex = 0;
      text = text.replace(re, REDACTED);
    }
  }

  if (maskPii) {
    for (const [re, replacement] of PII_PATTERNS) {
      re.lastIndex = 0;
      if (re.test(text)) {
        hitPii = true;
        re.lastIndex = 0;
        text = text.replace(re, replacement);
      }
    }
  }

  return { text, hitPayment, hitSecret, hitPii };
}

/**
 * Leading-digit mask for card-shaped runs only. Unlike {@link redact} this
 * preserves surrounding words, so the warning we send back reads naturally
 * while the number itself is gone.
 */
export function stripCardNumbers(raw: string): { text: string; found: boolean } {
  let found = false;
  let text = raw;
  for (const re of PAYMENT_PATTERNS) {
    re.lastIndex = 0;
    if (re.test(text)) {
      found = true;
      re.lastIndex = 0;
      text = text.replace(re, REDACTED);
    }
  }
  return { text, found };
}
