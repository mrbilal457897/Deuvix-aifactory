import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Workflow,
  Layers,
  Terminal,
  Cpu,
} from "lucide-react";
import { company } from "@config/company";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Guides to building, deploying, and managing Digital FTEs and AI agents with Deuvix AI Factory.",
  alternates: { canonical: "/docs" },
};

const sections = [
  {
    title: "Getting Started",
    description:
      "New to Deuvix AI Factory? Start here. Learn what Digital FTEs are, how the platform works, and how to deploy your first agent in minutes.",
    links: [
      { label: "What is a Digital FTE?", href: "/blog/human-vs-digital-fte" },
      { label: "Building Digital FTEs", href: "/blog/building-digital-fte" },
      { label: "Book a free consultation", href: "/contact" },
    ],
    icon: BookOpen,
  },
  {
    title: "AI Agents",
    description:
      "Chatbots, voice agents, and custom agents. Learn how to design conversations, connect tools, and keep agents on-brand and on-task.",
    links: [
      { label: "Four ways to profit from AI agents", href: "/blog/monetize-ai-agents" },
      { label: "Services overview", href: "/products" },
      { label: "Talk to a deployment engineer", href: "/contact" },
    ],
    icon: Bot,
  },
  {
    title: "Loop Engineering",
    description:
      "The core of reliable automation. Understand heartbeats, skills, subagents, connectors, and the human gate that keeps everything accountable.",
    links: [
      { label: "Loop Engineering guide", href: "/blog/loop-engineering" },
      { label: "Loop engineering services", href: "/products#loop-engineering" },
      { label: "Spec-driven development", href: "/blog/spec-driven-development" },
    ],
    icon: Workflow,
  },
  {
    title: "Deployment & Integration",
    description:
      "Connect Deuvix AI Factory agents to your CRM, databases, and business tools. Learn deployment patterns that scale from pilot to full workforce.",
    links: [
      { label: "Forward deployed engineering", href: "/blog/fde-practices" },
      { label: "Case studies", href: "/projects" },
      { label: "Request an integration", href: "/contact" },
    ],
    icon: Layers,
  },
  {
    title: "Platform & Admin",
    description:
      "Using the Deuvix AI Factory dashboard. Manage users, monitor agent performance, and keep your AI operations running 24/7.",
    links: [
      { label: "Sign in to the dashboard", href: "/login" },
      { label: "Privacy & data handling", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
    ],
    icon: Cpu,
  },
  {
    title: "API Reference",
    description:
      "Integrate with Deuvix AI Factory programmatically. Endpoints, authentication, and webhooks for teams that build on top of the platform.",
    links: [
      { label: "Discuss API access", href: "/contact" },
      { label: "Changelog", href: "/changelog" },
      { label: "Status updates", href: "/blog" },
    ],
    icon: Terminal,
  },
];

export default function DocsPage() {
  return (
    <div>
      <section className="pt-8 sm:pt-12 pb-16 bg-hero-pattern relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative mx-auto max-w-7xl px-6 sm:px-6 lg:px-8 text-center">
          <Breadcrumb
            items={[{ label: "Home", href: "/" }, { label: "Docs" }]}
            className="mb-4 sm:mb-6"
          />
        <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">Documentation</Badge>
        <h1 className="font-heading text-[68px] font-bold mb-4">
          Deuvix AI Factory <span className="text-gradient">Docs</span>
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground text-base">
          Everything you need to manufacture, deploy, and monetize Digital FTEs — from first
          principles to production.
        </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((section) => (
              <div
                key={section.title}
                className="p-6 rounded-2xl bg-card border border-border hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <span className="inline-flex items-center justify-center size-11 rounded-xl bg-primary/10 text-primary mb-4">
                  <section.icon className="size-5" />
                </span>
                <h2 className="font-heading text-[48px] font-bold mb-2">{section.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {section.description}
                </p>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        {link.label}
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 p-8 rounded-2xl bg-card border border-border text-center">
            <h2 className="font-heading text-[48px] font-bold mb-2">Still stuck?</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
              Our team ships production agent systems every week. Ask us anything about your
              use case.
            </p>
            <Link href="/contact">
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                Get Support
                <ArrowRight className="size-4" />
              </span>
            </Link>
            <p className="mt-5 text-sm text-muted-foreground">
              Prefer email? Reach us at{" "}
              <a
                href={`mailto:${company.businessEmail}`}
                className="font-medium text-primary hover:underline"
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
