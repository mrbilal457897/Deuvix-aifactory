"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BackToTop } from "@/components/back-to-top";
import { BookCallProvider } from "@/components/book-call-provider";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { usePathname } from "next/navigation";

/**
 * The chat bundle is only needed once a visitor actually talks to it, so it is
 * loaded lazily and rendered on the client only. This is what keeps the
 * Gemini SDK and markdown renderer out of the marketing pages' initial JS (§10).
 */
const Chat = dynamic(
  () => import("@/components/chat/chat").then((m) => ({ default: m.Chat })),
  { ssr: false, loading: () => null },
);


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
    <BookCallProvider>
      {!hideHeader && <Header />}
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
      {!hideFooter && <Chat />}
      {!hideFooter && <WhatsAppFab />}
      {!hideFooter && <BackToTop />}
    </BookCallProvider>
  );
}
