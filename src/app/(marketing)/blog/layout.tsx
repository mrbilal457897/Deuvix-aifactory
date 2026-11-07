import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — AI Agents, Digital FTEs & Loop Engineering Guides",
  description:
    "Guides and deep-dives from Deuvix AI Factory: Digital FTEs, Forward Deployed Engineering, AI agents, Loop Engineering, and building AI-Native companies.",
  alternates: { canonical: "/blog" },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
