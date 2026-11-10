import Link from "next/link";
import { BookCallButton } from "@/components/book-call-button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { User, FolderOpen, ArrowRight, ArrowLeft } from "lucide-react";
import { posts, getPostBySlug } from "../posts";
import { SITE_NAME, fullTitle } from "@/lib/seo";
import { company } from "@config/company";

export async function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

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
    alternates: {
      canonical,
    },
    openGraph: {
      type: "article",
      title: socialTitle,
      description: post.excerpt,
      url: canonical,
      siteName: SITE_NAME,
      images: [post.image],
      publishedTime: new Date(`${post.date}, 2026`).toISOString(),
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

  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section className="pt-8 sm:pt-12 pb-16 bg-hero-pattern relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative mx-auto max-w-7xl px-6 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Blog", href: "/blog" },
              { label: post.title },
            ]}
            className="mb-4 sm:mb-6"
          />
          <div className="relative mx-auto max-w-3xl text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="size-4" />
            Back to Blog
          </Link>
          <div className="flex items-center justify-center gap-3 mb-4">
            <Badge className="bg-primary/10 text-primary border-primary/20">{post.category}</Badge>
            <span className="text-sm text-muted-foreground">{post.date}</span>
          </div>
          <h1 className="font-heading h1 mb-6">
            {post.title}
          </h1>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="size-4" />
              {post.author}
            </span>
            <span>/</span>
            <span className="flex items-center gap-1.5">
              <FolderOpen className="size-4" />
              {post.category}
            </span>
          </div>
          </div>
        </div>
      </section>

      {/* Featured Image */}
      <section className="px-6 -mt-2">
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

      {/* Body */}
      <section className="py-12 px-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-base text-foreground/90 leading-relaxed">{post.excerpt}</p>

          <div className="mt-10 p-6 rounded-2xl bg-card border border-border">
            <h2 className="font-heading h2-sm mb-3">Ready to put this into practice?</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Book a free consultation to see how Deuvix AI Factory can apply these principles to your business.
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
                className="font-medium text-primary hover:underline"
              >
                {company.businessEmail}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Related Posts */}
      <section className="pb-16 px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-heading h2-lg mb-8 text-center">More Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {related.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group block bg-card rounded-xl overflow-hidden border border-border hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="relative h-40 overflow-hidden">
                  <Image
                    src={p.image}
                    alt={p.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    {p.category} · {p.date}
                  </p>
                  <h3 className="font-heading h3-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {p.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
