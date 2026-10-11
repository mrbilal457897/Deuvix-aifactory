/**
 * Editable booking settings.
 *
 * This is the one place to change how the /book-a-call page presents the team:
 * our working hours, the zone they are stated in, and the fallback contact
 * points. Nothing here is secret, so it is safe to import from client code.
 */

import { DEFAULT_TIME_ZONE, zoneShort } from "@/lib/booking/time";
import { company } from "@config/company";
import type { LanguageCode } from "@/lib/booking/schema";

/**
 * Our business hours. Single source is config/company.ts (workingHours);
 * this module re-exports them in the shape the booking page expects.
 * TODO(owner): confirm these are your real hours before launch.
 */
export const OUR_TIME_ZONE = company.workingHours.timezone || DEFAULT_TIME_ZONE;

/** "9:00 AM – 6:00 PM PKT" — appended to "Our hours:" everywhere it is shown. */
export function ourHoursLabel(): string {
  const hours = company.workingHours.mondayToFriday;
  if (hours) return `${hours} ${company.workingHours.timezoneAbbr}`;
  return `${zoneShort(OUR_TIME_ZONE)}`;
}

/** Public fallback inbox for "can't find a suitable time?". */
export const BOOKING_CONTACT_EMAIL = company.businessEmail;

/** Preferred-language choices offered on the booking form. */
export const LANGUAGES: ReadonlyArray<{ code: LanguageCode; label: string }> = [
  { code: "en", label: "English" },
  { code: "ur", label: "Urdu (اردو)" },
  { code: "ar", label: "Arabic (العربية)" },
  { code: "hi", label: "Hindi (हिन्दी)" },
  { code: "es", label: "Spanish (Español)" },
  { code: "fr", label: "French (Français)" },
  { code: "de", label: "German (Deutsch)" },
  { code: "pt", label: "Portuguese (Português)" },
  { code: "zh", label: "Chinese (中文)" },
  { code: "tr", label: "Turkish (Türkçe)" },
  { code: "nl", label: "Dutch (Nederlands)" },
  { code: "ru", label: "Russian (Русский)" },
];
