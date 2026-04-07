import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.30"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "files.cdn.printful.com" },
      { protocol: "https", hostname: "*.cdn.printful.com" },
      { protocol: "https", hostname: "ucarecdn.com" },
    ],
  },
};

export default nextConfig;
