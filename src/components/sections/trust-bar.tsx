import type { CSSProperties } from "react";
import { clients, techPartners, type TrustLogo } from "@data/trust";

const confirmedClients = clients.filter((c) => c.permissionConfirmed);
const builtWith = techPartners.filter((p) => p.relationship === "built with");
const officialPartners = techPartners.filter((p) => p.relationship === "official partner");

function LogoMark({ logo, name }: { logo: string; name: string }) {
  return (
    <span
      role="img"
      aria-label={`${name} logo`}
      className="trust-logo h-8 w-8 shrink-0 text-slate-400 transition-colors duration-300 group-hover:text-primary dark:text-slate-500"
      style={{ "--trust-logo": `url(/logos/${logo})` } as CSSProperties}
    />
  );
}

function LogoCell({ item, decorative = false }: { item: TrustLogo; decorative?: boolean }) {
  const mark = <LogoMark logo={item.logo} name={item.name} />;
  if (decorative || !item.url) {
    return <span className="group flex items-center justify-center">{mark}</span>;
  }
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-center"
      aria-label={item.name}
    >
      {mark}
    </a>
  );
}

function LogoRow({ items }: { items: TrustLogo[] }) {
  const marquee = items.length >= 4;

  if (!marquee) {
    return (
      <ul className="flex flex-wrap items-center justify-center gap-16">
        {items.map((item) => (
          <li key={item.name}>
            <LogoCell item={item} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="trust-marquee relative overflow-hidden">
      <div className="trust-marquee-track flex w-max">
        <ul className="flex items-center gap-16 pr-16">
          {items.map((item) => (
            <li key={item.name}>
              <LogoCell item={item} />
            </li>
          ))}
        </ul>
        <div className="trust-marquee-copy flex items-center gap-16 pr-16" aria-hidden="true">
          {items.map((item) => (
            <LogoCell key={`copy-${item.name}`} item={item} decorative />
          ))}
        </div>
      </div>
    </div>
  );
}

function Group({ label, items }: { label: string; items: TrustLogo[] }) {
  return (
    <div className="space-y-6">
      <p className="text-center font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </p>
      <LogoRow items={items} />
    </div>
  );
}

export function TrustBar({
  className = "",
  showBuiltWith = true,
}: {
  className?: string;
  /** Set false to hide the "Technologies we build with" group. */
  showBuiltWith?: boolean;
}) {
  const showBuiltWithGroup = showBuiltWith && builtWith.length > 0;

  if (!confirmedClients.length && !showBuiltWithGroup && !officialPartners.length) {
    return null;
  }

  return (
    <section
      aria-label="Trusted by and built with"
      className={`border-y border-border/60 py-12 ${className}`}
    >
      <div className="mx-auto max-w-7xl space-y-10 px-6">
        {confirmedClients.length > 0 && (
          <Group label="Trusted by" items={confirmedClients} />
        )}
        {officialPartners.length > 0 && (
          <Group label="Partners" items={officialPartners} />
        )}
        {showBuiltWithGroup && (
          <Group label="Technologies we build with" items={builtWith} />
        )}
      </div>
    </section>
  );
}
