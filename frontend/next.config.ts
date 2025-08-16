import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignore ESLint errors during `next build` so CI/CD is not blocked.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
