"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { DeuvixLogo } from "./DeuvixLogo";
import { logoIntro, logoWave } from "@/lib/logo-animations";

type Props = {
  /** Play the intro once per browser session (use only on the main header logo). */
  intro?: boolean;
  href?: string;
  className?: string;
  /** Logo height in px; width follows automatically. */
  height?: number;
};

const FLAG = "dx-logo-intro";

export function SiteLogo({ intro = false, href = "/", className = "", height = 32 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathname = usePathname();
  const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ctx = gsap.context(() => {
      let seen = false;
      try { seen = sessionStorage.getItem(FLAG) === "1"; } catch {}
      if (intro && !seen && !reduce()) {
        logoIntro(svg);
        try { sessionStorage.setItem(FLAG, "1"); } catch {}
      } else {
        gsap.set(svg, { autoAlpha: 1 });
      }
    }, svg);
    document.documentElement.classList.remove("logo-intro");
    return () => ctx.revert();
  }, [intro]);

  return (
    <Link
      href={href}
      aria-label="Deuvix AI Factory, home"
      data-intro-logo={intro ? "" : undefined}
      className={`site-logo ${className}`}
      style={{ ["--logo-h" as string]: `${height}px` }}
      onMouseEnter={() => { if (svgRef.current && !reduce()) logoWave(svgRef.current); }}
      onClick={(e) => {
        // Clicking the logo while already on the home page replays the intro and scrolls to top.
        if (pathname === href && svgRef.current) {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: reduce() ? "auto" : "smooth" });
          if (!reduce()) logoIntro(svgRef.current);
        }
      }}
    >
      <DeuvixLogo ref={svgRef} aria-hidden="true" role={undefined} />
    </Link>
  );
}
