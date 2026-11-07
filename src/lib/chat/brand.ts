/**
 * Branding values used by the chat UI. Everything lives here so the owner can
 * reword the bot without touching a component.
 */
import { DEFAULTS } from "@/lib/site-config";

export const chatBrand = {
  companyName: "Deuvix AI Factory",
  /** Short name used where space is tight (header, avatar alt). */
  shortName: "Deuvix",
  /** Initials shown if the logo file fails to load (§8.1 fallback). */
  initials: "D2",
  assistantName: "Deuvix Assistant",
  logoPath: DEFAULTS.logo,
  /** Truthful status line — the bot is a service, not a person. */
  statusLine: "Online · Replies instantly",
  /** Window document title suffix. */
  conversationTitle: "Chat with Deuvix AI Factory",
} as const;
