import type { NextConfig } from "next";

const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_PROXY_TARGET}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/visit-responses/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
