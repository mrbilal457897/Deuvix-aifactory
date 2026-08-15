import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Deux — The AI Agent Factory",
  description:
    "Deux is an AI-Native company manufacturing, deploying, and monetizing Digital FTEs. Spec-Driven Development, co-learning partnerships, and production-ready AI systems.",
  alternates: { canonical: "/about" },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
