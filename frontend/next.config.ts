import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  
  // ADD THIS SECTION:
  experimental: {
    serverActions: {
      allowedOrigins: ["192.168.1.15", "localhost:3000", "127.0.0.1", "192.168.1.7"] 
    }
  }
};

export default nextConfig;