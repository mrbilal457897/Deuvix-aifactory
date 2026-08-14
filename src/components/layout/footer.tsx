"use client";

import Link from "next/link";
import { ExternalLink, MessageSquare, Users, Mail, ChevronRight } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

const footerLinks = {
  Product: [
    { label: "Features", href: "/products" },
    { label: "Pricing", href: "/products#pricing" },
    { label: "Integrations", href: "/products" },
    { label: "Changelog", href: "/blog" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "API Reference", href: "#" },
    { label: "Community", href: "#" },
    { label: "Support", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
  ],
};

const socialLinks = [
  { icon: ExternalLink, href: "#", label: "GitHub" },
  { icon: MessageSquare, href: "#", label: "Twitter" },
  { icon: Users, href: "#", label: "LinkedIn" },
  { icon: Mail, href: "#", label: "Email" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 py-12 md:py-16">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <BrandLogo size="sm" />
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed">
              AI Agent Factory. We manufacture, deploy, and monetize
              Digital FTEs — the AI workers that run the next generation of enterprises.
            </p>
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex items-center justify-center size-11 md:size-9 rounded-lg bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-150"
                >
                  <social.icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-foreground mb-4">
                {category}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="footer-link text-sm text-muted-foreground hover:text-primary transition-all duration-300 inline-flex items-center gap-1.5 py-1"
                    >
                      <ChevronRight className="size-3 opacity-50" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Deux. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with Next.js, GSAP & AI
          </p>
        </div>
      </div>
    </footer>
  );
}
