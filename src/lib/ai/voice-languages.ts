/**
 * Shared, client-safe voice constants. Kept free of any server import so both
 * the admin panel and the transcribe route can use the same language list.
 */

export const VOICE_LANGUAGES = [
  { code: "auto", label: "Auto-detect" },
  { code: "en", label: "English" },
  { code: "ur", label: "Urdu" },
] as const;

export type VoiceLanguage = (typeof VOICE_LANGUAGES)[number]["code"];

/** Client-side recording cap (seconds); the server enforces its own size limit. */
export const VOICE_MAX_SECONDS = 120;

/** Maps any incoming tag (e.g. "en-US", "UR") onto a supported code. */
export function normalizeLanguage(input: string | null | undefined): VoiceLanguage {
  const value = (input || "").trim().toLowerCase();
  if (value === "en" || value.startsWith("en-")) return "en";
  if (value === "ur" || value.startsWith("ur-")) return "ur";
  return "auto";
}

/** Collapses whitespace the model may echo back into clean, single-spaced text. */
export function normalizeTranscript(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}
