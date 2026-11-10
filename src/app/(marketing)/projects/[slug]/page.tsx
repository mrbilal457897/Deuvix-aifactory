import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BookCallButton } from "@/components/book-call-button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ProjectBlock } from "@/components/sections/project-block";
import { RichText } from "@/components/sections/rich-text";
import {
  getAdjacentProjects,
  getPublishedProjectBySlug,
  listPublishedProjects,
  resolvePreviousSlug,
} from "@/lib/projects";
import { SITE_NAME, SITE_URL, fullTitle } from "@/lib/seo";
import { company } from "@config/company";
import "@/app/live-work.css";

/** Every published project gets its own page; drafts never appear here. */
export async function generateStaticParams() {
  const projects = await listPublishedProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProjectBySlug(slug);
  if (!project) return {};

  const canonical = `/projects/${project.slug}`;
  const socialTitle = fullTitle(project.name);
  const image = project.desktopThumbnail?.url;

  return {
    title: project.name,
    description: project.description,
    alternates: { canonical },
    keywords: project.tags.length > 0 ? project.tags : undefined,
    openGraph: {
      type: "article",
      title: socialTitle,
      description: project.description,
      url: canonical,
      siteName: SITE_NAME,
      images: image ? [{ url: image, width: 1600, height: 1000, alt: project.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: project.description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getPublishedProjectBySlug(slug);

  // A renamed project keeps its old URL: 301 to the current one.
  if (project && project.slug !== slug) permanentRedirect(`/projects/${project.slug}`);

  if (!project) {
    const current = await resolvePreviousSlug(slug);
    if (current) permanentRedirect(`/projects/${current}`);
    notFound();
  }

  const { previous, next } = await getAdjacentProjects(project.slug);
  const gallery = project.gallery.slice(0, 12);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.name,
    description: project.description,
    url: `${SITE_URL}/projects/${project.slug}`,
    image: project.desktopThumbnail?.url,
    keywords: project.tags.join(", "),
    datePublished: new Date(project.updatedAt).toISOString(),
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <section className="pt-8 sm:pt-12 pb-10">
        <div className="mx-auto max-w-7xl px-6 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Work", href: "/projects" },
              { label: project.name },
            ]}
            className="mb-4 sm:mb-6"
          />
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="size-4" />
            Back to Work
          </Link>

          {/* The project name is the page's single h1. */}
          <h1 className="h1">
            <span className="lw-name-dot" aria-hidden="true" />
            {project.name}
            {project.unitId ? <span className="lw-unit"> {project.unitId}</span> : null}
          </h1>

          <ProjectBlock
            project={project}
            index={0}
            mirrored={false}
            priority
            reveal={false}
            hideName
          />
        </div>
      </section>

      {project.content.trim() && (
        <section className="px-6 pb-14">
          <div className="mx-auto max-w-3xl">
            <RichText content={project.content} />
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="px-6 pb-14">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-heading h2-lg mb-6">Gallery</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {gallery.map((image, index) => (
                <div
                  key={`${image.url}-${index}`}
                  className="relative overflow-hidden rounded-2xl border border-border bg-card"
                  style={{
                    aspectRatio: image.width && image.height ? `${image.width} / ${image.height}` : "16 / 10",
                  }}
                >
                  <Image
                    src={image.url}
                    alt={image.alt || `${project.name} — image ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover object-top"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Prev / next by `order` */}
      <section className="px-6 pb-14">
        <nav
          aria-label="Work navigation"
          className="mx-auto max-w-5xl grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-8"
        >
          {previous ? (
            <Link
              href={`/projects/${previous.slug}`}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-colors"
            >
              <ArrowLeft className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="min-w-0">
                <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                  Previous
                </span>
                <span className="block truncate font-heading font-semibold">{previous.name}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/projects/${next.slug}`}
              className="group flex items-center justify-end gap-3 rounded-2xl border border-border bg-card p-5 text-right hover:border-primary/40 transition-colors sm:col-start-2"
            >
              <span className="min-w-0">
                <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                  Next
                </span>
                <span className="block truncate font-heading font-semibold">{next.name}</span>
              </span>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          )}
        </nav>
      </section>

      {/* Book a Call band */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl rounded-3xl bg-card border border-border p-8 sm:p-12 text-center">
          <h2 className="font-heading h2-sm mb-3">
            Want a Digital FTE like this one?
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground text-base mb-6">
            Book a free consultation and we&apos;ll map the agent to your workflow — no slideware,
            just the unit that does the job.
          </p>
          <BookCallButton
            icon={null}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-none bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors h-auto"
          >
            Book a Call
            <ArrowRight className="size-4" />
          </BookCallButton>
          <p className="mt-5 text-sm text-muted-foreground">
            Prefer email?{" "}
            <a
              href={`mailto:${company.businessEmail}`}
              className="font-medium text-primary hover:underline"
            >
              {company.businessEmail}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
