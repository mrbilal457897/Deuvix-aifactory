import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Products & Services — AI Agents, Digital FTEs & Loop Engineering",
  description:
    "Explore Deuvix AI Factory's services: Digital FTE deployment, FDE consulting, AI chatbots, voice agents, custom agents, and Loop Engineering — AI workers under human oversight, at up to 85% lower cost per completed task.",
  path: "/products",
});

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
