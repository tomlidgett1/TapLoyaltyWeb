import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // This tells Next.js to ignore ESLint errors during builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
