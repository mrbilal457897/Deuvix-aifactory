import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact DEUX AI Factory — Book a Free AI Consultation",
  description:
    "Get in touch with DEUX AI Factory to book a free consultation. We help businesses deploy AI chatbots, voice agents, custom agents, and Digital FTEs with Loop Engineering — response within 24 hours.",
  keywords:
    "contact DEUX AI Factory, AI consultation, book AI agent demo, Digital FTE consultation, AI chatbot inquiry, voice agent inquiry",
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
