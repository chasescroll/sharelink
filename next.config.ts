import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true, // if you have TypeScript errors too
  },
  /* config options here */
  experimental: {
    optimizePackageImports: ['@chakra-ui/react']
  }
};

export default nextConfig;
