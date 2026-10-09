import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables forbidden()/unauthorized() interrupts + app/forbidden.tsx (E32 403).
  experimental: {
    authInterrupts: true,
  },
  images: {
    // Listing photos are mockup placeholders served from Unsplash (docs/08:
    // production replaces them with real user uploads).
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
