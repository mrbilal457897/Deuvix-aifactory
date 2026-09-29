import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About DEUX AI Factory — Building Digital FTEs & Loop Engineering",
  description:
    "DEUX AI Factory was founded to manufacture, deploy, and monetize Digital FTEs. Meet the team building AI chatbots, voice agents, custom agents, and Loop Engineering methodology for businesses worldwide.",
  keywords:
    "DEUX AI Factory, Digital FTE company, AI startup Pakistan, Loop Engineering, AI agents team, Forward Deployed Engineer",
  alternates: { canonical: "/about" },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
