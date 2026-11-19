import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // Required for the Docker image: emits .next/standalone with a self-contained
  // server and only the node_modules actually imported.
  output: "standalone",
  // Cal.com's embed script is loaded from your own instance at runtime; the
  // iframe it injects needs to be able to talk back to the opener.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Microphone stays for the Sara voice recorder (self only); everything else locked down.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=()",
          },
        ],
      },
      {
        // Admin dashboard + auth callbacks: never cached anywhere.
        source: "/deuvix/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, no-transform" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, no-transform" },
        ],
      },
      {
        source: "/api/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, no-transform" },
        ],
      },
      {
        // Per-user API routes stay no-store (public auth'd data).
        source: "/api/contacts",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/api/tickets/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/api/follow-ups",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/api/keep-alive",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      // Timestamped upload filenames (e.g. 1786824376990.jpg) are immutable — cache hard.
      {
        source: "/uploads/:path(\\d{10,}.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, immutable" },
        ],
      },
      // Stable, reused names (e.g. deuvix-poster.jpg) can change — 1 day + SWR.
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
  experimental: {
    // lucide-react is imported in dozens of components; this tree-shakes
    // per-component (icon-level) so only used icons end up in the bundle.
    optimizePackageImports: ["lucide-react", "gsap"],
  },
  images: {
    formats: ["image/webp"],
    // Optimized remote responses are held for 30 days — filenames in our
    // Supabase bucket are immutable content hashes/timestamps.
    minimumCacheTTL: 30 * 24 * 60 * 60,
    // Cap device sizes at 1920px — nothing on this site benefits from a
    // 3840px variant; it only inflates the optimized-image cache and the
    // largest download on the LCP path.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      // Public-facing site images (uploaded via the admin media library).
      { protocol: "https", hostname: "sirxcjnszsumwnjhizrz.supabase.co" },
      // Google profile photos for admin-only avatars (next-auth session.user.image).
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/projects/restoren",
        destination: "/projects/restoran",
        permanent: true,
      },
    ];
  },
};

// Wrap with Sentry config: source-map upload happens only when SENTRY_AUTH_TOKEN is set.
// All other Sentry options are intentionally left at defaults to avoid extra
// output files; Sentry init lives in sentry.*.config.ts.
export default withSentryConfig(nextConfig, {
  // Only upload source maps when an auth token is explicitly provided.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
