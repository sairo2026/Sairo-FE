import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";
import { RELEASE_CHECK_APIS, RELEASE_CHECK_GROUPS } from "./shared/lib/release-check-routes";
import type { GateExposure } from "./shared/lib/release-check-routes";

const ORIGIN = "https://sairo.example";
const pageFiles = Object.keys(import.meta.glob("/src/app/**/page.tsx"));

const routePatterns = pageFiles.map((file) => {
  const segments = file
    .replace(/^\/src\/app/, "")
    .replace(/\/page\.tsx$/, "")
    .split("/")
    .filter((segment) => segment !== "" && !/^\(.+\)$/.test(segment))
    .map((segment) =>
      /^\[.+\]$/.test(segment) ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );
  return new RegExp(`^/${segments.join("/")}$`);
});

function send(pathname: string, method = "GET", cookie?: string) {
  const headers = cookie ? { cookie } : undefined;
  return proxy(new NextRequest(`${ORIGIN}${pathname}`, { method, headers }));
}

function isPassed(pathname: string): boolean {
  const response = send(pathname);
  return (
    response.headers.get("x-middleware-next") === "1" &&
    response.headers.get("x-middleware-rewrite") === null
  );
}

function isSentToComingSoon(pathname: string): boolean {
  return send(pathname).headers.get("x-middleware-rewrite") === `${ORIGIN}/coming-soon`;
}

function routesOf(...exposures: GateExposure[]): string[] {
  return RELEASE_CHECK_GROUPS.filter((group) => exposures.includes(group.exposure)).flatMap(
    (group) => [...group.routes],
  );
}

const ALL_ROUTES = routesOf("always-open", "review-open", "blocked");

afterEach(() => vi.unstubAllEnvs());

describe("출시 안내 해제 점검 라우트 목록", () => {
  it.each(ALL_ROUTES)("%s 는 실제 화면이 있는 경로다", (route) => {
    expect(routePatterns.some((pattern) => pattern.test(route))).toBe(true);
  });

  it("같은 경로를 두 번 적지 않는다", () => {
    expect(new Set(ALL_ROUTES).size).toBe(ALL_ROUTES.length);
  });
});

describe("운영 배포 기본값(출시 안내 켜짐, 심사 모드 꺼짐)", () => {
  it("공개 안내 경로만 열고 나머지 화면은 모두 출시 안내로 보낸다", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    for (const route of routesOf("always-open"))
      expect([route, isPassed(route)]).toEqual([route, true]);
    for (const route of routesOf("review-open", "blocked")) {
      expect([route, isSentToComingSoon(route)]).toEqual([route, true]);
    }
  });

  it("공개 조회 API 두 개만 열고 나머지 API는 503으로 막는다", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    for (const path of RELEASE_CHECK_APIS.alwaysOpen) expect(send(path).status).not.toBe(503);
    for (const path of RELEASE_CHECK_APIS.alwaysOpen) expect(send(path, "POST").status).toBe(503);
    for (const path of RELEASE_CHECK_APIS.gated) expect(send(path).status).toBe(503);
  });
});

describe("심사 모드(출시 안내 켜짐, 심사 모드 켜짐)", () => {
  it("가입·결제·설정 화면까지만 열고 업무 화면과 운영 콘솔은 계속 막는다", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("REVIEW_MODE", "true");
    for (const route of routesOf("always-open", "review-open")) {
      expect([route, isPassed(route)]).toEqual([route, true]);
    }
    for (const route of routesOf("blocked")) {
      expect([route, isSentToComingSoon(route)]).toEqual([route, true]);
    }
  });

  it("API는 모두 서버로 넘긴다", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("REVIEW_MODE", "true");
    for (const path of [...RELEASE_CHECK_APIS.alwaysOpen, ...RELEASE_CHECK_APIS.gated]) {
      expect(send(path).status).not.toBe(503);
    }
  });
});

describe("출시 안내 해제(COMING_SOON=false)", () => {
  it("운영 배포에서도 모든 점검 라우트와 API를 그대로 처리한다", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("COMING_SOON", "false");
    for (const route of ALL_ROUTES) expect([route, isPassed(route)]).toEqual([route, true]);
    for (const path of RELEASE_CHECK_APIS.gated) expect(send(path).status).not.toBe(503);
  });

  it("심사 모드 값이 남아 있어도 결과가 같다", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("COMING_SOON", "false");
    vi.stubEnv("REVIEW_MODE", "true");
    for (const route of ALL_ROUTES) expect([route, isPassed(route)]).toEqual([route, true]);
  });

  it("구성원 세션이 있으면 첫 화면에서 업무 홈으로 보낸다", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("COMING_SOON", "false");
    const response = send("/", "GET", "__Host-sairo_session=value");
    expect(response.headers.get("location")).toBe(`${ORIGIN}/home`);
  });

  it("COMING_SOON을 다시 true로 두면 바로 막힌다", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("COMING_SOON", "true");
    expect(isSentToComingSoon("/properties")).toBe(true);
    expect(send("/api/me").status).toBe(503);
  });
});
