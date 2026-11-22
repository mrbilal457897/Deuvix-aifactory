import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = {
  title: "Unsubscribed",
  description: "You have been unsubscribed from the Deuvix AI Factory newsletter.",
  robots: { index: false, follow: false },
};

export default function NewsletterUnsubscribedPage() {
  return (
    <div className="pt-12 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Unsubscribed" },
          ]}
          className="mb-6"
        />
        <h1 className="h1 text-foreground">You&apos;re unsubscribed.</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          You will no longer receive the Deuvix AI Factory newsletter. You can
          subscribe again at any time from the footer.
        </p>
        <Link href="/" className="mt-8 inline-block text-sm font-medium text-primary hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
