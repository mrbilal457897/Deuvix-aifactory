import type { NextConfig } from "next";

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
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "image.thum.io" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "sirxcjnszsumwnjhizrz.supabase.co" },
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

export default nextConfig;
