import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy : toutes les requetes API transitent par le serveur Next.js (meme origine)
  // elimine les problemes CORS et cookies cross-origin en dev
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";
    return [
      {
        source: "/api-backend/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
  allowedDevOrigins: ["192.168.1.30"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "files.cdn.printful.com" },
      { protocol: "https", hostname: "*.cdn.printful.com" },
      { protocol: "https", hostname: "ucarecdn.com" },
      { protocol: "https", hostname: "*.s3-accelerate.amazonaws.com" },
      { protocol: "https", hostname: "*.s3.amazonaws.com" },
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "192.168.1.30", port: "8000" },
    ],
  },
};

export default nextConfig;
