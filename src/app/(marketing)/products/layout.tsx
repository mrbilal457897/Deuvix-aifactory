import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: { absolute: "AI Agent Services" },
  description: "Custom AI chatbots, voice agents and Digital FTEs that run 24/7 for your business.",
  path: "/products",
});

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
