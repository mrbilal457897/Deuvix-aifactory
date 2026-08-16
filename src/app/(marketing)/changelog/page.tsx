import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Rocket, Sparkles, Wrench, ShieldCheck, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Product updates, improvements, and fixes from the Deux team.",
  alternates: { canonical: "/changelog" },
};

const releases = [
  {
    version: "v2.4.0",
    date: "August 2026",
    title: "Agent Loop Builder",
    description:
      "Design, test, and deploy autonomous agent loops without writing a line of code. Combine heartbeats, skills, and connectors into production-ready systems.",
    changes: [
      "Visual loop builder with live execution preview",
      "New connector library — 40+ integrations out of the box",
      "Human-gate approval steps for sensitive actions",
      "Loop health dashboard with alerting and rollbacks",
    ],
    tag: "New",
    icon: Rocket,
  },
  {
    version: "v2.3.1",
    date: "July 2026",
    title: "Performance & Reliability",
    description:
      "A maintenance release focused on speed, uptime, and a smoother experience across the platform.",
    changes: [
      "35% faster first paint on marketing pages",
      "Mobile viewport fixes for hero and features sections",
      "Reduced chat widget layout shift on small screens",
      "Improved image loading with eager optimization",
    ],
    tag: "Improvement",
    icon: Sparkles,
  },
  {
    version: "v2.3.0",
    date: "June 2026",
    title: "Digital FTE Console",
    description:
      "A dedicated workspace to manufacture, monitor, and monetize your Digital FTE workforce.",
    changes: [
      "FTE roster with per-agent performance metrics",
      "Shift scheduling and 24/7 uptime monitoring",
      "Cost-per-task analytics vs. human benchmarks",
      "One-click deployment to any of your connected tools",
    ],
    tag: "New",
    icon: Wrench,
  },
  {
    version: "v2.2.0",
    date: "May 2026",
    title: "Security & Admin",
    description:
      "Role-based access control and a hardened admin experience for enterprise teams.",
    changes: [
      "Role-based access control for dashboard users",
      "Single sign-on support for Google and GitHub",
      "Granular audit logs for all agent actions",
      "Encrypted credential vault for connected apps",
    ],
    tag: "Security",
    icon: ShieldCheck,
  },
];

export default function ChangelogPage() {
  return (
    <div className="pt-24">
      <section className="py-16 text-center px-6 bg-hero-pattern relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">Changelog</Badge>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">
          What&apos;s <span className="text-gradient">new</span>
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground text-lg">
          Every improvement to the Deux platform, documented. We ship continuously so your
          AI workforce keeps getting better.
        </p>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-3xl space-y-10">
          {releases.map((release) => (
            <article
              key={release.version}
              className="p-6 sm:p-8 rounded-2xl bg-card border border-border hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center size-11 rounded-xl bg-primary/10 text-primary">
                    <release.icon className="size-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-heading text-lg font-bold">{release.version}</h2>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {release.tag}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{release.date}</p>
                  </div>
                </div>
              </div>
              <h3 className="font-heading text-xl font-bold mb-2">{release.title}</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">{release.description}</p>
              <ul className="space-y-2">
                {release.changes.map((change) => (
                  <li key={change} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    {change}
                  </li>
                ))}
              </ul>
            </article>
          ))}

          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Have a feature you would love to see next?
            </p>
            <Link href="/contact">
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                Request a Feature
                <ArrowRight className="size-4" />
              </span>
            </Link>
            <p className="mt-5 text-sm text-muted-foreground">
              Or email{" "}
              <a
                href="mailto:deuxaiinfo786@gmail.com"
                className="font-medium text-primary hover:underline"
              >
                deuxaiinfo786@gmail.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
