import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

async function headersFor(source: string) {
  const rules = (await nextConfig.headers?.()) ?? [];
  return rules.filter((rule) => rule.source === source).flatMap((rule) => rule.headers);
}

describe("보안 응답 헤더 설정", () => {
  it("모든 경로에 프레임 삽입·형식 추측 방지와 권한 제한을 적용한다", async () => {
    const headers = await headersFor("/:path*");
    const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]));

    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["Permissions-Policy"]).toContain("camera=()");
    expect(byKey["Permissions-Policy"]).toContain("microphone=()");
    expect(byKey["Permissions-Policy"]).toContain("geolocation=()");
  });

  it("강제 CSP는 위반을 증명한 지시어만 담는다", async () => {
    const headers = await headersFor("/:path*");
    const enforced = headers.find((h) => h.key === "Content-Security-Policy")?.value;

    expect(enforced).toBe("frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
    expect(enforced).not.toContain("script-src");
  });

  it("토큰 링크 경로는 리퍼러를 보내지 않는 규칙이 전역 규칙 뒤에 와서 우선한다", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const globalIndex = rules.findIndex((rule) => rule.source === "/:path*");
    const tokenIndex = rules.findIndex((rule) => rule.source === "/billing/card/result");

    expect(globalIndex).toBeGreaterThanOrEqual(0);
    expect(tokenIndex).toBeGreaterThan(globalIndex);
    expect(rules[tokenIndex]?.headers.find((h) => h.key === "Referrer-Policy")?.value).toBe(
      "no-referrer",
    );
  });
});
