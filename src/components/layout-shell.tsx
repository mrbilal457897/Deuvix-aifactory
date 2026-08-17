"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ChatWidget } from "@/components/chat/chat-widget";
import { BackToTop } from "@/components/back-to-top";
import { usePathname } from "next/navigation";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

  const noFooterRoutes = ["/login", "/deux"];
const noHeaderRoutes = ["/login", "/deux"];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideFooter = noFooterRoutes.some((r) => pathname.startsWith(r));
  const hideHeader = noHeaderRoutes.some((r) => pathname.startsWith(r));

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh();

    const onLoad = () => {
      window.setTimeout(refresh, 300);
      window.setTimeout(refresh, 1200);
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad);
    }

    let fontsTimer = 0;
    if (document.fonts) {
      document.fonts.ready.then(() => {
        fontsTimer = window.setTimeout(refresh, 200);
      });
    }

    return () => {
      window.removeEventListener("load", onLoad);
      window.clearTimeout(fontsTimer);
    };
  }, []);

  return (
    <>
      {!hideHeader && <Header />}
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
      {!hideFooter && <ChatWidget />}
      {!hideFooter && <BackToTop />}
    </>
  );
}
