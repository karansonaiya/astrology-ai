import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't leak the framework in responses.
  poweredByHeader: false,
};

export default nextConfig;
