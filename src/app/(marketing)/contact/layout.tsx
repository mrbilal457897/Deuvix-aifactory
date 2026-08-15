import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Deux — Book a Free Consultation",
  description:
    "Book a free consultation with Deux. Tell us about your business and we'll identify AI opportunities — from Digital FTEs to AI chatbots, voice agents, and Loop Engineering.",
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
