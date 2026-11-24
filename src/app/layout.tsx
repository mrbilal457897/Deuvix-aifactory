import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import { LayoutShell } from "@/components/layout-shell";
import { BookCallProvider } from "@/components/book-call-provider";
import { LoadingSplash } from "@/components/loading-splash";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, OG_IMAGE_ABSOLUTE } from "@/lib/seo";
import { homeJsonLd } from "@/lib/json-ld";
import { JsonLd } from "@/lib/jsonld";
import { listPublishedProjects } from "@/lib/projects";
import { WebMcpTools } from "@/components/WebMcpTools";
import "./globals.css";
import Script from "next/script";

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
    { path: "../../public/fonts/raleway-500.woff2", weight: "500", style: "normal" },
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
    default: `${SITE_NAME} | FDE, Digital FTEs & AI Agents`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/images/favicon-16.png?v=2", sizes: "16x16", type: "image/png" },
      { url: "/images/favicon-32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/images/favicon-48.png?v=2", sizes: "48x48", type: "image/png" },
      { url: "/images/favicon-96.png?v=2", sizes: "96x96", type: "image/png" },
      { url: "/images/tab.png?v=2", sizes: "any", type: "image/png" },
    ],
    apple: [{ url: "/images/icon.png", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} | FDE, Digital FTEs & AI Agents`,
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
    title: `${SITE_NAME} | FDE, Digital FTEs & AI Agents`,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_ABSOLUTE],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Same public data source the /projects page uses, passed to the WebMCP tools.
  const projects = (await listPublishedProjects()).map(({ name, slug, description }) => ({
    name,
    slug,
    description,
  }));

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        {/* Site icon used by browsers and Google search results */}
        <link rel="icon" href="/images/tab.png?v=2" sizes="any" type="image/png" />
        {/* Fonts are self-hosted through next/font; no duplicate preload needed.
            Supabase images go through /_next/image, so no direct preconnect. */}
        {/* Apply theme before first paint to prevent FOUC */}
        <Script strategy="beforeInteractive">
          {`(function(){try{var s=document.documentElement;var t=localStorage.getItem("theme");if(t==="light"){s.classList.remove("dark")}else if(t==="dark"){s.classList.add("dark")}else{s.classList.remove("dark")}}catch(e){}})();`}
        </Script>
        {/* Flash-of-unstyled-logo guard — mirrors the theme script. Adds .logo-intro only on first visit of the session. */}
        <Script strategy="afterInteractive">
          {`try{if(!sessionStorage.getItem("dx-logo-intro")&&!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("logo-intro")}catch(e){}`}
        </Script>
        {/* Site-wide structured data — server-rendered so crawlers see it in the raw HTML. */}
        <JsonLd data={homeJsonLd} />
      </head>
      <body className={`${roboto.variable} ${raleway.variable} ${spaceGrotesk.variable} ${inter.variable} min-h-full flex flex-col bg-background font-sans antialiased`}>
        <WebMcpTools projects={projects} />
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
