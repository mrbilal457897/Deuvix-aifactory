import { company } from "@config/company";

/**
 * Renders the company's public legal identity — exactly the fields that are
 * filled in config/company.ts, nothing else. Used by the legal pages as the
 * data-controller identity block. Server-safe.
 */
export function CompanyIdentityBlock() {
  const rows: { label: string; value: string; href?: string }[] = [];
  if (company.legalName?.trim()) rows.push({ label: "Company name", value: company.legalName.trim() });
  if (company.registrationNumber?.trim()) {
    rows.push({ label: "Registration number", value: company.registrationNumber.trim() });
  }
  if (company.registeredAddress?.trim()) {
    rows.push({ label: "Registered office", value: company.registeredAddress.trim() });
  }
  if (company.city?.trim() && company.country?.trim()) {
    rows.push({ label: "Country", value: `${company.city.trim()}, ${company.country.trim()}` });
  } else if (company.country?.trim()) {
    rows.push({ label: "Country", value: company.country.trim() });
  }
  if (company.taxId?.trim()) rows.push({ label: "Tax ID", value: company.taxId.trim() });
  if (company.phone?.trim()) rows.push({ label: "Phone", value: company.phone.trim() });
  rows.push({ label: "Email", value: company.businessEmail, href: `mailto:${company.businessEmail}` });

  return (
    <div className="rounded-xl border border-border bg-card/60 p-5 space-y-2.5">
      <p className="font-heading text-sm font-semibold text-foreground mb-2">Who we are</p>
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col sm:flex-row sm:gap-3 text-sm">
          <span className="w-40 shrink-0 text-muted-foreground">{row.label}</span>
          {row.href ? (
            <a href={row.href} className="text-primary hover:underline break-words">{row.value}</a>
          ) : (
            <span className="text-foreground break-words">{row.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Anchor to the public business email, so every legal page uses the same
 * single source for the address (config/company.ts).
 */
export function CompanyEmailLink() {
  return (
    <a href={`mailto:${company.businessEmail}`} className="text-primary hover:underline">
      {company.businessEmail}
    </a>
  );
}