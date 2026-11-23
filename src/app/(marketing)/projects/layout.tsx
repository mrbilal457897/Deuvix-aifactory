import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: { absolute: "AI Projects & Case Studies" },
  description: "Explore Deuvix's live AI projects, from CRM and e-commerce to AI textbooks and eBooks.",
  path: "/projects",
});

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
