// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { resetMockOpsSupport } from "@/mocks/handlers/ops-support";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { IntakeListScreen } from "./intake-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/guest-privacy-intakes",
  useSearchParams: () => new URLSearchParams(),
}));

let stopServer: () => void;
beforeAll(() => {
  stopServer = startMockServer();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockOpsSession();
  resetMockOpsSupport();
});
afterAll(() => stopServer());

function renderList(roles: OpsRole[] = ["PRIVACY"]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<IntakeListScreen />, roles);
}

describe("비회원 권리 요청 목록", () => {
  it("로딩 뒤 접수 번호·요청 종류·요청자 구분·접수 시각·목표 기한·본인 확인·사무소를 보인다", async () => {
    renderList();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(await screen.findByRole("link", { name: "41" })).toBeTruthy();
    const headers = screen.getAllByRole("columnheader").map((cell) => cell.textContent);
    expect(headers).toEqual(
      expect.arrayContaining([
        "접수 번호",
        "요청 종류",
        "요청자 구분",
        "접수 시각",
        "목표 기한",
        "본인 확인",
        "링크 발급 사무소",
        "접수 상태",
      ]),
    );
    expect(screen.getByText("열람")).toBeTruthy();
    expect(screen.getAllByText("대리인").length).toBeGreaterThan(0);
    expect(screen.getAllByText("사무소 예시").length).toBeGreaterThan(0);
  });

  it("변호사 검토 전 초안이라는 안내를 보인다", async () => {
    renderList();
    expect(await screen.findByText(/변호사 검토 전 초안입니다/)).toBeTruthy();
  });

  it("접수 번호는 상세 화면 링크다", async () => {
    renderList();
    const link = await screen.findByRole("link", { name: "42" });
    expect(link.getAttribute("href")).toBe("/ops/guest-privacy-intakes/42");
  });

  it("본인 확인 상태를 확인 전·본인 확인됨·확인 실패로 구분해 보인다", async () => {
    renderList();
    await screen.findByRole("link", { name: "41" });
    expect(screen.getAllByText("확인 전").length).toBe(2);
    expect(screen.getByText("본인 확인됨")).toBeTruthy();
    expect(screen.getByText("확인 실패")).toBeTruthy();
  });

  it("상태 필터로 전환된 접수만 조회한다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "41" });
    await user.selectOptions(screen.getByLabelText("접수 상태"), "CONVERTED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByRole("link", { name: "43" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "41" })).toBeNull();
  });

  it("링크 발급 사무소 번호로 조회한다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "41" });
    await user.type(screen.getByLabelText("링크 발급 사무소 번호"), "13");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByRole("link", { name: "42" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "41" })).toBeNull();
  });

  it("초기화하면 모든 접수가 다시 보인다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "41" });
    await user.selectOptions(screen.getByLabelText("접수 상태"), "CLOSED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await screen.findByRole("link", { name: "44" });
    await user.click(screen.getByRole("button", { name: "초기화" }));
    expect(await screen.findByRole("link", { name: "41" })).toBeTruthy();
  });

  it("해당 접수가 없으면 빈 목록 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "41" });
    await user.type(screen.getByLabelText("링크 발급 사무소 번호"), "999");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("접수된 비회원 권리 요청이 없습니다.")).toBeTruthy();
  });

  it("서버 오류가 나면 안내하고 다시 시도하면 목록이 나온다", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/ops/guest-privacy-intakes", () => mockErrors.server(), { once: true }),
    );
    renderList();
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /다시 시도/ }));
    expect(await screen.findByRole("link", { name: "41" })).toBeTruthy();
  });

  it("요청이 많으면 잠시 뒤 다시 시도하라고 안내한다", async () => {
    server.use(http.get("/api/ops/guest-privacy-intakes", () => mockErrors.rateLimited(30)));
    renderList();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("서버가 403을 주면 처리 권한 안내를 보인다", async () => {
    server.use(http.get("/api/ops/guest-privacy-intakes", () => mockErrors.forbidden()));
    renderList();
    expect(await screen.findByText(/이 처리를 할 수 있는 운영 역할이 아닙니다/)).toBeTruthy();
  });

  it("개인정보담당이 아니면 접근 불가 안내를 보인다", () => {
    renderList(["SUPPORT"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
    expect(screen.queryByRole("search")).toBeNull();
  });
});
