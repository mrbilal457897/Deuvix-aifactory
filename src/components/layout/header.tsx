"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Trophy } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Services" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-200",
        isScrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center group">
            <BrandLogo size="sm" />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150",
                  pathname === link.href
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <Tooltip>
              <TooltipTrigger
                render={
                  <a
                    href="https://arena.ai/leaderboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="size-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-300"
                    aria-label="Open leaderboard"
                  >
                    <Trophy className="size-4.5" />
                  </a>
                }
              />
              <TooltipContent>Leaderboard</TooltipContent>
            </Tooltip>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-4 h-9">
              Get Started
            </Button>
          </div>

          <button
            className="md:hidden size-11 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label={isMobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setIsMobileOpen(!isMobileOpen)}
          >
            {isMobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {isMobileOpen && (
        <div className="md:hidden bg-background border-b border-border shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "block px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-primary/5 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 flex items-center gap-2">
              <ThemeToggle />
              <Tooltip>
                <TooltipTrigger
                  render={
                    <a
                      href="https://arena.ai/leaderboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="size-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-300"
                      aria-label="Open leaderboard"
                      onClick={() => setIsMobileOpen(false)}
                    >
                      <Trophy className="size-4.5" />
                    </a>
                  }
                />
                <TooltipContent>Leaderboard</TooltipContent>
              </Tooltip>
              <Button className="flex-1 h-11 bg-primary text-primary-foreground font-medium">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
