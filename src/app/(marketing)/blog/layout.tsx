import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Blog — AI Agents, Digital FTEs & Loop Engineering Guides",
  description:
    "Guides and deep-dives from Deuvix AI Factory: Digital FTEs, Forward Deployed Engineering, AI agents, Loop Engineering, and building AI-Native companies.",
  path: "/blog",
});

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
