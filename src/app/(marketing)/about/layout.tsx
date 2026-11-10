import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "About Deuvix AI Factory — Building Digital FTEs & Loop Engineering",
  description:
    "Deuvix AI Factory was founded to manufacture, deploy, and monetize Digital FTEs. Meet the team building AI chatbots, voice agents, custom agents, and Loop Engineering methodology for businesses worldwide.",
  path: "/about",
  keywords:
    "Deuvix AI Factory, Digital FTE company, AI startup Pakistan, Loop Engineering, AI agents team, Forward Deployed Engineer",
});

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
