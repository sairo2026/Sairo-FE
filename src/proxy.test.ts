import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

afterEach(() => vi.unstubAllEnvs());

describe("출시 준비 프록시", () => {
  it("운영 서비스 경로를 안내 페이지로 연결한다", () => {
    vi.stubEnv("COMING_SOON", "true");
    const response = proxy(new NextRequest("https://app.sairo.agency/properties"));
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://app.sairo.agency/coming-soon",
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("안내 페이지 자체는 재작성하지 않아 요청이 반복되지 않는다", () => {
    vi.stubEnv("COMING_SOON", "true");
    const response = proxy(new NextRequest("https://app.sairo.agency/coming-soon"));
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it.each(["/api", "/api/home"])("%s 요청을 캐시 없이 차단한다", (pathname) => {
    vi.stubEnv("COMING_SOON", "true");
    const response = proxy(new NextRequest(`https://app.sairo.agency${pathname}`));
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it.each(["/pricing", "/legal", "/legal/terms", "/legal/policies/TERMS/1.0"])(
    "공개 경로 %s는 출시 준비 모드에서도 연다",
    (pathname) => {
      vi.stubEnv("COMING_SOON", "true");
      const response = proxy(new NextRequest(`https://app.sairo.agency${pathname}`));
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
      expect(response.headers.get("x-middleware-next")).toBe("1");
    },
  );

  it.each(["/api/public/pricing", "/api/public/company-info"])(
    "공개 조회 %s는 GET만 연다",
    (pathname) => {
      vi.stubEnv("COMING_SOON", "true");
      const opened = proxy(new NextRequest(`https://app.sairo.agency${pathname}`));
      expect(opened.headers.get("x-middleware-next")).toBe("1");
      const blocked = proxy(
        new NextRequest(`https://app.sairo.agency${pathname}`, { method: "POST" }),
      );
      expect(blocked.status).toBe(503);
    },
  );

  it.each(["/legalx", "/pricing/extra", "/api/public/other", "/api/terms", "/billing/consent"])(
    "예외가 아닌 경로 %s는 계속 막는다",
    (pathname) => {
      vi.stubEnv("COMING_SOON", "true");
      const response = proxy(new NextRequest(`https://app.sairo.agency${pathname}`));
      const isApi = pathname.startsWith("/api");
      if (isApi) expect(response.status).toBe(503);
      else
        expect(response.headers.get("x-middleware-rewrite")).toBe(
          "https://app.sairo.agency/coming-soon",
        );
    },
  );

  it("출시 준비 모드를 끄면 원래 경로를 처리한다", () => {
    vi.stubEnv("COMING_SOON", "false");
    const response = proxy(new NextRequest("https://app.sairo.agency/properties"));
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});

describe("심사 모드 프록시", () => {
  it("심사 모드에서는 결제 흐름 경로와 API를 연다", () => {
    vi.stubEnv("COMING_SOON", "true");
    vi.stubEnv("REVIEW_MODE", "true");
    const page = proxy(new NextRequest("https://app.sairo.agency/billing/card"));
    expect(page.headers.get("x-middleware-rewrite")).toBeNull();
    const api = proxy(
      new NextRequest("https://app.sairo.agency/api/auth/login", { method: "POST" }),
    );
    expect(api.status).not.toBe(503);
  });

  it("심사 모드에서도 업무 화면은 안내 페이지로 연결한다", () => {
    vi.stubEnv("COMING_SOON", "true");
    vi.stubEnv("REVIEW_MODE", "true");
    const response = proxy(new NextRequest("https://app.sairo.agency/properties"));
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://app.sairo.agency/coming-soon",
    );
  });

  it("심사 모드 변수가 없으면 결제 흐름 경로를 막는다", () => {
    vi.stubEnv("COMING_SOON", "true");
    const response = proxy(new NextRequest("https://app.sairo.agency/billing/card"));
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://app.sairo.agency/coming-soon",
    );
  });
});
