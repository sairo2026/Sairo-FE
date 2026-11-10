import type { NextConfig } from "next";

const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  turbopack: {
    // msw/browser는 node 조건에서 막혀 있어 서버 번들 분석이 실패한다. 브라우저에서만 실행되므로 파일로 직접 가리킨다.
    resolveAlias: { "msw/browser": "./node_modules/msw/lib/browser/index.js" },
  },
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
