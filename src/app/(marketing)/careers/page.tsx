import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Bot,
  Workflow,
  Globe,
  GraduationCap,
  HeartHandshake,
  Zap,
} from "lucide-react";
import { company } from "@config/company";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Careers",
  description: "Join Deuvix AI Factory and build the AI workforce that runs the next generation of enterprises.",
  path: "/careers",
});

const roles = [
  {
    title: "Forward Deployed Engineer",
    type: "Full-time · Remote",
    description:
      "Bridge the gap between AI theory and production reality. Work hands-on with enterprise clients to spec, ship, and maintain agent systems that deliver measurable outcomes.",
    icon: Workflow,
  },
  {
    title: "AI Agent Developer",
    type: "Full-time · Remote",
    description:
      "Build chatbots, voice agents, and autonomous loops using the Deuvix AI Factory platform. You turn business workflows into reliable, always-on digital workers.",
    icon: Bot,
  },
  {
    title: "Loop Engineer",
    type: "Full-time · Remote",
    description:
      "Design heartbeats, skills, and connectors that keep agent systems running 24/7 with zero fatigue. Obsessed with reliability and observability.",
    icon: Globe,
  },
  {
    title: "Automation Specialist",
    type: "Contract · Flexible",
    description:
      "Map repetitive business processes and rebuild them as automated, AI-powered operations. Strong eye for ROI and process design.",
    icon: Zap,
  },
];

const perks = [
  {
    title: "Remote-first",
    description: "Work from anywhere. Async-first culture with overlapping hours for collaboration.",
    icon: Globe,
  },
  {
    title: "Learn by shipping",
    description: "Weekly deep dives into loop engineering, FDE practices, and agent orchestration.",
    icon: GraduationCap,
  },
  {
    title: "Own your impact",
    description: "Small team, big ownership. Your work directly powers real enterprise deployments.",
    icon: HeartHandshake,
  },
];

export default function CareersPage() {
  return (
    <div>
      <section className="pt-8 sm:pt-12 pb-16 bg-hero-pattern relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative mx-auto max-w-7xl px-6 sm:px-6 lg:px-8 text-center">
          <Breadcrumb
            items={[{ label: "Home", href: "/" }, { label: "Careers" }]}
            className="mb-4 sm:mb-6"
          />
        <Badge className="mb-4 bg-secondary/10 text-secondary border-secondary/30">Careers</Badge>
        <h1 className="font-heading h1 mb-4">
          Build the <span className="text-gradient">AI workforce</span>
        </h1>
        <p className="max-w-2xl text-muted-foreground text-base">
          Deuvix AI Factory manufactures, deploys, and monetizes Digital FTEs. Join us
          to build the systems that run the next generation of enterprises.
        </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-heading h2-lg text-center mb-10">
            Open Roles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roles.map((role) => (
              <div
                key={role.title}
                className="group p-6 rounded-2xl bg-card border border-border hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary">
                    <role.icon className="size-6" />
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    {role.type}
                  </span>
                </div>
                <h3 className="font-heading h3-sm mb-2 group-hover:text-primary transition-colors">
                  {role.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{role.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/contact?topic=careers&role=${encodeURIComponent(role.title)}`}
                    className="btn-sharp inline-flex items-center gap-1.5 rounded-none bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Apply
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                  <a
                    href={`mailto:${company.businessEmail}?subject=${encodeURIComponent(`Application: ${role.title}`)}`}
                    className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    or email us
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14">
            <h2 className="font-heading h2-lg text-center mb-10">
              Why Deuvix AI Factory
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {perks.map((perk) => (
                <div key={perk.title} className="text-center p-6 rounded-2xl bg-card border border-border">
                  <span className="inline-flex items-center justify-center size-11 rounded-xl bg-primary/10 text-primary mb-4">
                    <perk.icon className="size-5" />
                  </span>
                  <h3 className="font-heading h3-sm mb-2">{perk.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{perk.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 p-8 rounded-2xl bg-primary text-primary-foreground text-center">
            <h2 className="font-heading h2-sm mb-2">Don&apos;t see your role?</h2>
            <p className="text-sm opacity-90 mb-6 max-w-xl mx-auto">
              We are always looking for exceptional people. Tell us what you build and how you want
              to help shape the AI workforce.
            </p>
            <Link href="/contact">
              <span className="btn-sharp inline-flex items-center gap-2 px-6 py-3 rounded-none bg-primary-foreground text-primary text-sm font-semibold hover:opacity-90 transition-opacity">
                Get in Touch
                <ArrowRight className="size-4" />
              </span>
            </Link>
            <p className="mt-5 text-sm opacity-80">
              Prefer email?{" "}
              <a
                href={`mailto:${company.businessEmail}`}
                className="underline underline-offset-2 hover:opacity-90"
              >
                {company.businessEmail}
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
