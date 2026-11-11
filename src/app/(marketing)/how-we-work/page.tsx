import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "How We Work",
  description:
    "From a one-paragraph brief to a worker live in production — the 10-80-10 pattern, human gates, and the exact path from specification to deployment.",
  path: "/how-we-work",
});

const phases = [
  {
    step: "01",
    title: "Read the work",
    body:
      "We sit with the people who do the job — reading real tickets, emails and documents. No kickoff call replaces watching the actual workload.",
  },
  {
    step: "02",
    title: "Write the spec",
    body:
      "The spec is the contract: inputs, outputs, quality bar, failure cases, where a human signs off and on what. You read it before a line of code is written — and you approve it.",
  },
  {
    step: "03",
    title: "Build the worker",
    body:
      "AI coding agents build to the spec, with you in the loop for every risky call. We verify as we go: maker builds, checker reviews, nothing ships unreviewed.",
  },
  {
    step: "04",
    title: "Verify, then deploy",
    body:
      "Evals, gates, rollback plan — the same checklist a senior engineer would apply to any production system. Only then does the worker meet your real tools.",
  },
  {
    step: "05",
    title: "Operate and hand over",
    body:
      "Monitoring, alerts, weekly review for the first month. We leave documentation and runbooks — the goal is your team operating it, not us in it.",
  },
];

export default function HowWeWorkPage() {
  return (
    <div>
      <section className="pt-8 sm:pt-12 pb-16 bg-hero-pattern relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[{ label: "Home", href: "/" }, { label: "How we work" }]}
            className="mb-4 sm:mb-6"
          />
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-secondary mb-4">
            How we work
          </p>
          <h1 className="font-heading h2-lg text-foreground max-w-4xl">
            Spec in, shipped out — <span className="text-gradient">with a human on every gate</span>.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Every engagement follows the same shape: people decide what good looks like, the machine
            carries the middle, and people judge the result. Here is exactly what that looks like,
            from the first conversation to the worker running in production.
          </p>
        </div>
      </section>

      {/* 10-80-10 */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-surface" aria-labelledby="ten-eighty-ten">
        <div className="mx-auto max-w-7xl">
          <h2 id="ten-eighty-ten" className="font-heading h2-sm text-foreground">
            The 10-80-10 pattern
          </h2>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-px bg-border border border-border text-center">
            {[
              { n: "10", label: "Human — set direction", detail: "The spec, the quality bar, the gates. Your judgment is the product." },
              { n: "80", label: "AI — carry the middle", detail: "Draft, build, triage, monitor, report. The part that eats your calendar." },
              { n: "10", label: "Human — judge the outcome", detail: "Eval, approve, sign off. Nothing irreversible leaves without your call." },
            ].map((s) => (
              <div key={s.label} className="bg-card p-8">
                <p className="font-heading text-6xl font-light text-foreground">{s.n}%</p>
                <p className="mt-2 text-xs uppercase tracking-widest font-semibold text-secondary">
                  {s.label}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 inline-flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-secondary" aria-hidden="true" />
            Digital FTE and AI Worker mean the same thing: an AI that does a real job under human oversight.
          </p>
        </div>
      </section>

      {/* The human gate */}
      <section className="py-16 px-4 sm:px-6 lg:px-8" aria-labelledby="human-gates">
        <div className="mx-auto max-w-4xl">
          <h2 id="human-gates" className="font-heading h2-sm text-foreground">
            What a human gate actually is
          </h2>
          <p className="mt-4 text-base leading-relaxed text-foreground/90">
            A gate is a written decision point: the worker stops, packages the proposed action with the
            evidence behind it, and asks a named human to approve. Money movement, data deletion,
            customer-facing messages and changes to production configuration all sit behind gates.
            Everything else flows through.
          </p>
          <p className="mt-4 text-base leading-relaxed text-foreground/90">
            No gate means no trust. No spine means no memory. Every worker we deploy has both —
            that is the difference between a demo and a system.
          </p>
        </div>
      </section>

      {/* Process timeline */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-surface" aria-labelledby="process">
        <div className="mx-auto max-w-4xl">
          <h2 id="process" className="font-heading h2-sm text-foreground">
            From brief to production, step by step
          </h2>
          <ol className="mt-10 border-l border-border pl-6 sm:pl-10 space-y-8">
            {phases.map((p) => (
              <li key={p.step} className="relative">
                <span
                  className="absolute -left-[calc(1.5rem+1px)] sm:-left-[calc(2.5rem+1px)] top-1 flex size-5 items-center justify-center rounded-full border border-secondary bg-card"
                  aria-hidden="true"
                >
                  <span className="size-2 rounded-full bg-secondary" />
                </span>
                <p className="font-mono text-[12px] uppercase tracking-widest text-secondary">
                  {p.step}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">{p.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-heading h2-sm text-foreground">Want to see this applied to your workflow?</h2>
          <p className="mt-3 text-base text-muted-foreground">
            Bring the messiest repetitive job on your plate. We will tell you honestly whether a
            Digital FTE fits — and if it does, exactly what the first one would look like.
          </p>
          <Link
            href="/book-a-call"
            className="mt-8 inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Book a call
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
