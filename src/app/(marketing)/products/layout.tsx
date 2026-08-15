import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products & Services — AI Agents, Digital FTEs & Loop Engineering",
  description:
    "Explore Deux's AI services: Digital FTE deployment, FDE consulting, AI chatbots, voice agents, custom agents, and Loop Engineering — AI workers that run 24/7 at 85% cost savings.",
  alternates: { canonical: "/products" },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
