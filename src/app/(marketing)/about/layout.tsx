import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: { absolute: "About the Deuvix Team" },
  description: "Meet the founders building Digital FTEs and AI agents that work around the clock.",
  path: "/about",
});

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
