"use client";

import { useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ChatWidget } from "@/components/chat/chat-widget";
import { BackToTop } from "@/components/back-to-top";
import { usePathname } from "next/navigation";

const noFooterRoutes = ["/login", "/dashboard"];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideFooter = noFooterRoutes.some((r) => pathname.startsWith(r));

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
      {!hideFooter && <ChatWidget />}
      {!hideFooter && <BackToTop />}
    </>
  );
}
