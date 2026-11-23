import type { NextConfig } from "next";
import { BASELINE_CONTENT_SECURITY_POLICY } from "./src/shared/lib/csp";

const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8080";

const IS_API_MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

const PERMISSIONS_POLICY = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "usb=()",
  "bluetooth=()",
  "serial=()",
  "hid=()",
].join(", ");

const BASE_SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
];

const STATIC_PATHS = ["/_next/static/:path*", "/brand/:path*", "/email/:path*"];

const TOKEN_LINK_PATHS = [
  "/billing/card/result",
  "/ops/invitations/accept",
  "/signup/verify-email",
  "/password/reset",
  "/unsubscribe",
  "/settings/login-methods/verify-email",
  "/settings/login-methods/kakao-callback",
  "/auth/kakao/step-up/callback",
  "/grant/verify",
  "/settings/contact/verify-email",
];

const nextConfig: NextConfig = {
  turbopack: {
    // msw/browser는 node 조건에서 막혀 있어 서버 번들 분석이 실패한다. 브라우저에서만 실행되므로 파일로 직접 가리킨다.
    resolveAlias: {
      // 스키마 생성 전에 zod의 new Function 탐지를 꺼서 엄격한 CSP에서 eval 위반이 나지 않게 한다.
      zod: "./src/shared/lib/zod-entry.ts",
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
      { source: "/:path*", headers: BASE_SECURITY_HEADERS },
      // 프록시가 CSP를 붙이는 경로 밖의 정적 파일에는 최소 기준선만 붙인다.
      ...STATIC_PATHS.map((source) => ({
        source,
        headers: [{ key: "Content-Security-Policy", value: BASELINE_CONTENT_SECURITY_POLICY }],
      })),
      { source: "/visit-responses/:path*", headers: noReferrerHeaders },
      ...TOKEN_LINK_PATHS.map((source) => ({ source, headers: noReferrerHeaders })),
    ];
  },
};

export default nextConfig;
