import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import type { ReactNode } from "react";

export function LegalPage({
  badge,
  title,
  description,
  lastUpdated,
  children,
}: {
  badge: string;
  title: string;
  description: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="relative pt-8 sm:pt-12 pb-20 sm:pb-28">
      <div className="mx-auto max-w-7xl px-6 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Legal" }, { label: title }]}
          className="mb-4 sm:mb-6"
        />
        {/* Hero */}
        <section className="relative text-center mb-14">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 backdrop-blur-sm">
          {badge}
        </Badge>
        <h1 className="font-heading text-[68px] font-bold text-foreground mb-4">
          {title}
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground text-base">
          {description}
        </p>
        <p className="mt-4 text-xs text-muted-foreground/70">Last updated: {lastUpdated}</p>
      </section>

        {/* Content */}
        <section className="mx-auto max-w-3xl space-y-10">{children}</section>
      </div>
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-heading text-[48px] font-bold text-foreground mb-3">
        {heading}
      </h2>
      <div className="h-px w-12 bg-primary mb-5" />
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function LegalParagraph({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground leading-relaxed">{children}</p>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-muted-foreground leading-relaxed">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
