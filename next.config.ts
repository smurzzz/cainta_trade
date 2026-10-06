import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Listing photos are mockup placeholders served from Unsplash (docs/08:
    // production replaces them with real user uploads).
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
