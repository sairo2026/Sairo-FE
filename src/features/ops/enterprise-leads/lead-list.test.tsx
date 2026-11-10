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
import { LeadListScreen } from "./lead-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/enterprise-leads",
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

function renderList(roles: OpsRole[] = ["SUPPORT"]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<LeadListScreen />, roles);
}

describe("기업 도입 문의 목록", () => {
  it("로딩 뒤 기업명·진행 상태·담당·담당자·규모·최신 견적·접수 시각을 보인다", async () => {
    renderList();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(await screen.findByText("(주)샘플부동산")).toBeTruthy();
    const headers = screen.getAllByRole("columnheader").map((cell) => cell.textContent);
    expect(headers).toEqual(
      expect.arrayContaining([
        "기업명",
        "진행 상태",
        "담당",
        "담당자",
        "지점·인원",
        "최신 견적",
        "접수 시각",
      ]),
    );
    expect(screen.getAllByText("3개 지점 · 12명", { exact: false }).length).toBeGreaterThan(0);
  });

  it("기업명은 상세 화면 링크다", async () => {
    renderList();
    const link = await screen.findByRole("link", { name: "(주)샘플부동산" });
    expect(link.getAttribute("href")).toBe("/ops/enterprise-leads/601");
  });

  it("최신 견적 금액에 천 단위 쉼표와 원을 붙인다", async () => {
    renderList();
    expect(await screen.findByText(/11,000,000원/)).toBeTruthy();
  });

  it("견적이 없으면 대시로 보인다", async () => {
    renderList();
    await screen.findByText("(주)샘플부동산");
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  it("상태 필터로 견적 수락 문의만 조회한다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByText("(주)샘플부동산");
    await user.selectOptions(screen.getByLabelText("진행 상태"), "ACCEPTED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("신세계공인")).toBeTruthy();
    expect(screen.queryByText("(주)샘플부동산")).toBeNull();
  });

  it("미배정만 체크하면 담당이 없는 문의만 보인다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByText("(주)샘플부동산");
    await user.click(screen.getByLabelText("미배정만"));
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("종료된중개")).toBeTruthy();
    expect(screen.queryByText("한빛공인중개")).toBeNull();
  });

  it("담당 운영자 번호로 조회한다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByText("(주)샘플부동산");
    await user.type(screen.getByLabelText("담당 운영자 번호"), "7");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("대한부동산그룹")).toBeTruthy();
    expect(screen.queryByText("한빛공인중개")).toBeNull();
  });

  it("초기화하면 전체 목록이 다시 보인다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByText("(주)샘플부동산");
    await user.selectOptions(screen.getByLabelText("진행 상태"), "CLOSED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await screen.findByText("종료된중개");
    await user.click(screen.getByRole("button", { name: "초기화" }));
    expect(await screen.findByText("한빛공인중개")).toBeTruthy();
  });

  it("조건에 맞는 문의가 없으면 빈 목록 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByText("(주)샘플부동산");
    await user.selectOptions(screen.getByLabelText("진행 상태"), "REJECTED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("조건에 맞는 기업 도입 문의가 없습니다.")).toBeTruthy();
  });

  it("서버 오류가 나면 안내하고 다시 시도하면 목록이 나온다", async () => {
    const user = userEvent.setup();
    server.use(http.get("/api/ops/enterprise-leads", () => mockErrors.server(), { once: true }));
    renderList();
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /다시 시도/ }));
    expect(await screen.findByText("(주)샘플부동산")).toBeTruthy();
  });

  it("요청이 많으면 잠시 뒤 다시 시도하라고 안내한다", async () => {
    server.use(http.get("/api/ops/enterprise-leads", () => mockErrors.rateLimited(30)));
    renderList();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("서버가 403을 주면 처리 권한 안내를 보인다", async () => {
    server.use(http.get("/api/ops/enterprise-leads", () => mockErrors.forbidden()));
    renderList();
    expect(await screen.findByText(/이 처리를 할 수 있는 운영 역할이 아닙니다/)).toBeTruthy();
  });

  it("지원 역할이 없으면 접근 불가 안내를 보인다", () => {
    renderList(["PRIVACY"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
  });
});
