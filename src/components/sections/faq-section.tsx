import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { JsonLd } from "@/lib/jsonld";
import { ORIGIN } from "@/lib/json-ld";
import { faqs } from "@data/faqs";
import { FaqAccordion } from "./faq-accordion";

/** Server-rendered section; only the accordion itself is a client component. */
export function FaqSection() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${ORIGIN}/#faq`,
    url: `${ORIGIN}/#faq`,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="relative py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-surface overflow-hidden"
    >
      <JsonLd data={faqJsonLd} />

      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="self-start lg:sticky lg:top-28 lg:col-span-5">
          <span className="mb-4 block font-mono text-sm uppercase tracking-[0.28em] text-secondary">
            FAQ
          </span>
          <h2 id="faq-heading" className="font-heading h2-lg text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Straight answers about how our Digital FTEs work, what they cost and how we keep your team in control.
          </p>
          <Link
            href="/book-a-call"
            className={`${buttonVariants({ variant: "secondary", size: "lg" })} mt-8`}
          >
            Still have questions? Book a free call →
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            No pressure. We will tell you honestly if AI is a good fit.
          </p>
        </div>

        <div className="min-w-0 lg:col-span-7">
          <FaqAccordion faqs={faqs} />
        </div>
      </div>
    </section>
  );
}
