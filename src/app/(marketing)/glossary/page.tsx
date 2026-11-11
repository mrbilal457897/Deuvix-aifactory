import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Glossary",
  description:
    "The working vocabulary of Deuvix AI Factory: Digital FTE, AI Worker, AI-Native company, FDE, MCP, SKILL.md, spec-driven development, human gate, Loop Engineering.",
  path: "/glossary",
});

const terms: Array<{ term: string; definition: string }> = [
  {
    term: "Digital FTE",
    definition:
      "An AI system that does a real job — not just answers questions — under human oversight. HR uses FTE for one employee's worth of work; a Digital FTE is software that carries that same unit of work, around the clock.",
  },
  {
    term: "AI Worker",
    definition:
      "The same thing as a Digital FTE. The terms are interchangeable in our writing.",
  },
  {
    term: "AI-Native company",
    definition:
      "A company whose operating model assumes AI workers do most of the execution — with people setting direction and judging outcomes. Removing the AI stops the process, the way removing employees stops a traditional one.",
  },
  {
    term: "Forward Deployed Engineer",
    definition:
      "An engineer embedded with your team to ship AI systems inside your real process — reading your work, writing the spec, building the worker, deploying it, and leaving your team able to run it.",
  },
  {
    term: "MCP (Model Context Protocol)",
    definition:
      "The open standard for connecting AI agents to external tools and data — repositories, ticketing systems, databases, browsers — through typed connectors the agent can call.",
  },
  {
    term: "SKILL.md",
    definition:
      "A plain-text file that captures what an agent must know and how it must behave for a domain — the capability written down once so no run starts from zero. Skills port across coding agents.",
  },
  {
    term: "Spec-driven development",
    definition:
      "Writing down the work, the quality bar, the constraints and the failure cases before building — then holding both humans and AI to that document. Wrong output means fix the spec, not the symptoms.",
  },
  {
    term: "Human gate",
    definition:
      "A written decision point where the worker stops and a named human approves before any irreversible action — payments, data deletion, customer-facing messages, production changes.",
  },
  {
    term: "Loop Engineering",
    definition:
      "Designing systems that run the work on their own: heartbeat, worktree, skill, subagents, connector, spine — plus a human gate. The discipline of building loops, not just prompting once.",
  },
];

export default function GlossaryPage() {
  return (
    <div>
      <section className="pt-8 sm:pt-12 pb-16 bg-hero-pattern relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[{ label: "Home", href: "/" }, { label: "Glossary" }]}
            className="mb-4 sm:mb-6"
          />
          <h1 className="font-heading h2-lg text-foreground max-w-4xl">
            The words we use, <span className="text-gradient">without the hand-waving</span>.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            A short working glossary — what each term means in our practice, not in a vendor brochure.
          </p>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="sr-only">Term definitions</h2>
          <dl className="divide-y divide-border border border-border rounded-xl bg-card">
            {terms.map((t) => (
              <div key={t.term} className="p-6 sm:flex sm:gap-8">
                <dt className="sm:w-56 shrink-0 font-heading text-base font-semibold text-foreground">
                  {t.term}
                </dt>
                <dd className="mt-2 sm:mt-0 text-sm leading-relaxed text-muted-foreground">
                  {t.definition}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex justify-center">
            <Link href="/how-we-work" className="text-sm font-semibold text-secondary hover:underline">
              See how we use these in a real engagement →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
