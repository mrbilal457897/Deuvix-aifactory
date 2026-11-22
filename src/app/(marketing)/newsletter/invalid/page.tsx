import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = {
  title: "Invalid newsletter link",
  description: "This newsletter link is invalid or has expired.",
  robots: { index: false, follow: false },
};

export default function NewsletterInvalidPage() {
  return (
    <div className="pt-12 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Invalid link" },
          ]}
          className="mb-6"
        />
        <h1 className="h1 text-foreground">This link is no longer valid.</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          The confirmation link may have expired (links are valid for 48 hours)
          or the address is already confirmed. Subscribe again from the footer
          to receive a fresh link.
        </p>
        <Link href="/" className="mt-8 inline-block text-sm font-medium text-primary hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
