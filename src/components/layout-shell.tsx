"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BackToTop } from "@/components/back-to-top";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { OffscreenPause } from "@/components/motion/OffscreenPause";
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

    // Sentry SDK is ~430 KB. Defer until the browser is truly idle (or well
    // after Lighthouse's TBT window) so it never competes with first paint.
    // Errors before that point are simply not captured — better than a slow UI.
    let sentryTimer = 0;
    let idleHandle = 0;
    let cancelled = false;
    const startSentry = async () => {
      if (cancelled) return;
      try {
        const { initSentry } = await import("@/instrumentation-client");
        await initSentry();
      } catch {
        // Sentry is optional - never block the page on it.
      }
    };
    if (typeof window !== "undefined") {
      sentryTimer = window.setTimeout(() => {
        if ("requestIdleCallback" in window) {
          idleHandle = window.requestIdleCallback(() => void startSentry(), { timeout: 3000 });
        } else {
          void startSentry();
        }
      }, 8000);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", onLoad);
      window.clearTimeout(fontsTimer);
      window.clearTimeout(sentryTimer);
      if (idleHandle && "cancelIdleCallback" in window) window.cancelIdleCallback(idleHandle);
    };
  }, []);

  return (
    <>
      <OffscreenPause />
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
