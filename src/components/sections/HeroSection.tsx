"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ArrowRight } from "lucide-react";
import { Poppins, Inter } from "next/font/google";
import { SaraChat } from "./SaraChat";
import { FdeRoadmap } from "./FdeRoadmap";
import styles from "./hero.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin();
}

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const TABS = [
  { id: "sara", label: "Sara AI Assistant" },
  { id: "roadmap", label: "FDE Roadmap" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function HeroSection() {
  const rootRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState<TabId>("sara");
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    sara: null,
    roadmap: null,
  });

  // Reduced-motion aware entrance timeline.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        [".js-pill", ".js-label", ".js-sub", ".js-cta", ".js-panel"],
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.85, ease: "power3.out", stagger: 0.11 }
      );
      gsap.fromTo(
        ".js-h1",
        { y: 46, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.1, ease: "power4.out", delay: 0.06 }
      );
    }, root);

    return () => ctx.revert();
  }, []);

  // Arrow-key navigation across the tablist.
  const onTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const idx = activeTab === "sara" ? 0 : 1;
    const next = TABS[(idx + dir + TABS.length) % TABS.length];
    setActiveTab(next.id);
    tabRefs.current[next.id]?.focus();
  }, [activeTab]);

  return (
    <section
      ref={rootRef}
      className={`${styles.hero} ${poppins.variable} ${inter.variable}`}
      aria-label="Introduction"
    >
      <div className={styles.heroGlow} aria-hidden="true" />

      <div className={styles.heroInner}>
        {/* pill badge */}
        <div className={`${styles.pill} js-pill`}>
          <span className={styles.pillDot} aria-hidden="true" />
          Deuvix AI Factory — Now Accepting Clients
        </div>

        {/* mono label + hairline */}
        <div className={`${styles.monoRow} js-label`}>
          <span className={styles.monoLabel}>Manufacture / Deploy / Monetize</span>
          <span className={styles.monoRule} aria-hidden="true" />
        </div>

        {/* h1 — full width */}
        <h1 className={`${styles.h1} js-h1`}>
          Build your AI workforce,
          <span className={styles.h1Line2}>unit by unit.</span>
        </h1>

        {/* 2-column row */}
        <div className={styles.row}>
          {/* left: description + CTAs */}
          <div className={styles.leftCol}>
            <p className={`${styles.sub} js-sub`}>
              We design, manufacture and deploy Digital FTEs — AI workers that run production
              lines, not demos. Round-the-clock output at a fraction of the headcount cost,
              engineered for your business from spec to shipment.
            </p>

            <div className={`${styles.ctaRow} js-cta`}>
              <Link href="/book-a-call" className={`${styles.btn} ${styles.btnPrimary}`}>
                <span className={styles.btnBody}>Book a Call</span>
                <span className={styles.btnArrow} aria-hidden="true">
                  <ArrowRight size={20} strokeWidth={2.25} />
                </span>
              </Link>
              <Link href="/projects" className={`${styles.btn} ${styles.btnGhost}`}>
                <span className={styles.btnBody}>See Projects</span>
                <span className={styles.btnArrow} aria-hidden="true">
                  <ArrowRight size={20} strokeWidth={2.25} />
                </span>
              </Link>
            </div>
          </div>

          {/* right: switcher panel */}
          <div className={`${styles.rightCol} js-panel`}>
            <div role="tablist" aria-label="Live product preview" className={styles.tabBar} onKeyDown={onTabKeyDown}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[tab.id] = el;
                  }}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`hero-panel-${tab.id}`}
                  id={`hero-tab-${tab.id}`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className={styles.tabDot} aria-hidden="true" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className={styles.stage}>
              <div
                role="tabpanel"
                id="hero-panel-sara"
                aria-labelledby="hero-tab-sara"
                aria-hidden={activeTab !== "sara"}
                className={activeTab === "sara" ? "" : styles.viewHidden}
              >
                <SaraChat />
              </div>
              <div
                role="tabpanel"
                id="hero-panel-roadmap"
                aria-labelledby="hero-tab-roadmap"
                aria-hidden={activeTab !== "roadmap"}
                className={activeTab === "roadmap" ? "" : styles.viewHidden}
              >
                <FdeRoadmap active={activeTab === "roadmap"} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
