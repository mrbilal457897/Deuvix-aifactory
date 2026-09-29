import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cal.com signs the raw request body with HMAC-SHA256 and sends the hex digest
 * in `X-Cal-Signature-256` (some versions prefix it with `sha256=`).
 *
 * Fails closed: if no secret is configured the request is never trusted.
 */
export function verifyCalSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string | undefined,
): boolean {
  if (!secret) {
    console.error("[cal-webhook] CAL_WEBHOOK_SECRET is not set - rejecting request");
    return false;
  }
  if (!signatureHeader) return false;

  const provided = signatureHeader.trim().replace(/^sha256=/i, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(provided)) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const providedBuf = Buffer.from(provided, "hex");
  const expectedBuf = Buffer.from(expected, "hex");

  // timingSafeEqual throws on length mismatch; both are 32 bytes given the regex.
  return timingSafeEqual(providedBuf, expectedBuf);
}

/** Helper for local testing: produces the header value Cal.com would send. */
export function signCalPayload(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}
