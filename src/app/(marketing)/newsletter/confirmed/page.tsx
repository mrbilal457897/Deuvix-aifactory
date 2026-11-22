import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = {
  title: "Subscription confirmed",
  description: "Your Deuvix AI Factory newsletter subscription is confirmed.",
  robots: { index: false, follow: false },
};

export default function NewsletterConfirmedPage() {
  return (
    <div className="pt-12 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Subscription confirmed" },
          ]}
          className="mb-6"
        />
        <h1 className="h1 text-foreground">You&apos;re subscribed.</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Your email address is confirmed. Thank you for joining the Deuvix AI
          Factory newsletter.
        </p>
        <Link href="/" className="mt-8 inline-block text-sm font-medium text-primary hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
