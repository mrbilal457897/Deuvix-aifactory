import type { Metadata } from "next";
import { Roboto, Raleway } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import { LayoutShell } from "@/components/layout-shell";
import { LoadingSplash } from "@/components/loading-splash";
import "./globals.css";

const roboto = Roboto({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

const raleway = Raleway({
  weight: ["300", "600", "700"],
  subsets: ["latin"],
  variable: "--font-raleway",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Deux - Intelligent Solutions for Tomorrow",
  description:
    "Deux delivers enterprise AI solutions that transform businesses. From intelligent automation to predictive analytics.",
  keywords: ["AI", "artificial intelligence", "machine learning", "automation", "tech company"],
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
        {/* Apply theme before first paint to prevent FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=document.documentElement;var t=localStorage.getItem("theme");if(t==="light"){s.classList.remove("dark")}else if(t==="dark"){s.classList.add("dark")}else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches){s.classList.add("dark")}else{s.classList.remove("dark")}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${roboto.variable} ${raleway.variable} min-h-full flex flex-col bg-background font-sans antialiased`}>
        <LoadingSplash />
        <Providers>
          <ThemeProvider>
            <LayoutShell>{children}</LayoutShell>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
