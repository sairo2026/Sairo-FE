import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "./proxy";

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

describe("서비스 첫 화면 프록시", () => {
  const sessionCookie = { headers: { cookie: "__Host-sairo_session=opaque" } };

  it("출시 준비 모드에서는 첫 화면 경로를 안내 페이지로 연결한다", () => {
    vi.stubEnv("COMING_SOON", "true");
    const response = proxy(new NextRequest("https://app.sairo.agency/", sessionCookie));
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://app.sairo.agency/coming-soon",
    );
  });

  it("출시 준비 모드를 끄면 로그인하지 않은 방문자에게 첫 화면을 그대로 보여준다", () => {
    vi.stubEnv("COMING_SOON", "false");
    const response = proxy(new NextRequest("https://app.sairo.agency/"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
  });

  it("출시 준비 모드를 끄면 로그인 세션이 있는 방문자를 업무 홈으로 보낸다", () => {
    vi.stubEnv("COMING_SOON", "false");
    const response = proxy(new NextRequest("https://app.sairo.agency/", sessionCookie));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://app.sairo.agency/home");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("로그인 세션이 있어도 첫 화면이 아닌 경로는 옮기지 않는다", () => {
    vi.stubEnv("COMING_SOON", "false");
    const response = proxy(new NextRequest("https://app.sairo.agency/pricing", sessionCookie));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("운영자 세션만 있는 방문자는 첫 화면에 머문다", () => {
    vi.stubEnv("COMING_SOON", "false");
    const response = proxy(
      new NextRequest("https://app.sairo.agency/", {
        headers: { cookie: "__Host-sairo_ops_session=opaque" },
      }),
    );
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("심사 모드에서는 첫 화면과 업무 홈을 열고 로그인 세션이 있으면 업무 홈으로 보낸다", () => {
    vi.stubEnv("COMING_SOON", "true");
    vi.stubEnv("REVIEW_MODE", "true");
    const landing = proxy(new NextRequest("https://app.sairo.agency/"));
    expect(landing.headers.get("x-middleware-next")).toBe("1");
    const home = proxy(new NextRequest("https://app.sairo.agency/home"));
    expect(home.headers.get("x-middleware-next")).toBe("1");
    const signedIn = proxy(new NextRequest("https://app.sairo.agency/", sessionCookie));
    expect(signedIn.headers.get("location")).toBe("https://app.sairo.agency/home");
  });
});

describe("엣지 토큰 헤더", () => {
  const overridden = (response: Response, name: string) =>
    response.headers.get(`x-middleware-request-${name}`);

  it("토큰이 설정되면 API 요청에 붙인다", () => {
    vi.stubEnv("COMING_SOON", "false");
    vi.stubEnv("SAIRO_EDGE_TOKEN", "test-token");
    const response = proxy(new NextRequest("https://app.sairo.agency/api/terms"));
    expect(overridden(response, "x-sairo-edge-token")).toBe("test-token");
  });

  it("클라이언트가 보낸 같은 이름의 헤더는 버린다", () => {
    vi.stubEnv("COMING_SOON", "false");
    vi.stubEnv("SAIRO_EDGE_TOKEN", "");
    const response = proxy(
      new NextRequest("https://app.sairo.agency/api/terms", {
        headers: { "x-sairo-edge-token": "forged" },
      }),
    );
    expect(overridden(response, "x-sairo-edge-token")).toBeNull();
    expect(response.headers.get("x-middleware-override-headers") ?? "").not.toContain(
      "x-sairo-edge-token",
    );
  });

  it("API가 아닌 경로에는 붙이지 않는다", () => {
    vi.stubEnv("COMING_SOON", "false");
    vi.stubEnv("SAIRO_EDGE_TOKEN", "test-token");
    const response = proxy(new NextRequest("https://app.sairo.agency/pricing"));
    expect(overridden(response, "x-sairo-edge-token")).toBeNull();
  });
});

describe("프록시 적용 범위", () => {
  it("메일 로고 같은 공개 정적 파일 경로는 프록시를 거치지 않는다", () => {
    const pattern = new RegExp(`^${config.matcher[0]}$`);
    expect(pattern.test("/email/sairo-logo.png")).toBe(false);
    expect(pattern.test("/brand/sairo-logo-horizontal.png")).toBe(false);
    expect(pattern.test("/properties")).toBe(true);
  });
});
