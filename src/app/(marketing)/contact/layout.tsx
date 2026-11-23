import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: { absolute: "Start Your AI Project" },
  description: "Tell us your idea. Plan your AI agent, chatbot or automation project with the Deuvix team.",
  path: "/contact",
});

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
