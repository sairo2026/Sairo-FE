// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import { OpsPromotionsScreen } from "./promotions-screen";

let stopServer: () => void;
beforeAll(() => {
  stopServer = startMockServer();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockOpsSession();
});
afterAll(() => stopServer());

function renderPromotions() {
  setMockOperatorRoles(["BILLING"]);
  return renderOpsScreen(<OpsPromotionsScreen />, ["BILLING"]);
}

describe("운영 무료 프로모션 목록", () => {
  it("세션 만료 시 오류 원인과 운영자 로그인 이동을 함께 보인다", async () => {
    server.use(
      http.get("/api/ops/promotions/campaigns", () => mockErrors.unauthenticated()),
      http.get("/api/ops/promotions/grants", () => mockErrors.unauthenticated()),
    );
    renderPromotions();
    expect(
      await screen.findAllByText("로그인이 필요합니다. 로그인한 뒤 다시 시도해 주세요."),
    ).toHaveLength(2);
    const links = screen.getAllByRole("link", { name: "운영자 로그인" });
    expect(links).toHaveLength(2);
    expect(links.every((link) => link.getAttribute("href") === "/ops/login")).toBe(true);
  });

  it("서버 오류는 기존 문구로 안내하고 로그인 이동은 보이지 않는다", async () => {
    server.use(
      http.get("/api/ops/promotions/campaigns", () => mockErrors.server()),
      http.get("/api/ops/promotions/grants", () => mockErrors.server()),
    );
    renderPromotions();
    expect(await screen.findByText("캠페인을 불러오지 못했습니다.")).toBeTruthy();
    expect(await screen.findByText("지급 내역을 불러오지 못했습니다.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "운영자 로그인" })).toBeNull();
  });

  it("재인증 요구와 권한 부족은 세션 만료로 오인하지 않는다", async () => {
    server.use(
      http.get("/api/ops/promotions/campaigns", () => mockErrors.stepUpRequired()),
      http.get("/api/ops/promotions/grants", () => mockErrors.forbidden()),
    );
    renderPromotions();
    expect(await screen.findByText("캠페인을 불러오지 못했습니다.")).toBeTruthy();
    expect(await screen.findByText("지급 내역을 불러오지 못했습니다.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "운영자 로그인" })).toBeNull();
  });
});
