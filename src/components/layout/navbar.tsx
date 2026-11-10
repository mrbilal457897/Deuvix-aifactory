"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LogoLockup } from "@/components/brand/LogoLockup";
import { DiscussButton } from "@/components/layout/discuss-button";
import styles from "./navbar.module.css";

/**
 * Floating glass navbar for the public site.
 *
 * A single horizontal bar with a pointer-events-safe background and an animated
 * link indicator. Admin/auth routes keep the document-flow header instead.
 */

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Services" },
  { href: "/projects", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
] as const;

function activeIndexFor(pathname: string): number {
  const normalised = pathname.replace(/\/+$/, "") || "/";
  const index = LINKS.findIndex((item) =>
    item.href === "/" ? normalised === "/" : normalised === item.href || normalised.startsWith(item.href + "/"),
  );
  return index === -1 ? 0 : index;
}

const panelTabOrder =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Navbar() {
  const pathname = usePathname();
  const activeIndex = activeIndexFor(pathname);

  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLUListElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const targetIndex = hoverIndex ?? activeIndex;

  const closeMenu = useCallback(() => {
    setOpen(false);
    setHoverIndex(null);
  }, []);

  const positionIndicator = useCallback(() => {
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    if (!nav || !indicator) return;

    const item = nav.querySelectorAll("li").item(targetIndex);
    if (!item) return;

    indicator.style.width = `${item.clientWidth}px`;
    indicator.style.transform = `translate3d(${item.offsetLeft}px, 0, 0)`;
  }, [targetIndex]);

  useLayoutEffect(() => {
    positionIndicator();
  }, [positionIndicator, pathname, scrolled]);

  useEffect(() => {
    const onResize = () => positionIndicator();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [positionIndicator]);

  useEffect(() => {
    const onPopState = () => closeMenu();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [closeMenu]);

  // Body scroll lock while the mobile panel is open
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY >= 12);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!headerRef.current) return;
      if (!headerRef.current.contains(event.target as Node)) setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(panelTabOrder))
        .filter((element) => !!element.offsetParent)
        .filter((element) => getComputedStyle(element).visibility !== "hidden");

      if (focusable.length === 0) {
        event.preventDefault();
        buttonRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (
        document.activeElement === panel ||
        (!event.shiftKey && document.activeElement === last) ||
        (event.shiftKey && document.activeElement === first)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };

    const onResize = () => {
      if (window.innerWidth >= 900) setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const toggleMenu = () => {
    setOpen((value) => {
      const next = !value;
      if (next && window.innerWidth < 900) {
        window.requestAnimationFrame(() => {
          const firstLink = panelRef.current?.querySelector<HTMLElement>("a[href], button");
          firstLink?.focus();
        });
      }
      return next;
    });
  };

  return (
    <header
      ref={headerRef}
      className={`${styles.header} navbar ${scrolled ? styles.scrolled : ""}`}
      aria-label="Primary navbar"
    >
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>

      <div className={styles.inner}>
        <div className={styles.logoLink}>
          <LogoLockup intro height={20} />
        </div>

        <nav className={styles.nav} aria-label="Primary">
          <ul
            ref={navRef}
            className={styles.navList}
            onMouseEnter={() => undefined}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <span
              ref={indicatorRef}
              className={`${styles.indicator} ${styles.ready}`}
              aria-hidden="true"
            />
            {LINKS.map((item, index) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={styles.navLink}
                  aria-current={activeIndex === index ? "page" : undefined}
                  onMouseEnter={() => setHoverIndex(index)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.desktopActions}>
          <div className={styles.themeToggle} aria-hidden="false">
            <ThemeToggle />
          </div>
          <DiscussButton variant="outline" size="sm" className="discussBar !rounded-full border-[#4299e1] dark:border-[#4299e1]" />
          <Link href="/book-a-call" className={styles.bookButton} aria-label="Book a Call">
            Book a Call
            <span className={styles.bookArrow} aria-hidden="true">→</span>
          </Link>
        </div>

        <Link
          href="/book-a-call"
          className={styles.mobileCta}
          aria-label="Book a Call"
        >
          Book a Call
        </Link>
        <button
          ref={buttonRef}
          type="button"
          className={`${styles.menuButton} btn-sharp`}
          aria-expanded={open}
          aria-controls="navbar-panel"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={toggleMenu}
        >
          <span className={styles.menuIcon} aria-hidden="true">
            <span />
            <span />
          </span>
        </button>
      </div>

      {open && (
        <div className={styles.panelShell}>
          <div
            id="navbar-panel"
            ref={panelRef}
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            tabIndex={-1}
          >
            {LINKS.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={styles.panelLink}
                aria-current={activeIndex === index ? "page" : undefined}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/contact" className={`${styles.panelDiscuss} btn-sharp`} onClick={closeMenu}>
              Discuss
              <span className={styles.bookArrow} aria-hidden="true">→</span>
            </Link>
            <div className={styles.divider} aria-hidden="true" />
            <Link href="/book-a-call" className={`${styles.panelButton} btn-sharp`} onClick={closeMenu}>
              Book a Call
              <span className={styles.bookArrow} aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
