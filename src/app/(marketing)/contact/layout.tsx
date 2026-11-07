import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discuss Deuvix AI Factory — Book a Free AI Consultation",
  description:
    "Get in touch with Deuvix AI Factory to book a free consultation. We help businesses deploy AI chatbots, voice agents, custom agents, and Digital FTEs with Loop Engineering — response within 24 hours.",
  keywords:
    "discuss Deuvix AI Factory, AI consultation, book AI agent demo, Digital FTE consultation, AI chatbot inquiry, voice agent inquiry",
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
