import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't leak the framework in responses.
  poweredByHeader: false,
  // The floating "N" dev-tools badge (bottom-left) sits above every fixed
  // UI element incl. our own mobile BottomNav — turn it off. Next.js already
  // strips dev indicators from production builds on its own, but disabling
  // it here means it never shows up locally either, matching what prod
  // actually renders.
  devIndicators: false,
};

export default nextConfig;
