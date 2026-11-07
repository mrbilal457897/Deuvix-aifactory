import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Hash,
  Mail,
  MapPin,
  Phone,
  Receipt,
} from "lucide-react";
import { CharReveal } from "@/components/split-text";
import {
  company,
  companyLocationLabel,
  companyWorkHoursRows,
} from "@config/company";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = {
  title: "Company Information",
  description:
    "The legal and public identity of Deuvix AI Factory — company name, registration, location, discussion details, and working hours.",
  alternates: { canonical: "/company-information" },
};

type InfoCard = {
  icon: typeof Building2;
  label: string;
  value: string;
  href?: string;
};

export default function CompanyInformationPage() {
  const location = companyLocationLabel();
  const cards: InfoCard[] = [];

  if (company.foundedYear) {
    cards.push({ icon: Calendar, label: "Founded", value: String(company.foundedYear) });
  }
  if (company.legalName?.trim()) {
    cards.push({ icon: Building2, label: "Legal name", value: company.legalName.trim() });
  }
  if (company.tradingName?.trim() && company.tradingName !== company.legalName) {
    cards.push({ icon: Building2, label: "Trading name", value: company.tradingName.trim() });
  }
  if (company.registrationNumber?.trim()) {
    cards.push({ icon: Hash, label: "Registration number", value: company.registrationNumber.trim() });
  }
  if (company.taxId?.trim()) {
    cards.push({ icon: Receipt, label: "Tax ID", value: company.taxId.trim() });
  }
  if (location) {
    cards.push({ icon: MapPin, label: "Based in", value: location });
  }
  if (company.registeredAddress?.trim()) {
    cards.push({ icon: MapPin, label: "Registered office", value: company.registeredAddress.trim() });
  }
  cards.push({
    icon: Mail,
    label: "Email",
    value: company.businessEmail,
    href: `mailto:${company.businessEmail}`,
  });
  if (company.phone?.trim()) {
    cards.push({ icon: Phone, label: "Phone", value: company.phone.trim(), href: `tel:${company.phone.trim()}` });
  }

  const hourRows = companyWorkHoursRows();

  return (
    <div>
      {/* Hero */}
      <section className="pt-8 sm:pt-12 pb-16 bg-hero-pattern relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative mx-auto max-w-7xl px-6 sm:px-6 lg:px-8 text-center">
          <Breadcrumb
            items={[{ label: "Home", href: "/" }, { label: "Company Information" }]}
            className="mb-4 sm:mb-6"
          />
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Company</Badge>
        <h1 className="font-heading text-[68px] font-bold mb-4">
          <CharReveal>
            Company <span className="text-gradient">Information</span>
          </CharReveal>
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground text-base">
          The legal and public identity of {company.tradingName}.
        </p>
        </div>
      </section>

      {/* Identity */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <div key={card.label} className="p-6 rounded-xl card-solid">
                <div className="inline-flex items-center justify-center size-10 rounded-lg bg-primary/5 border border-primary/10 mb-4">
                  <card.icon className="size-5 text-primary" />
                </div>
                <h3 className="font-heading text-[24px] font-semibold text-muted-foreground mb-1">{card.label}</h3>
                {card.href ? (
                  <a href={card.href} className="text-sm font-medium text-primary hover:underline break-words">
                    {card.value}
                  </a>
                ) : (
                  <p className="text-sm font-medium break-words">{card.value}</p>
                )}
              </div>
            ))}
          </div>

          {hourRows.length > 0 && (
            <div className="mt-6 p-6 rounded-xl card-solid">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="size-5 text-primary" />
                <h3 className="font-heading text-[24px] font-semibold text-foreground">Working hours</h3>
              </div>
              <ul className="space-y-2 text-sm max-w-sm">
                {hourRows.map((row) => (
                  <li key={row.label} className="flex justify-between text-muted-foreground">
                    <span>{row.label}</span>
                    <span
                      className={
                        row.value === "Closed"
                          ? "text-muted-foreground/70"
                          : "text-foreground font-medium"
                      }
                    >
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-muted-foreground/70 mt-3">
                Timezone: {company.workingHours.timezone} ({company.workingHours.timezoneAbbr})
              </p>
            </div>
          )}

          <div className="mt-12 flex justify-center">
            <Link
              href="/about"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="size-4" />
              Back to About
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}