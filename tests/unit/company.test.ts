import { expect, describe, it } from "vitest";
import { company, companyLocationLabel, companyWorkHoursRows } from "@config/company";
import { organizationJsonLd } from "@/lib/seo";

describe("config/company", () => {
  it("falls back to a working public business email", () => {
    expect(company.businessEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/);
  });

  it("builds a location label from city and country", () => {
    expect(companyLocationLabel()).toBe("Pakistan");
  });

  it("renders weekend rows with Sunday as Closed", () => {
    const rows = companyWorkHoursRows();
    expect(rows.some((r) => r.label.startsWith("Monday"))).toBe(true);
    const sunday = rows.find((r) => r.label === "Sunday");
    expect(sunday).toBeDefined();
    expect(sunday!.value).toBe("Closed");
  });
});

describe("organizationJsonLd", () => {
  it("always emits name and url", () => {
    const ld = organizationJsonLd()!;
    expect(ld["@type"]).toBe("Organization");
    expect(ld.name).toBe(company.legalName);
    expect(typeof ld.url).toBe("string");
  });

  it("includes the country address and business email contact point", () => {
    const ld = organizationJsonLd()!;
    const address = ld.address as Record<string, unknown>;
    expect(address.addressCountry).toBe("Pakistan");
    const contact = ld.contactPoint as Record<string, unknown>;
    expect(contact.email).toBe(company.businessEmail);
  });

  it("does not emit EMPTY placeholder fields such as logo", () => {
    const ld = organizationJsonLd()!;
    expect("logo" in ld).toBe(false);
    expect("registrationNumber" in ld).toBe(false);
    expect("taxID" in ld).toBe(false);
  });

  it("emits sameAs for every filled social profile", () => {
    const ld = organizationJsonLd()!;
    const sameAs = ld.sameAs as string[];
    expect(sameAs.length).toBeGreaterThan(0);
    expect(sameAs).toContain(company.socials.linkedin);
  });
});