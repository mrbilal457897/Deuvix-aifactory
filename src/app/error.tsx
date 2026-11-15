"use client";

import { useEffect } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Root error boundary — the site keeps the navbar/footer (rendered by the
 * root layout) and shows a calm, on-brand fallback instead of a blank crash
 * screen. Nothing about the environment is surfaced to the visitor.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side kept clean; log only the digest, never the message (which
    // may include internals) — no PII reaches client logs.
    console.error("[app:error-boundary]", error?.digest ?? "unknown");
  }, [error]);

  return (
    <section
      className="pt-16 pb-24 sm:pt-24 sm:pb-32"
      aria-labelledby="app-error-heading"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-6 lg:px-8 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-secondary">
          Something went wrong
        </p>
        <h1
          id="app-error-heading"
          className="mt-5 font-heading h1 text-foreground"
        >
          We hit a snag on our side.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
          It is not you — something broke behind the scenes. Try again, or head
          back home while we look at it.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={reset}
            className={cn(buttonVariants({ variant: "default", size: "lg" }), "font-semibold")}
          >
            Try again
          </button>
          <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "font-semibold")}>
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
