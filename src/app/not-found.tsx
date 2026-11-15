import Link from "next/link";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Page not found",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Site-wide 404 — keeps the navbar/footer (rendered by the root layout) and
 * reuses the site's heading scale + tokens. No new styles introduced.
 */
export default function NotFound() {
  return (
    <section
      className="pt-16 pb-24 sm:pt-24 sm:pb-32"
      aria-labelledby="not-found-heading"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-6 lg:px-8 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-secondary">
          404 — Not found
        </p>
        <h1
          id="not-found-heading"
          className="mt-5 font-heading h1 text-foreground"
        >
          This page doesn&rsquo;t exist.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
          The link may be outdated or the page may have moved — the work we ship
          for clients is alive at the links below.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/" className={cn(buttonVariants({ variant: "default", size: "lg" }), "font-semibold")}>
            Back to home
          </Link>
          <Link href="/projects" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "font-semibold")}>
            See our work
          </Link>
        </div>
      </div>
    </section>
  );
}
