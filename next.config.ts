import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle so the Docker runner stage does not
  // need node_modules. See Dockerfile.
  output: "standalone",

  images: {
    // An aggregator cannot enumerate its image hosts ahead of time: NewsAPI
    // alone spans tens of thousands of publishers, each on its own CDN. So the
    // hostname is left open and the surface is narrowed in the other
    // dimensions instead — HTTPS only, a fixed set of output formats, and a
    // capped size list, which is what actually bounds the optimiser's work.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 640, 828, 1080, 1280, 1920],
    imageSizes: [96, 128, 224, 320],
    minimumCacheTTL: 3600,
  },
};

export default nextConfig;
