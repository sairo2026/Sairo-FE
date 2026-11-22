// @vitest-environment jsdom
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_ACTIVE_CONTEXT, resetMockAuthState, setMockAuthContext } from "@/mocks/handlers/auth";
import { startMockServer } from "@/mocks/server";
import { ROUTE_AREAS, renderRoute, routeCases } from "@/shared/testing/route-a11y";

vi.mock("next/navigation", async () => {
  const { navigationMock } = await import("@/shared/testing/navigation-mock");
  return navigationMock;
});

// 화면 전체 규칙인 landmark-one-main은 컨테이너만 검사하는 접근성 시험이 잡지 못하므로 따로 확인한다.
const MUST_HAVE_ONE_MAIN = [
  "/signup/email",
  "/signup/verify-email",
  "/signup/kakao",
  "/password/forgot",
  "/password/reset",
];

describe("공개 화면의 주 영역", () => {
  let stopServer: () => void;
  const routes = routeCases
    .filter(ROUTE_AREAS.public)
    .filter((route) => MUST_HAVE_ONE_MAIN.includes(route.path));

  beforeAll(() => {
    stopServer = startMockServer();
  });
  beforeEach(() => {
    resetMockAuthState();
    setMockAuthContext({ ...MOCK_ACTIVE_CONTEXT });
  });
  afterEach(() => {
    cleanup();
  });
  afterAll(() => {
    stopServer();
  });

  it("점검 대상 경로가 모두 있다", () => {
    expect(routes.map((route) => route.path).sort()).toEqual([...MUST_HAVE_ONE_MAIN].sort());
  });

  for (const route of routes) {
    it(`${route.path} 에는 main이 하나만 있다`, async () => {
      const container = await renderRoute(route);
      expect(container?.querySelectorAll("main, [role='main']")).toHaveLength(1);
    });
  }
});
