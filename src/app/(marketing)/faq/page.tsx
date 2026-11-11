import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "FAQ",
  description:
    "Straight answers about Deuvix AI Factory: what we do, how pricing works, delivery model, human oversight, security, timelines and switching costs.",
  path: "/faq",
});

// TODO: replace the TODO-marked answers with company-approved answers where
// they need input — pricing specifics, exact delivery commitments, and
// production SLAs.
const faqs: Array<{ q: string; a: string }> = [
  {
    q: "What does a Digital FTE actually do?",
    a: "Owns a defined job end to end — lead qualification, ticket triage, report drafting, appointment booking — using your tools, on your schedule, under human gates for anything irreversible.",
  },
  {
    q: "How is this different from hiring or from a chatbot?",
    a: "A chatbot answers questions; a Digital FTE completes work with artifacts you can audit. Compared to hiring, you get capacity without headcount — but only for jobs that are repetitive, rules-based and measurable.",
  },
  {
    q: "What industries do you work with?",
    a: "Any workflow that is repetitive and structured: support, sales ops, finance ops, reporting, internal tooling. [TODO: name the industries where you have live deployments.]",
  },
  {
    q: "How do you price it?",
    a: "Pricing is scoped per workflow — a build fee plus a monthly run fee. [TODO: confirm whether you publish a floor or fixed tiers, and whether a 14-day pilot is standard.]",
  },
  {
    q: "How long does it take to get the first worker live?",
    a: "A scoped first worker typically moves from brief to supervised pilot in weeks, not months. [TODO: confirm your target number — e.g., 2–4 weeks — once you have run enough of them to say it credibly.]",
  },
  {
    q: "Where does the worker actually run — our cloud or yours?",
    a: "Your choice. We can deploy inside your cloud account or VPC for sensitive data, or operate it for you under a managed subscription. [TODO: state your default and which you prefer.]",
  },
  {
    q: "How do you keep our data out of the model providers?",
    a: "We route through provider APIs under enterprise terms with zero training on your data where the provider supports it, and we gate access to secrets and personal data. [TODO: add your exact provider list and DPA posture.]",
  },
  {
    q: "What if the worker gets something wrong?",
    a: "Every worker ships with an audit trail and a human gate on irreversible actions. If an output is wrong, the gate catches it or we fix the spec and re-run — the cost of a mistake is a rejected suggestion, not a broken customer.",
  },
  {
    q: "Can we start small — one workflow, one team?",
    a: "That is the only way we start. One workflow, one owner, one written success metric, one human reviewer. Prove it, then expand.",
  },
  {
    q: "Who owns the worker afterwards — us or you?",
    a: "Ownership is part of the design: your instance, your credentials, your data, our operating playbook. Where you license the system, terms are spelled out in writing before the build starts.",
  },
  {
    q: "Do you work on-site, remote or hybrid?",
    a: "On-site, remote or hybrid — we match the client's constraints. [TODO: state your default and any travel policy you want clients to hear.]",
  },
  {
    q: "What happens if we want to stop?",
    a: "No lock-in by design: the worker runs on your credentials or can be exported, the specs and skills are documented, and your team keeps the operating knowledge. We do not bill you to leave.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a.replace(/\[TODO[^\]]*\]/g, "") },
  })),
};

export default function FaqPage() {
  return (
    <div>
      <section className="pt-8 sm:pt-12 pb-16 bg-hero-pattern relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
            className="mb-4 sm:mb-6"
          />
          <h1 className="font-heading h2-lg text-foreground max-w-4xl">
            Straight answers, <span className="text-gradient">no brochure</span>.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            Everything decision-makers usually ask before the first call — services, pricing approach,
            delivery model, security and ownership.
          </p>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl divide-y divide-border border border-border rounded-xl bg-card">
          {faqs.map((f) => (
            <details key={f.q} className="group p-6">
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-left font-heading text-lg font-semibold text-foreground list-none">
                {f.q}
                <span className="text-secondary text-xl leading-none transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>

        <div className="mx-auto max-w-3xl mt-8 flex justify-center">
          <Link href="/how-we-work" className="text-sm font-semibold text-secondary hover:underline">
            See how we work, step by step →
          </Link>
        </div>
      </section>

      {/* Contact strip */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-surface">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-heading h2-sm text-foreground">Still deciding?</h2>
          <p className="mt-3 text-base text-muted-foreground">
            Bring one workflow to a 30-minute call. Worst case, you leave with a clear read on what a
            Digital FTE would — and would not — do for you.
          </p>
          <Link
            href="/book-a-call"
            className="mt-8 inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Book a 30-minute call
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </div>
  );
}
