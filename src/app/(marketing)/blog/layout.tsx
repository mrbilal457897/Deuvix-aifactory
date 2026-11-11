import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Blog — AI Agents, Digital FTEs & Loop Engineering Guides",
  description:
    "Field notes from Deuvix AI Factory on building and running Digital FTEs — AI workers under human oversight: Loop Engineering, FDE practice, and the discipline of writing specs machines can follow.",
  path: "/blog",
});

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
