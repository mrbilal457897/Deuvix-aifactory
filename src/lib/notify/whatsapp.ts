/**
 * WhatsApp helper layer.
 *
 * Hard rule: we only ever build https://wa.me/ click-to-chat links. No
 * unofficial library (Baileys, Evolution API, whatsapp-web.js, ...) is used,
 * because unofficial clients get the sending number banned.
 *
 * `WhatsAppSender` is the seam for later: an official WhatsApp Cloud API
 * sender can be registered in `getWhatsAppSender` without touching callers.
 */

export const WA_BASE = "https://wa.me";

export interface WhatsAppSendResult {
  ok: boolean;
  provider: "wa-link" | "cloud-api" | "none";
  id?: string;
  error?: string;
}

export interface WhatsAppMessage {
  /** Recipient in any format; digits are extracted. */
  to: string;
  body: string;
}

export interface WhatsAppSender {
  readonly name: string;
  send(message: WhatsAppMessage): Promise<WhatsAppSendResult>;
}

/** Strips everything but digits and drops a leading `00` / `+`. */
export function normalizeWhatsAppNumber(input?: string | null): string | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // A national number like "0300-1234567" carries a trunk 0 that wa.me does
  // not want; the country code has to be added separately.
  if (digits.startsWith("0")) {
    const national = digits.slice(1);
    if (national.length === 10) digits = `92${national}`;
  }
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

export function getBusinessWhatsAppNumber(): string | null {
  return normalizeWhatsAppNumber(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
}

/** wa.me link to open a chat with an arbitrary number, message prefilled. */
export function buildWhatsAppLink(number?: string | null, message?: string): string | null {
  const digits = normalizeWhatsAppNumber(number);
  if (!digits) return null;
  const url = new URL(`${WA_BASE}/${digits}`);
  if (message) url.searchParams.set("text", message);
  return url.toString();
}

/** Prefilled chat with our own business number. */
export function buildBusinessChatLink(message?: string): string | null {
  return buildWhatsAppLink(getBusinessWhatsAppNumber(), message);
}

export interface BookingChatContext {
  name?: string | null;
  startTime?: Date | string | null;
  meetingUrl?: string | null;
  reference?: string | null;
}

/** Prefilled chat addressed to the client (used from admin + our emails). */
export function buildClientChatLink(clientNumber?: string | null, context?: BookingChatContext): string | null {
  const parts: string[] = [];
  if (context?.name) parts.push(`Hi ${context.name},`);
  parts.push("I just booked a call with DEUX AI Factory.");
  if (context?.startTime) {
    const when = context.startTime instanceof Date ? context.startTime : new Date(context.startTime);
    if (!Number.isNaN(when.getTime())) {
      parts.push(`Scheduled for ${when.toISOString().replace("T", " ").slice(0, 16)} UTC.`);
    }
  }
  if (context?.meetingUrl) parts.push(`Meeting link: ${context.meetingUrl}`);
  return buildWhatsAppLink(clientNumber, parts.join(" "));
}

/** Message the client sends us via the "Confirm on WhatsApp" button. */
export function buildConfirmMessage(context?: BookingChatContext): string {
  const parts: string[] = ["Hello DEUX AI Factory, I would like to confirm my booking."];
  if (context?.startTime) {
    const when = context.startTime instanceof Date ? context.startTime : new Date(context.startTime);
    if (!Number.isNaN(when.getTime())) {
      parts.push(`Booked slot: ${when.toISOString().replace("T", " ").slice(0, 16)} UTC.`);
    }
  }
  if (context?.name) parts.push(`Name: ${context.name}`);
  if (context?.reference) parts.push(`Reference: ${context.reference}`);
  return parts.join("\n");
}

const waLinkSender: WhatsAppSender = {
  name: "wa-link",
  async send(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
    const link = buildWhatsAppLink(message.to, message.body);
    if (!link) return { ok: false, provider: "none", error: "INVALID_WHATSAPP_NUMBER" };
    return { ok: true, provider: "wa-link", id: link };
  },
};

let activeSender: WhatsAppSender = waLinkSender;

/** Swap in an official Cloud API sender later without changing any caller. */
export function setWhatsAppSender(sender: WhatsAppSender): void {
  activeSender = sender;
}

export function getWhatsAppSender(): WhatsAppSender {
  return activeSender;
}
