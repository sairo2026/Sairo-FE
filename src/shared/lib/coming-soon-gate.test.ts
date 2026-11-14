import { describe, expect, it } from "vitest";
import {
  isComingSoonMode,
  isGateOpenPath,
  isReviewMode,
  shouldSendToWorkHome,
} from "./coming-soon-gate";

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

describe("수신 거부 링크", () => {
  it("로그인 없이 열리는 화면과 처리 API를 연다", () => {
    expect(isGateOpenPath("/unsubscribe", "GET")).toBe(true);
    expect(isGateOpenPath("/api/public/marketing-unsubscribe", "POST")).toBe(true);
  });

  it("처리 API의 다른 메서드와 비슷한 경로는 열지 않는다", () => {
    expect(isGateOpenPath("/api/public/marketing-unsubscribe", "GET")).toBe(false);
    expect(isGateOpenPath("/unsubscribe/extra", "GET")).toBe(false);
  });
});

describe("심사 모드", () => {
  const review = { REVIEW_MODE: "true" };

  it("기본값은 꺼져 있고 true일 때만 켜진다", () => {
    expect(isReviewMode({})).toBe(false);
    expect(isReviewMode({ REVIEW_MODE: "false" })).toBe(false);
    expect(isReviewMode({ REVIEW_MODE: "1" })).toBe(false);
    expect(isReviewMode(review)).toBe(true);
  });

  it("심사 모드가 아니면 결제 흐름 경로를 계속 막는다", () => {
    expect(isGateOpenPath("/login", "GET", {})).toBe(false);
    expect(isGateOpenPath("/billing/card", "GET", {})).toBe(false);
    expect(isGateOpenPath("/api/auth/login", "POST", {})).toBe(false);
  });

  it.each([
    "/",
    "/login",
    "/login/email",
    "/signup",
    "/signup/email",
    "/office/register",
    "/billing",
    "/billing/card",
    "/billing/card/result",
    "/billing/consent",
    "/billing/invoices/12",
    "/billing/refunds",
    "/support",
    "/support/new",
    "/pricing",
    "/legal/refund-policy",
  ])("심사 모드에서 %s를 연다", (pathname) => {
    expect(isGateOpenPath(pathname, "GET", review)).toBe(true);
  });

  it("심사 모드에서 로그인과 결제 호출 API를 연다", () => {
    expect(isGateOpenPath("/api/auth/login", "POST", review)).toBe(true);
    expect(isGateOpenPath("/api/subscriptions/billing-key", "POST", review)).toBe(true);
  });

  it.each(["/properties", "/customers", "/contracts", "/ops", "/loginx", "/billingx"])(
    "심사 모드에서도 업무 화면 %s는 막는다",
    (pathname) => {
      expect(isGateOpenPath(pathname, "GET", review)).toBe(false);
    },
  );
});

describe("첫 화면에서 업무 홈으로 보내는 조건", () => {
  it("첫 화면 경로이고 회원 세션이 있을 때만 참이다", () => {
    expect(shouldSendToWorkHome("/", true)).toBe(true);
    expect(shouldSendToWorkHome("/", false)).toBe(false);
    expect(shouldSendToWorkHome("/home", true)).toBe(false);
    expect(shouldSendToWorkHome("/pricing", true)).toBe(false);
  });
});
