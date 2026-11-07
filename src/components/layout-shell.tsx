"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BackToTop } from "@/components/back-to-top";
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

  const noFooterRoutes = ["/login", "/deuvix"];
const noHeaderRoutes = ["/login", "/deuvix"];

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
      {!hideHeader && <Navbar />}
      <main id="main-content" className={hideHeader ? "flex-1" : "flex-1 pt-16"}>
        {children}
      </main>
      {!hideFooter && <Footer />}
      {!hideFooter && <Chat />}
      {!hideFooter && <WhatsAppFab />}
      {!hideFooter && <BackToTop />}
    </>
  );
}
