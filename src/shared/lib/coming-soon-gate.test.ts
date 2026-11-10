import { describe, expect, it } from "vitest";
import { isComingSoonMode, isGateOpenPath } from "./coming-soon-gate";

describe("isComingSoonMode", () => {
  it("운영 배포에서는 플래그가 없어도 켜진다", () => {
    expect(isComingSoonMode({ VERCEL_ENV: "production" })).toBe(true);
  });

  it("미리보기 배포와 로컬에서는 꺼진다", () => {
    expect(isComingSoonMode({ VERCEL_ENV: "preview" })).toBe(false);
    expect(isComingSoonMode({})).toBe(false);
  });

  it("COMING_SOON이 true면 어느 환경에서든 켜진다", () => {
    expect(isComingSoonMode({ COMING_SOON: "true" })).toBe(true);
    expect(isComingSoonMode({ COMING_SOON: "true", VERCEL_ENV: "preview" })).toBe(true);
  });

  it("COMING_SOON이 false면 운영 배포에서도 꺼진다", () => {
    expect(isComingSoonMode({ COMING_SOON: "false", VERCEL_ENV: "production" })).toBe(false);
  });
});

describe("isGateOpenPath", () => {
  it("요금 안내와 약관 경로는 연다", () => {
    expect(isGateOpenPath("/pricing", "GET")).toBe(true);
    expect(isGateOpenPath("/legal", "GET")).toBe(true);
    expect(isGateOpenPath("/legal/terms", "GET")).toBe(true);
    expect(isGateOpenPath("/legal/policies/REFUND/1.0", "GET")).toBe(true);
  });

  it("이름이 비슷한 다른 경로는 열지 않는다", () => {
    expect(isGateOpenPath("/legalx", "GET")).toBe(false);
    expect(isGateOpenPath("/pricing/extra", "GET")).toBe(false);
    expect(isGateOpenPath("/billing/plans", "GET")).toBe(false);
  });

  it("공개 조회 API는 GET만 연다", () => {
    expect(isGateOpenPath("/api/public/pricing", "GET")).toBe(true);
    expect(isGateOpenPath("/api/public/company-info", "GET")).toBe(true);
    expect(isGateOpenPath("/api/public/company-info", "POST")).toBe(false);
    expect(isGateOpenPath("/api/terms", "GET")).toBe(false);
  });
});
