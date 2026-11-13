import type { NextConfig } from "next";

const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8080";

const IS_API_MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

const TOKEN_LINK_PATHS = [
  "/signup/verify-email",
  "/password/reset",
  "/unsubscribe",
  "/settings/login-methods/verify-email",
  "/settings/login-methods/kakao-callback",
  "/settings/contact/verify-email",
];

const nextConfig: NextConfig = {
  turbopack: {
    // msw/browser는 node 조건에서 막혀 있어 서버 번들 분석이 실패한다. 브라우저에서만 실행되므로 파일로 직접 가리킨다.
    resolveAlias: {
      "msw/browser": "./node_modules/msw/lib/browser/index.js",
      ...(IS_API_MOCKING ? {} : { "@/mocks/browser": "./src/mocks/browser-disabled.ts" }),
    },
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_PROXY_TARGET}/api/:path*` }];
  },
  async headers() {
    const noReferrerHeaders = [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "no-store" },
    ];
    return [
      { source: "/visit-responses/:path*", headers: noReferrerHeaders },
      ...TOKEN_LINK_PATHS.map((source) => ({ source, headers: noReferrerHeaders })),
    ];
  },
};

export default nextConfig;
