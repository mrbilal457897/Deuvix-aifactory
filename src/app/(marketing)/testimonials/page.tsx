import Link from "next/link";
import { Star } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { pageMetadata } from "@/lib/seo";
import { testimonials } from "@/content/testimonials";

export const metadata = pageMetadata({
  title: "Testimonials",
  description:
    "What teams say about working with Deuvix AI Factory — real, client-approved results from Digital FTE and FDE engagements.",
  path: "/testimonials",
});

const verified = testimonials.filter((t) => t.verified);
const featured = verified[0];
const rest = verified.slice(1);

const stats = [
  { value: "168hrs/wk", label: "Availability — every hour, every week" },
  { value: "Up to 85%", label: "Lower cost per completed task" },
  { value: "Human gates", label: "On every irreversible action" },
];

export default function TestimonialsPage() {
  return (
    <div>
      {/* Hero */}
      <section className="pt-8 sm:pt-12 pb-16 bg-hero-pattern relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[{ label: "Home", href: "/" }, { label: "Testimonials" }]}
            className="mb-4 sm:mb-6"
          />
          <h1 className="font-heading h2-lg text-foreground mb-4 max-w-3xl">
            Working with us is <span className="text-gradient">the receipts</span>.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground leading-relaxed">
            Every engagement ends the same way — with a number the client can defend, or with a page
            we delete. This page carries the former. (Real client quotes land here as soon as they
            are approved.)
          </p>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {!featured ? (
            <div className="mx-auto max-w-2xl text-center py-20 border border-dashed border-border rounded-2xl">
              <Star className="mx-auto size-8 text-secondary" aria-hidden="true" />
              <h2 className="mt-6 font-heading h2-sm text-foreground">
                Case studies coming soon
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground max-w-md mx-auto">
                We publish client quotes only after the client approves them in writing, with the
                numbers attached. Until then this space stays empty — not decorated with quotes we
                cannot stand behind.
              </p>
              <p className="mt-6 text-xs text-muted-foreground/80">
                TODO: add verified testimonials to <code>src/content/testimonials.ts</code>
              </p>
              <Link
                href="/book-a-call"
                className="mt-8 inline-flex items-center gap-2 border border-secondary px-5 py-3 text-sm font-semibold text-secondary hover:bg-secondary/10 transition-colors"
              >
                Book a call instead
              </Link>
            </div>
          ) : (
            <>
              {/* Featured quote */}
              <figure className="mx-auto max-w-4xl border-l-2 border-secondary pl-6 sm:pl-10 py-4 mb-16">
                <blockquote className="font-heading text-2xl sm:text-3xl leading-snug text-foreground">
                  &ldquo;{featured.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6">
                  <p className="text-base font-semibold text-foreground">{featured.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {featured.role}, {featured.company}
                  </p>
                  <p className="mt-2 inline-block rounded border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
                    {featured.result}
                  </p>
                </figcaption>
              </figure>

              {/* Grid */}
              {rest.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map((t) => (
                    <figure
                      key={t.name}
                      className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4"
                    >
                      <blockquote className="text-sm leading-relaxed text-foreground/90">
                        &ldquo;{t.quote}&rdquo;
                      </blockquote>
                      <figcaption className="mt-auto border-t border-border pt-4">
                        <p className="text-sm font-semibold text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.role}, {t.company}
                        </p>
                        <p className="mt-2 inline-block rounded border border-secondary/30 bg-secondary/10 px-2 py-0.5 text-[12px] font-medium text-secondary">
                          {t.result}
                        </p>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-t border-border py-12 px-4 sm:px-6 lg:px-8" aria-label="Engagement facts">
        <div className="mx-auto max-w-7xl grid grid-cols-1 sm:grid-cols-3 gap-px bg-border border border-border">
          {stats.map((s) => (
            <div key={s.label} className="bg-card px-6 py-6 text-center sm:text-left">
              <p className="font-heading text-2xl font-semibold text-foreground">{s.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-heading h2-sm text-foreground">
            Want a result you can defend too?
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            One workflow, one written target, one human gate. That is the whole deal.
          </p>
          <Link
            href="/book-a-call"
            className="mt-8 inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Book a call
          </Link>
        </div>
      </section>
    </div>
  );
}
