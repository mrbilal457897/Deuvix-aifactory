import Link from "next/link";
import { BookCallButton } from "@/components/book-call-button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { User, FolderOpen, ArrowRight, ArrowLeft, List } from "lucide-react";
import { posts, getPostBySlug } from "../posts";
import { bodies } from "../bodies";
import { renderMarkdown, tocFor, readingTimeMinutes } from "@/lib/blog/markdown";
import { SITE_NAME, SITE_URL, fullTitle } from "@/lib/seo";
import { company } from "@config/company";

export async function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

const AUTHOR_BIOS: Record<string, string> = {
  "Bilal Ali":
    "Co-founder & CEO. Turns AI research into revenue — architect of the Manufacture-Deploy-Monetize model behind every Digital FTE that ships.",
  "Asadullah":
    "Co-founder & CTO. Ships Loop Engineering into production — spec-driven, human-gated systems that run real workloads around the clock.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const canonical = `/blog/${post.slug}`;
  const socialTitle = fullTitle(post.title);

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: socialTitle,
      description: post.excerpt,
      url: `${SITE_URL}${canonical}`,
      siteName: SITE_NAME,
      images: [post.image],
      publishedTime: new Date(post.date).toISOString(),
      authors: [post.author],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: post.excerpt,
      images: [post.image],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const body = bodies[post.slug] ?? "";
  const toc = tocFor(body);
  const showToc = toc.length >= 4;
  const reading = readingTimeMinutes(body);
  const authorBio = AUTHOR_BIOS[post.author];

  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 2);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: [post.image.startsWith("http") ? post.image : `${SITE_URL}${post.image}`],
    datePublished: new Date(post.date).toISOString(),
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };

  return (
    <div>
      {/* Hero */}
      <section className="pt-8 sm:pt-12 pb-16 bg-hero-pattern relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Blog", href: "/blog" },
              { label: post.title },
            ]}
            className="mb-4 sm:mb-6"
          />
          <div className="relative mx-auto max-w-3xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="size-4" />
            Back to Blog
          </Link>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="bg-secondary/10 text-secondary border border-secondary/30 rounded px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              {post.category}
            </span>
            <span className="text-sm text-muted-foreground">{post.date}</span>
            <span className="text-sm text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">{reading} min read</span>
          </div>
          <h1 className="font-heading h2-lg mb-6 text-foreground">{post.title}</h1>

          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary/10 font-heading text-sm font-semibold text-secondary">
              {post.author
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{post.author}</p>
              <p className="text-xs leading-snug text-muted-foreground">{authorBio}</p>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Featured image */}
      <section className="px-4 sm:px-6 -mt-2">
        <div className="mx-auto max-w-3xl">
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-lg shadow-black/10">
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        </div>
      </section>

      {/* Body + TOC */}
      <section className="py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {showToc && (
            <nav
              aria-label="Table of contents"
              className="mb-8 rounded-xl border border-border bg-card p-5"
            >
              <p className="mb-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <List size={14} aria-hidden="true" /> Table of contents
              </p>
              <ol className="list-decimal pl-5 space-y-1.5 text-sm">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="text-secondary hover:underline">
                      {item.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className="space-y-5">{renderMarkdown(body)}</div>

          <div className="mt-12 p-6 rounded-2xl bg-card border border-border">
            <h2 className="font-heading h2-sm mb-3">Ready to put this into practice?</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Book a consultation and we will map your first workflow together — no
              commitment, one business day.
            </p>
            <BookCallButton
              icon={null}
              className="px-6 py-3 rounded-none bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors h-auto"
            >
              Book a Consultation
              <ArrowRight className="size-4" />
            </BookCallButton>
            <p className="mt-5 text-sm text-muted-foreground">
              Prefer email? Reach us at{" "}
              <a
                href={`mailto:${company.businessEmail}`}
                className="font-medium text-secondary hover:underline"
              >
                {company.businessEmail}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Related posts */}
      <section className="pb-16 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-heading h2-lg mb-8 text-foreground">Related reading</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {related.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group block bg-card rounded-xl overflow-hidden border border-border hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="relative h-44 overflow-hidden">
                  <Image
                    src={p.image}
                    alt={p.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    {p.category} · {p.date}
                  </p>
                  <h3 className="font-heading h3-sm line-clamp-2 group-hover:text-secondary transition-colors text-foreground">
                    {p.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Article JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
    </div>
  );
}
