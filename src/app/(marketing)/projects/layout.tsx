import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Work & Case Studies",
  description:
    "See how Deuvix AI Factory manufactures and deploys Digital FTEs and AI solutions for real businesses — from intelligent automation to production-ready AI systems.",
  path: "/projects",
});

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
