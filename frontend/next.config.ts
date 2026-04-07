import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
