import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects & Case Studies",
  description:
    "See how Deux manufactures and deploys Digital FTEs and AI solutions for real businesses — from intelligent automation to production-ready AI systems.",
  alternates: { canonical: "/projects" },
};

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
