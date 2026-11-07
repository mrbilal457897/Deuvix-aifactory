/**
 * Single source of truth for the company's legal and public identity.
 *
 * Every public surface — the footer, About, Contact, the legal pages, and the
 * Organization JSON-LD — reads from this one file. An empty string means "we
 * have not been provided a value yet": the field is then neither rendered on
 * the site nor emitted into the JSON-LD.
 *
 * TODO(owner): replace each TODO below with the real, verified value. An empty
 * string is deliberately safer than an invented one — never fabricate legal
 * details. This is also the one place to change the business email address
 * (falls back to the current public inbox until you supply the final one).
 */

export const company = {
  /** TODO(owner): confirm the legal entity name exactly as registered. */
  legalName: "Deuvix AI Factory",
  /** Public brand name. */
  tradingName: "Deuvix AI Factory",
  /** TODO(owner): company / registration number from the registrar. */
  registrationNumber: "",
  /** TODO(owner): confirm. Matches the existing site copy. */
  country: "Pakistan",
  /** TODO(owner): registered-office city. */
  city: "",
  /** TODO(owner): full registered office address. */
  registeredAddress: "",
  /**
   * Public business email shown in mailto links and used as the JSON-LD
   * contact point. Override at build time with NEXT_PUBLIC_CONTACT_EMAIL.
   * TODO(owner): replace the default with the final business address.
   */
  businessEmail:
    (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() : undefined) ||
    "team.deuvix@gmail.com",
  /** TODO(owner): business phone number in international format. */
  phone: "",
  /** Optional tax identifier (VAT, NTN, ...). TODO(owner). */
  taxId: "",
  /** TODO(owner): confirm founding year (currently from the About timeline). */
  foundedYear: 2026,
  /** Working hours, stated in `timezone`. TODO(owner): confirm. */
  workingHours: {
    timezone: "Asia/Karachi",
    /** Short, human-friendly abbreviation shown next to the hours (PKT). */
    timezoneAbbr: "PKT",
    mondayToFriday: "9:00 AM \u2013 6:00 PM",
    saturday: "10:00 AM \u2013 2:00 PM",
    /** `null` renders as "Closed". */
    sunday: null as string | null,
  },
  /** Social profiles; only non-empty entries are shown and emitted as sameAs. */
  socials: {
    /** TODO(owner): confirm the canonical LinkedIn company page. */
    linkedin: "https://www.linkedin.com/company/145184855/",
    /** TODO(owner): real Instagram handle. Empty until supplied. */
    instagram: "",
  },
  /**
   * Logo used by the Organization JSON-LD. Leave empty to omit logo from the
   * schema until the canonical logo URL is supplied.
   * TODO(owner): set to the public logo URL when confirmed.
   */
  logo: "",
};

/** "City, Pakistan" when both known, otherwise whichever half is filled. */
export function companyLocationLabel(): string | null {
  const parts = [company.city, company.country].map((v) => v.trim()).filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/** Rows for the "Office hours" cards: label + local value. */
export function companyWorkHoursRows(): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (company.workingHours.mondayToFriday) {
    rows.push({ label: "Monday \u2013 Friday", value: company.workingHours.mondayToFriday });
  }
  if (company.workingHours.saturday) {
    rows.push({ label: "Saturday", value: company.workingHours.saturday });
  }
  if (company.workingHours.sunday) {
    rows.push({ label: "Sunday", value: company.workingHours.sunday });
  } else if (company.workingHours.sunday === null) {
    rows.push({ label: "Sunday", value: "Closed" });
  }
  return rows;
}

/** `true` when the supplied value is a real (non-placeholder) email. */
export function isBusinessEmail(value = company.businessEmail): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}