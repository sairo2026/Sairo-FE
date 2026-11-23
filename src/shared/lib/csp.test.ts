import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, createNonce, cspHeaderName, resolveCspMode } from "./csp";

describe("콘텐츠 보안 정책", () => {
  it("요청마다 다른 nonce를 만든다", () => {
    expect(createNonce()).not.toBe(createNonce());
  });

  it("운영 정책은 인라인·eval 스크립트를 허용하지 않고 nonce와 strict-dynamic만 허용한다", () => {
    const policy = buildContentSecurityPolicy("abc", false);
    const script = policy.split("; ").find((d) => d.startsWith("script-src")) ?? "";
    expect(script).toContain("'nonce-abc'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("form-action 'self'");
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("개발 정책만 eval을 허용한다", () => {
    expect(buildContentSecurityPolicy("abc", true)).toContain("'unsafe-eval'");
  });

  it("모드에 따라 강제 또는 보고 전용 헤더를 고른다", () => {
    expect(resolveCspMode({})).toBe("enforce");
    expect(resolveCspMode({ CSP_MODE: "report-only" })).toBe("report-only");
    expect(cspHeaderName("enforce")).toBe("Content-Security-Policy");
    expect(cspHeaderName("report-only")).toBe("Content-Security-Policy-Report-Only");
  });
});
