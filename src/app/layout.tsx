import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import { LayoutShell } from "@/components/layout-shell";
import { BookCallProvider } from "@/components/book-call-provider";
import { LoadingSplash } from "@/components/loading-splash";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_KEYWORDS, OG_IMAGE_ABSOLUTE, organizationJsonLd } from "@/lib/seo";
import "./globals.css";

const roboto = localFont({
  src: [
    { path: "../../public/fonts/roboto-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/roboto-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-roboto",
  display: "swap",
});

const raleway = localFont({
  src: [
    { path: "../../public/fonts/raleway-200.woff2", weight: "200", style: "normal" },
    { path: "../../public/fonts/raleway-300.woff2", weight: "300", style: "normal" },
    { path: "../../public/fonts/raleway-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/raleway-500.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/raleway-600.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/raleway-700.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/raleway-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-raleway",
  display: "swap",
});

const spaceGrotesk = localFont({
  src: [
    { path: "../../public/fonts/space-grotesk-500.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/space-grotesk-600.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/space-grotesk-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = localFont({
  src: [
    { path: "../../public/fonts/inter-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/inter-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Digital FTEs & AI Agents`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Digital FTEs & AI Agents`,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [
      {
        url: OG_IMAGE_ABSOLUTE,
        width: 1920,
        height: 1080,
        alt: `${SITE_NAME}`,
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Digital FTEs & AI Agents`,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_ABSOLUTE],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        {/* Black logo needs an inverted variant where the browser UI is dark */}
        <link
          rel="icon"
          href="/favicon-dark.ico"
          sizes="any"
          media="(prefers-color-scheme: dark)"
        />
        {/* Apply theme before first paint to prevent FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=document.documentElement;var t=localStorage.getItem("theme");if(t==="light"){s.classList.remove("dark")}else if(t==="dark"){s.classList.add("dark")}else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches){s.classList.add("dark")}else{s.classList.remove("dark")}}catch(e){}})();`,
          }}
        />
        {/* Flash-of-unstyled-logo guard — mirrors the theme script. Adds .logo-intro only on first visit of the session. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(!sessionStorage.getItem("dx-logo-intro")&&!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("logo-intro")}catch(e){}`,
          }}
        />
        {/* Organization schema generated from config/company.ts */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
      </head>
      <body className={`${roboto.variable} ${raleway.variable} ${spaceGrotesk.variable} ${inter.variable} min-h-full flex flex-col bg-background font-sans antialiased`}>
        <LoadingSplash />
        <Providers>
          <ThemeProvider>
            <BookCallProvider>
              <LayoutShell>{children}</LayoutShell>
            </BookCallProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
