import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { User, FolderOpen, ArrowRight, ArrowLeft } from "lucide-react";
import { posts, getPostBySlug } from "../posts";
import { SITE_NAME } from "@/lib/seo";

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

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `/blog/${post.slug}`,
      siteName: SITE_NAME,
      images: [post.image],
      publishedTime: new Date(`${post.date}, 2026`).toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
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
    <div className="pt-24">
      {/* Hero */}
      <section className="py-16 px-4 bg-hero-pattern relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
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
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
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
      </section>

      {/* Featured Image */}
      <section className="px-4 -mt-2">
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
      <section className="py-12 px-4">
        <div className="mx-auto max-w-3xl">
          <p className="text-lg text-foreground/90 leading-relaxed">{post.excerpt}</p>

          <div className="mt-10 p-6 rounded-2xl bg-card border border-border">
            <h2 className="font-heading text-lg font-bold mb-3">Ready to put this into practice?</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Book a free consultation to see how Deux can apply these principles to your business.
            </p>
            <Link href="/contact">
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                Book a Consultation
                <ArrowRight className="size-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Related Posts */}
      <section className="pb-16 px-4">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-heading text-2xl font-bold mb-8 text-center">More Articles</h2>
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
                  <h3 className="font-heading font-bold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
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
