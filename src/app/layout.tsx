import type { Metadata } from "next";
import { Roboto, Raleway } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import { LayoutShell } from "@/components/layout-shell";
import { BookCallProvider } from "@/components/book-call-provider";
import { LoadingSplash } from "@/components/loading-splash";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_KEYWORDS, OG_IMAGE, organizationJsonLd } from "@/lib/seo";
import "./globals.css";

const roboto = Roboto({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

const raleway = Raleway({
  weight: ["200", "300", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-raleway",
  display: "swap",
});

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
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Digital FTEs & AI Agents`,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [
      {
        url: OG_IMAGE,
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
    images: [OG_IMAGE],
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
        {/* Organization schema generated from config/company.ts */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
      </head>
      <body className={`${roboto.variable} ${raleway.variable} min-h-full flex flex-col bg-background font-sans antialiased`}>
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
