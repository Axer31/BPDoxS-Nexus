import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  
  experimental: {
    serverActions: {
      allowedOrigins: ["192.168.1.15", "localhost:3000", "127.0.0.1", "192.168.1.7"] 
    }
  },

  // PROXY CONFIGURATION
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*', // Proxy API requests
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:5000/uploads/:path*', // Proxy Image requests to Backend
      },
    ];
  },
};

export default nextConfig;
