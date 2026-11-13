// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { buildMockTask, resetMockWorkState, setMockWorkState } from "@/mocks/handlers/work";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { HomeDashboard } from "./home-dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockWorkState();
});

afterAll(() => stopServer());

function yesterday(): string {
  return new Date(Date.now() + 9 * 3_600_000 - 86_400_000).toISOString().slice(0, 10);
}

describe("홈 대시보드", () => {
  it("불러오는 동안 로딩을 보여주고 오늘 방문·업무·조율 현황을 표시한다", async () => {
    renderOffice(<HomeDashboard />, { role: "OWNER" });
    expect(document.querySelector("[aria-busy=true]")).not.toBeNull();
    expect(await screen.findByText("서울특별시 성북구 정릉로 77")).not.toBeNull();
    expect(screen.getByRole("button", { name: "업무 임장 안내 문자 확인 열기" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "계약 만기 D-90 2건" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "오늘 임장 목록 1건" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "방문 조율 중 1건" })).not.toBeNull();
    expect(screen.getByText("임대 만기 90일 전 후속업무")).not.toBeNull();
    expect(screen.getByText("전세 계약 D-90 후속업무")).not.toBeNull();
    const status = screen.getByRole("region", { name: "방문 조율 현황" });
    expect(within(status).getAllByRole("listitem")).toHaveLength(9);
    const calendar = screen.getByRole("grid", { name: "이번 달 일정" });
    const rows = within(calendar).getAllByRole("row");
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(within(rows[0] as HTMLElement).getAllByRole("columnheader")).toHaveLength(7);
    for (const row of rows.slice(1)) {
      expect(within(row as HTMLElement).getAllByRole("gridcell")).toHaveLength(7);
    }
  });

  it("읽지 않은 알림 수 배지가 알림함으로 이어진다", async () => {
    renderOffice(<HomeDashboard />, { role: "OWNER" });
    const link = await screen.findByRole("link", { name: /알림함/ });
    expect(link.getAttribute("href")).toBe("/notifications");
    expect(within(link).getByLabelText("읽지 않은 알림 1건")).not.toBeNull();
  });

  it("방문 신청 현황 건수와 읽지 않은 방문 신청 알림 수를 보여준다", async () => {
    setMockWorkState({
      unreadVisitRequestNoticeCount: 3,
      visitRequestSummary: { pendingCount: 4, revalidationFailedCount: 1, timeClosedCount: 2 },
    });
    renderOffice(<HomeDashboard />);
    expect(await screen.findByRole("link", { name: "신청 대기 4건" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "재검증 실패 1건" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "시간 마감 2건" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "읽지 않은 방문 신청 알림 3건" })).toBeTruthy();
  });

  it("기한이 지난 미완료 업무를 오늘 업무와 따로 보여준다", async () => {
    setMockWorkState({
      tasks: [
        buildMockTask({ taskId: 1, title: "지난 업무", dueDate: yesterday() }),
        buildMockTask({ taskId: 2, title: "오늘 업무" }),
      ],
    });
    renderOffice(<HomeDashboard />, { role: "AGENT" });
    const overdue = await screen.findByRole("list", { name: "기한이 지난 업무" });
    expect(within(overdue).getByText("지난 업무")).not.toBeNull();
    const today = screen.getByRole("list", { name: "오늘 예정 업무" });
    expect(within(today).getByText("오늘 업무")).not.toBeNull();
    expect(within(today).queryByText("지난 업무")).toBeNull();
  });

  it("방문과 업무가 없으면 빈 안내를 보여준다", async () => {
    setMockWorkState({ tasks: [], todayVisits: [], followupTasks: [], calendarDays: [] });
    renderOffice(<HomeDashboard />, { role: "OWNER" });
    expect(await screen.findByText("오늘 확정된 방문이 없습니다.")).not.toBeNull();
    expect(screen.getByText("오늘 할 업무가 없습니다.")).not.toBeNull();
    expect(screen.getByText("제출할 후속업무가 없습니다.")).not.toBeNull();
  });

  it("중개보조원 홈은 계약 만기 카드와 후속업무를 숨기고 본인 업무만 보여준다", async () => {
    setMockWorkState({
      callerRole: "DEPUTY",
      callerMembershipId: 7,
      tasks: [
        buildMockTask({ taskId: 1, title: "내 일반서무", assigneeMembershipId: 7 }),
        buildMockTask({ taskId: 2, title: "남의 업무", assigneeMembershipId: 2 }),
      ],
    });
    renderOffice(<HomeDashboard />, { role: "DEPUTY" });
    expect(await screen.findByText("내 일반서무")).not.toBeNull();
    expect(screen.queryByText("남의 업무")).toBeNull();
    expect(screen.queryByText("계약 만기 D-90")).toBeNull();
    expect(screen.queryByText("임대 만기 90일 전 후속업무")).toBeNull();
    expect(screen.getByText(/본인 일반서무와 담당 현장안내만 집계/)).not.toBeNull();
  });

  it("업무를 누르면 저장된 값을 채운 수정 팝업이 열린다", async () => {
    const user = userEvent.setup();
    setMockWorkState({
      tasks: [buildMockTask({ taskId: 6001, title: "계약서 준비", memo: "도장 챙기기" })],
    });
    renderOffice(<HomeDashboard />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "업무 계약서 준비 열기" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByDisplayValue("계약서 준비")).not.toBeNull();
    expect(within(dialog).getByDisplayValue("도장 챙기기")).not.toBeNull();
    expect(within(dialog).getByRole("button", { name: "완료 처리" })).not.toBeNull();
  });

  it("서버 오류는 다시 시도 버튼으로 복구한다", async () => {
    server.use(http.get("/api/home", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<HomeDashboard />, { role: "OWNER" });
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("오늘 업무 리스트")).not.toBeNull();
  });

  it("403과 429를 구분해 안내한다", async () => {
    server.use(http.get("/api/home", () => mockErrors.forbidden()));
    const first = renderOffice(<HomeDashboard />, { role: "OWNER" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
    first.unmount();
    server.use(http.get("/api/home", () => mockErrors.rateLimited(30)));
    renderOffice(<HomeDashboard />, { role: "OWNER" });
    expect(await screen.findByText("요청이 너무 많습니다")).not.toBeNull();
  });
});
