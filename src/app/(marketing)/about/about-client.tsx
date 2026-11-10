"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Mail } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { company } from "@config/company";
import styles from "./about.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ---------------- data (existing copy) ---------------- */

const values = [
  {
    numeral: "i.",
    title: "Mission-Driven",
    description: "AI should empower everyone, not just the technically privileged.",
  },
  {
    numeral: "ii.",
    title: "People First",
    description: "Technology serves people. Every solution starts with human needs.",
  },
  {
    numeral: "iii.",
    title: "Innovation",
    description: "We push boundaries daily, exploring what's possible with AI.",
  },
  {
    numeral: "iv.",
    title: "Collaboration",
    description: "The best solutions come from diverse perspectives.",
  },
] as const;

const stats = [
  { target: 168, suffix: "hrs/week", label: "Uptime" },
  { target: 85, suffix: "%", label: "Cost Savings" },
  { target: 99, suffix: "%+", label: "Task Consistency" },
  { target: 4, suffix: "x", label: "Output vs Human" },
] as const;

const leaders = [
  {
    name: "Bilal Ali",
    role: "Co-founder & CEO",
    index: "01",
    description:
      "Turns AI research into revenue — architect of Deuvix AI Factory's Manufacture-Deploy-Monetize model and the strategy behind every Digital FTE that ships to production.",
    src: "/images/bilal.jpg",
    alt: "Portrait of Bilal Ali, Co-founder and Chief Executive Officer of Deuvix AI Factory",
    linkedin: "https://www.linkedin.com/in/bilal-alee-6769462ba/",
  },
  {
    name: "Asadullah",
    role: "Co-founder & CTO",
    index: "02",
    description:
      "Architect of Loop Engineering — builds the spec-driven, human-gated systems that let AI agents run production workloads 24/7 without losing human oversight.",
    src: "/images/asad.jpg",
    alt: "Portrait of Asadullah, Co-founder and Chief Technology Officer of Deuvix AI Factory",
    linkedin: "https://www.linkedin.com/company/145184855/",
  },
] as const;

const journey = [
  {
    year: "2022",
    title: "First Agent",
    description: "Deployed our first Digital FTE, serving early adopters.",
  },
  {
    year: "2023",
    title: "FDE Launch",
    description: "Launched Forward Deployed Engineer services for enterprise clients.",
  },
  {
    year: "2024",
    title: "AI E-books",
    description: "Published the AI Agent Factory guide, reaching 10,000+ readers.",
  },
  {
    year: "2025",
    title: "Platform Growth",
    description: "Complete platform with FTE deployment, FDE consulting, and web apps.",
  },
  {
    year: "2026",
    title: "Next Chapter",
    description: "Pioneering Digital FTE monetization at scale.",
  },
] as const;

const linkedinGlyph = (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

export function AboutClient() {
  const rootRef = useRef<HTMLElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const trunkRef = useRef<HTMLDivElement>(null);

  const handleImageLoad = useCallback(() => {
    ScrollTrigger.refresh();
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; /* all content renders in its final state */

    root.classList.add("js");

    /* Fallback: if rAF never fires (occluded/background window), reveal everything statically */
    let rafAlive = false;
    const probeId = window.requestAnimationFrame(() => {
      rafAlive = true;
    });
    const fallback = window.setTimeout(() => {
      if (rafAlive) return;
      root.classList.remove("js");
      const reveal = (el: Element) => {
        const node = el as HTMLElement;
        node.style.opacity = "1";
        node.style.transform = "none";
        node.style.clipPath = "none";
      };
      root
        .querySelectorAll(".fx, .js-hero-line, .js-hero-fade, .js-portrait, .js-branch, .js-leaf")
        .forEach(reveal);
      root.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        el.textContent = el.dataset.count ?? el.textContent;
      });
      if (trunkRef.current) {
        trunkRef.current.style.transform = "none";
      }
    }, 1000);

    try {
      /* zero-out counters before paint so nothing flashes */
      root.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        el.textContent = "0";
      });

      const ctx = gsap.context(() => {
        /* hero — line-by-line mask reveal */
        gsap.fromTo(
          ".js-hero-line",
          { yPercent: 112 },
          { yPercent: 0, duration: 1.15, ease: "power4.out", stagger: 0.13, delay: 0.12 },
        );
        gsap.fromTo(
          ".js-hero-fade",
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.12, delay: 0.4 },
        );

        /* every section reveals once on scroll */
        gsap.utils.toArray<HTMLElement>(".fx").forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0, y: 34 },
            {
              opacity: 1,
              y: 0,
              duration: 0.95,
              ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            },
          );
        });

        /* animated count-up numbers in the stats strip */
        const statsStrip = root.querySelector("[data-stats]");
        root.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
          const target = Number(el.dataset.count ?? "0");
          const counter = { value: 0 };
          gsap.to(counter, {
            value: target,
            duration: 1.9,
            ease: "power3.out",
            scrollTrigger: { trigger: statsStrip, start: "top 85%", once: true },
            onUpdate: () => {
              el.textContent = String(Math.round(counter.value));
            },
          });
        });

        /* leadership — clip-path reveal per portrait */
        gsap.utils.toArray<HTMLElement>(".js-portrait").forEach((el) => {
          gsap.fromTo(
            el,
            { clipPath: "inset(12% 9% 12% 9%)" },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: 1.3,
              ease: "power4.out",
              scrollTrigger: { trigger: el, start: "top 82%", once: true },
            },
          );
        });

        /* leadership — inner parallax with scrub */
        gsap.utils.toArray<HTMLElement>(".js-parallax").forEach((el) => {
          const wrap = el.closest("[data-portrait]");
          gsap.fromTo(
            el,
            { yPercent: -6 },
            {
              yPercent: 6,
              ease: "none",
              scrollTrigger: {
                trigger: wrap,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.6,
              },
            },
          );
        });

        /* journey — trunk draws itself with scrub */
        if (treeRef.current && trunkRef.current) {
          gsap.fromTo(
            trunkRef.current,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: "none",
              scrollTrigger: {
                trigger: treeRef.current,
                start: "top 72%",
                end: "bottom 60%",
                scrub: 0.7,
              },
            },
          );
        }

        /* journey — branches grow out from the trunk */
        gsap.utils.toArray<HTMLElement>(".js-branch").forEach((el) => {
          gsap.fromTo(
            el,
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: 1.15,
              ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 84%", once: true },
            },
          );
        });

        /* journey — glowing leaf nodes pop in */
        gsap.utils.toArray<HTMLElement>(".js-leaf").forEach((el) => {
          gsap.fromTo(
            el,
            { scale: 0, rotate: -40 },
            {
              scale: 1,
              rotate: 0,
              duration: 0.85,
              ease: "back.out(1.7)",
              scrollTrigger: { trigger: el, start: "top 84%", once: true },
            },
          );
        });
      }, root);

      return () => {
        window.cancelAnimationFrame(probeId);
        window.clearTimeout(fallback);
        ctx.revert();
        root.classList.remove("js");
      };
    } catch {
      window.cancelAnimationFrame(probeId);
      window.clearTimeout(fallback);
      root.classList.remove("js");
      return undefined;
    }
  }, []);

  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh();
    if (document.readyState === "complete") refresh();
    window.addEventListener("load", refresh);
    return () => window.removeEventListener("load", refresh);
  }, []);

  const rootClass = styles.root;

  return (
    <article ref={rootRef} className={rootClass}>
      {/* ============ 1 · HERO ============ */}
      <header className={styles.hero} aria-label="Introduction">
        <div className={styles.heroGlow} aria-hidden="true" />

        <div className={styles.heroInner}>
          <div className={styles.crumbRow}>
            <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "About" }]} />
          </div>

          <p className={`${styles.eyebrow} js-hero-fade`}>About Deuvix AI Factory</p>

          <h1 className={styles.heroHeadline}>
            <span className={styles.maskLine}>
              <span className={`${styles.maskInner} js-hero-line`}>Building the</span>
            </span>
            <span className={styles.maskLine}>
              <span className={`${styles.maskInner} ${styles.maskIndent} js-hero-line`}>
                workforce of
              </span>
            </span>
            <span className={styles.maskLine}>
              <span className={`${styles.maskInner} js-hero-line`}>
                <span className="text-gradient">tomorrow</span>.
              </span>
            </span>
          </h1>

          <p className={`${styles.heroSub} js-hero-fade`}>
            We help businesses manufacture, deploy, and monetize Digital FTEs — the AI
            workers that run the next generation of enterprises.
          </p>
        </div>

        <div className={styles.scrollCueWrap}>
          <a href="#our-story" className={styles.scrollCue}>
            <span className={styles.scrollTrack} aria-hidden="true">
              <span className={styles.scrollTrackDot} />
            </span>
            <span className={styles.scrollCueText}>Scroll to explore</span>
          </a>
        </div>
      </header>

      {/* ============ 2 · OUR STORY ============ */}
      <section id="our-story" className={styles.section} aria-labelledby="our-story-title">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={`${styles.eyebrow} fx`}>01 · Who we are</p>
            <h2 id="our-story-title" className={`${styles.aboutH2} fx`}>
              Our <span className="text-gradient">Story</span>.
            </h2>
          </div>

          <div className={styles.storyGrid}>
            <div className={`${styles.storyCopy} ${styles.dropCap} fx`}>
              <p>
                Deuvix AI Factory was born from a simple observation: the most powerful AI
                technologies were locked behind walls of complexity.
              </p>
              <p>
                We set out to change that. Our platform helps businesses manufacture, deploy,
                and monetize Digital FTEs — AI workers that operate 24/7 at a fraction of
                human cost.
              </p>
              <p>
                From spec-driven development to production-ready deployment, we build the AI
                workforce your company needs to thrive in the agent era.
              </p>
            </div>

            <figure className={`${styles.figure} fx`}>
              <div className={styles.figureFrame}>
                <div className={styles.figureImg}>
                  <Image
                    src="/images/about1.jpg"
                    alt="Inside the Deuvix AI Factory — the engineering floor where Digital FTEs are spec-built, deployed and monitored"
                    fill
                    sizes="(min-width: 1024px) 38vw, 100vw"
                    priority={false}
                    onLoad={handleImageLoad}
                  />
                </div>
              </div>
              <figcaption className={styles.caption}>
                Spec-driven · Human-gated · Production-ready
              </figcaption>
            </figure>
          </div>

          {/* stats strip */}
          <ul className={`${styles.stats} fx`} data-stats aria-label="Deuvix AI Factory by the numbers">
            {stats.map((stat) => (
              <li key={stat.label} className={styles.stat}>
                <p className={styles.statValue}>
                  <span data-count={stat.target}>{stat.target}</span>
                  <span className={styles.statSuffix}>{stat.suffix}</span>
                </p>
                <p className={styles.statLabel}>{stat.label}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ 3 · OUR VALUES ============ */}
      <section className={styles.section} aria-labelledby="our-values-title">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={`${styles.eyebrow} fx`}>02 · What we stand for</p>
            <h2 id="our-values-title" className={`${styles.aboutH2} fx`}>
              Our <span className="text-gradient">Values</span>.
            </h2>
          </div>

          <ol className={styles.values}>
            {values.map((value) => (
              <li key={value.title} className={`${styles.valueRow} fx`}>
                <span className={styles.valueNumeral} aria-hidden="true">
                  {value.numeral}
                </span>
                <h3 className={styles.valueTitle}>{value.title}</h3>
                <p className={styles.valueDesc}>{value.description}</p>
                <span className={styles.valueUnderline} aria-hidden="true" />
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============ 4 · LEADERSHIP ============ */}
      <section className={styles.section} aria-labelledby="leadership-title">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={`${styles.eyebrow} fx`}>03 · The minds behind it</p>
            <h2 id="leadership-title" className={`${styles.aboutH2} fx`}>
              <span className="text-gradient">Leadership</span>.
            </h2>
          </div>

          <div className={styles.leaders}>
            {leaders.map((leader) => (
              <figure key={leader.name} className={styles.leader}>
                <div
                  className={`${styles.leaderMedia} js-portrait`}
                  data-portrait
                >
                  <div className={`${styles.leaderImg} js-parallax`}>
                    <Image
                      src={leader.src}
                      alt={leader.alt}
                      fill
                      sizes="(min-width: 900px) 44vw, 100vw"
                      onLoad={handleImageLoad}
                    />
                  </div>
                  <span className={styles.leaderTag}>{leader.name}</span>
                </div>

                <div className={`${styles.leaderText} fx`}>
                  <p className={styles.leaderEyebrow}>
                    {leader.index} — {leader.role}
                  </p>
                  <h3 className={styles.leaderName}>{leader.name}</h3>
                  <p className={styles.leaderRole}>{leader.role}</p>
                  <p className={styles.leaderBio}>{leader.description}</p>
                  <ul className={styles.leaderLinks}>
                    <li>
                      <a
                        className={styles.leaderLink}
                        href={leader.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${leader.name} on LinkedIn`}
                      >
                        {linkedinGlyph}
                        LinkedIn
                        <ArrowUpRight size={13} strokeWidth={2} aria-hidden="true" />
                      </a>
                    </li>
                    <li>
                      <a
                        className={styles.leaderLink}
                        href={`mailto:${company.businessEmail}`}
                        aria-label={`Email ${leader.name} at ${company.businessEmail}`}
                      >
                        <Mail size={15} strokeWidth={2} aria-hidden="true" />
                        {company.businessEmail}
                      </a>
                    </li>
                  </ul>
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 5 · OUR JOURNEY — THE GROWING TREE ============ */}
      <section className={styles.journey} aria-labelledby="our-journey-title">
        <div className={styles.treeWrap}>
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>04 · 2022 — 2026</p>
            <h2 id="our-journey-title" className={styles.aboutH2}>
              Our <span className="text-gradient">Journey</span>.
            </h2>
          </div>

          <div className={styles.tree} ref={treeRef}>
            <div className={styles.trunk} ref={trunkRef} aria-hidden="true" />
            <ol className={styles.treeList}>
            {journey.map((chapter) => (
              <li key={chapter.year} className={styles.treeRow}>
                <span className={`${styles.branch} js-branch`} aria-hidden="true" />
                <span className={`${styles.leaf} js-leaf`} aria-hidden="true">
                  <svg viewBox="0 0 24 24" className={styles.leafSvg} focusable="false">
                    <path
                      d="M12 1.8C7.4 6.9 4.6 11.6 12 22.2C19.4 11.6 16.6 6.9 12 1.8Z"
                      fill="currentColor"
                    />
                    <path
                      d="M12 5.2V18.4"
                      stroke="var(--panel)"
                      strokeWidth="1.1"
                      strokeLinecap="round"
                      opacity="0.65"
                    />
                  </svg>
                </span>
                <div className={`${styles.chapter} fx`}>
                  <p className={styles.year}>{chapter.year}</p>
                  <h3 className={styles.chapterTitle}>{chapter.title}</h3>
                  <p className={styles.chapterText}>{chapter.description}</p>
                </div>
              </li>
            ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ============ 6 · CLOSING CTA ============ */}
      <section className={styles.cta} aria-labelledby="cta-title">
        <div className={styles.ctaRule} aria-hidden="true">
          <span className={styles.ctaRuleDiamond} />
        </div>
        <div className={styles.ctaInner}>
          <p className={`${styles.eyebrow} fx`}>The Next Unit</p>
          <h2 id="cta-title" className={`${styles.aboutH2} fx`}>
            Let&rsquo;s build your <span className="text-gradient">AI workforce</span>, unit by unit.
          </h2>
          <p className={`${styles.ctaSub} fx`}>
            From the first agent to a full digital workforce — every deployment starts with a
            single conversation.
          </p>
          <div className={`${styles.ctaRow} fx`}>
            <Link href="/book-a-call" className={`${styles.btn} ${styles.btnSolid}`}>
              Book a Call
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </Link>
            <Link href="/projects" className={`${styles.btn} ${styles.btnGhost}`}>
              See Our Work
              <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
          <p className={`${styles.companyInfo} fx`}>
            Curious how the company is run?{" "}
            <Link href="/company-information">Company Information</Link>
          </p>
        </div>
      </section>
    </article>
  );
}
