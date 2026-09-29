import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Careers",
  description: "Join DEUX AI Factory and build the AI workforce that runs the next generation of enterprises.",
  alternates: { canonical: "/careers" },
};

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
      "Build chatbots, voice agents, and autonomous loops using the DEUX AI Factory platform. You turn business workflows into reliable, always-on digital workers.",
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
    <div className="pt-24">
      <section className="py-16 text-center px-6 bg-hero-pattern relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">Careers</Badge>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">
          Build the <span className="text-gradient">AI workforce</span>
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground text-lg">
          DEUX AI Factory manufactures, deploys, and monetizes Digital FTEs. Join us
          to build the systems that run the next generation of enterprises.
        </p>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-center mb-10">
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
                <h3 className="font-heading text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                  {role.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{role.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-14">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-center mb-10">
              Why DEUX AI Factory
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {perks.map((perk) => (
                <div key={perk.title} className="text-center p-6 rounded-2xl bg-card border border-border">
                  <span className="inline-flex items-center justify-center size-11 rounded-xl bg-primary/10 text-primary mb-4">
                    <perk.icon className="size-5" />
                  </span>
                  <h3 className="font-heading font-bold mb-2">{perk.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{perk.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 p-8 rounded-2xl bg-primary text-primary-foreground text-center">
            <h2 className="font-heading text-2xl font-bold mb-2">Don&apos;t see your role?</h2>
            <p className="text-sm opacity-90 mb-6 max-w-xl mx-auto">
              We are always looking for exceptional people. Tell us what you build and how you want
              to help shape the AI workforce.
            </p>
            <Link href="/contact">
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-foreground text-primary text-sm font-semibold hover:opacity-90 transition-opacity">
                Get in Touch
                <ArrowRight className="size-4" />
              </span>
            </Link>
            <p className="mt-5 text-sm opacity-80">
              Prefer email?{" "}
              <a
                href="mailto:deuxaiinfo786@gmail.com"
                className="underline underline-offset-2 hover:opacity-90"
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
