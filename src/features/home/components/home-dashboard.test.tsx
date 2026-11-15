// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { billingState, buildSubscription, resetBillingState } from "@/mocks/handlers/billing";
import { resetMockCustomerState, setMockCustomerState } from "@/mocks/handlers/customer";
import { resetMockPropertyState, setMockPropertyState } from "@/mocks/handlers/property";
import { buildMockTask, resetMockWorkState, setMockWorkState } from "@/mocks/handlers/work";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { COORDINATION_STATUSES, statusLabel } from "@/features/visit/model/labels";
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
  resetMockPropertyState();
  resetMockCustomerState();
  resetBillingState();
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

  it("후속업무 항목은 계약 ID가 있으면 해당 계약의 후속업무 확인 화면으로 이어진다", async () => {
    renderOffice(<HomeDashboard />, { role: "OWNER" });
    const list = await screen.findByRole("list", { name: "계약 후속업무" });
    const link = within(list).getByRole("link", { name: /전세 계약 D-90 후속업무/ });
    expect(link.getAttribute("href")).toBe("/contracts/601/followups");
  });

  it("계약 ID가 없는 응답이어도 화면이 깨지지 않고 만기 계약 목록으로 이어진다", async () => {
    setMockWorkState({
      followupTasks: [{ taskId: 7002, title: "ID 없는 후속업무", dueDate: "2026-12-02" }],
    });
    renderOffice(<HomeDashboard />, { role: "OWNER" });
    const link = await screen.findByRole("link", { name: /ID 없는 후속업무/ });
    expect(link.getAttribute("href")).toBe("/contracts?tab=maturity");
  });

  it("후속업무 항목에 호버·누름 상태 클래스가 있다", async () => {
    renderOffice(<HomeDashboard />, { role: "OWNER" });
    const link = await screen.findByRole("link", { name: /전세 계약 D-90 후속업무/ });
    expect(link.className).toContain("clickable-row");
  });

  it("업무 만들기 버튼은 오늘 업무 리스트 카드 머리에 있고 알림함 버튼은 홈 본문에 없다", async () => {
    renderOffice(<HomeDashboard />, { role: "OWNER" });
    const tasks = await screen.findByRole("region", { name: "오늘 업무 리스트" });
    expect(within(tasks).getByRole("button", { name: "+ 업무 만들기" })).not.toBeNull();
    expect(screen.queryByRole("link", { name: /알림함/ })).toBeNull();
  });

  it("읽기 전용 상태에서는 업무 만들기 버튼이 꺼진다", async () => {
    renderOffice(<HomeDashboard />, { role: "OWNER", isReadOnly: true });
    const button = await screen.findByRole("button", { name: "+ 업무 만들기" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("대표 홈에는 카드 등록 안내 링크가 있고 직원 홈에는 없다", async () => {
    renderOffice(<HomeDashboard />, { role: "OWNER" });
    expect((await screen.findByRole("link", { name: "카드 등록 안내" })).getAttribute("href")).toBe(
      "/billing/card-guide",
    );
    cleanup();
    renderOffice(<HomeDashboard />, { role: "AGENT" });
    await screen.findByRole("link", { name: "신청 대기 0건" });
    expect(screen.queryByRole("link", { name: "카드 등록 안내" })).toBeNull();
  });

  it("매물과 고객이 모두 없으면 대표에게 첫 사용 안내 카드를 보여준다", async () => {
    setMockPropertyState({ properties: [] });
    setMockCustomerState({ customers: [] });
    renderOffice(<HomeDashboard />, { role: "OWNER" });
    const guide = await screen.findByRole("region", { name: "첫 사용 안내" });
    expect(within(guide).getByRole("link", { name: "매물 등록" }).getAttribute("href")).toBe(
      "/properties/new",
    );
    expect(within(guide).getByRole("link", { name: "고객 등록" }).getAttribute("href")).toBe(
      "/customers/new",
    );
    expect(within(guide).getByRole("link", { name: "데이터 이전" }).getAttribute("href")).toBe(
      "/import",
    );
    expect(
      (await within(guide).findByRole("link", { name: "카드 등록 안내" })).getAttribute("href"),
    ).toBe("/billing/card-guide");
    expect(screen.getAllByRole("link", { name: "카드 등록 안내" })).toHaveLength(1);
  });

  it("직원에게는 첫 사용 안내 카드에 데이터 이전과 카드 안내가 없다", async () => {
    setMockPropertyState({ properties: [] });
    setMockCustomerState({ customers: [] });
    const { queryClient } = renderOffice(<HomeDashboard />, { role: "AGENT" });
    const guide = await screen.findByRole("region", { name: "첫 사용 안내" });
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(within(guide).getByRole("link", { name: "매물 등록" })).not.toBeNull();
    expect(within(guide).queryByRole("link", { name: "데이터 이전" })).toBeNull();
    expect(screen.queryByRole("link", { name: "카드 등록 안내" })).toBeNull();
  });

  it("매물이나 고객이 하나라도 있으면 첫 사용 안내 카드를 숨긴다", async () => {
    setMockCustomerState({ customers: [] });
    const { queryClient } = renderOffice(<HomeDashboard />, { role: "OWNER" });
    await screen.findByRole("link", { name: "신청 대기 0건" });
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(screen.queryByRole("region", { name: "첫 사용 안내" })).toBeNull();
  });

  it("중개보조원과 읽기 전용 상태에서는 첫 사용 안내 카드를 보여주지 않는다", async () => {
    setMockPropertyState({ properties: [] });
    setMockCustomerState({ customers: [] });
    const deputy = renderOffice(<HomeDashboard />, { role: "DEPUTY" });
    await screen.findByRole("link", { name: "신청 대기 0건" });
    await waitFor(() => expect(deputy.queryClient.isFetching()).toBe(0));
    expect(screen.queryByRole("region", { name: "첫 사용 안내" })).toBeNull();
    cleanup();
    const readOnly = renderOffice(<HomeDashboard />, { role: "OWNER", isReadOnly: true });
    await screen.findByRole("link", { name: "신청 대기 0건" });
    await waitFor(() => expect(readOnly.queryClient.isFetching()).toBe(0));
    expect(screen.queryByRole("region", { name: "첫 사용 안내" })).toBeNull();
  });

  it("카드를 이미 등록한 대표 홈에는 카드 등록 안내 링크가 없다", async () => {
    billingState.subscription = buildSubscription({
      paymentMethod: {
        cardIssuer: "신한카드",
        cardLast4: "1234",
        registeredAt: "2026-11-10T09:00:00+09:00",
      },
      readiness: { hasValidConsent: true, hasBillingKey: true },
    });
    const { queryClient } = renderOffice(<HomeDashboard />, { role: "OWNER" });
    await screen.findByRole("link", { name: "신청 대기 0건" });
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(screen.queryByRole("link", { name: "카드 등록 안내" })).toBeNull();
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

  it("방문 조율 현황의 상태 태그는 각 상태로 거른 조율 목록으로 이어진다", async () => {
    renderOffice(<HomeDashboard />, { role: "OWNER" });
    const status = await screen.findByRole("region", { name: "방문 조율 현황" });
    const links = within(status).getAllByRole("link");
    expect(links).toHaveLength(COORDINATION_STATUSES.length);
    COORDINATION_STATUSES.forEach((value, index) => {
      expect(links[index]?.getAttribute("href")).toBe(`/coordinations?status=${value}`);
      expect(links[index]?.textContent).toContain(statusLabel(value));
      const tile = links[index]?.querySelector("[data-tone]");
      expect(tile?.className).toContain("clickable-tile");
    });
  });

  it("신청 현황 카드는 신청 상태가 조율 상태와 달라 필터 없는 조율 목록으로 이어진다", async () => {
    renderOffice(<HomeDashboard />);
    for (const name of ["신청 대기 0건", "재검증 실패 0건", "시간 마감 0건"]) {
      const link = await screen.findByRole("link", { name });
      expect(link.getAttribute("href")).toBe("/coordinations");
      expect(link.className).toContain("clickable-card");
    }
  });

  it("읽지 않은 방문 신청 알림 링크는 방문 신청 알림 탭을 연다", async () => {
    renderOffice(<HomeDashboard />);
    const link = await screen.findByRole("link", { name: /읽지 않은 방문 신청 알림 \d+건/ });
    expect(link.getAttribute("href")).toBe("/notifications?tab=visit-request");
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

  it("계약에서 생긴 업무는 그 계약으로 이동하고 그 외 업무는 업무 상세 창을 연다", async () => {
    setMockWorkState({
      tasks: [
        buildMockTask({
          taskId: 11,
          title: "잔금 예정 확인",
          sourceType: "CONTRACT_BALANCE",
          sourceId: 601,
        }),
        buildMockTask({
          taskId: 12,
          title: "만기 확인",
          sourceType: "CONTRACT_MATURITY",
          sourceId: 602,
        }),
        buildMockTask({ taskId: 13, title: "방문 준비", sourceType: "VISIT", sourceId: 5001 }),
        buildMockTask({ taskId: 14, title: "직접 만든 업무" }),
      ],
    });
    const user = userEvent.setup();
    renderOffice(<HomeDashboard />, { role: "OWNER" });
    const balance = await screen.findByRole("link", { name: "업무 잔금 예정 확인의 계약 보기" });
    expect(balance.getAttribute("href")).toBe("/contracts/601");
    expect(
      screen.getByRole("link", { name: "업무 만기 확인의 계약 보기" }).getAttribute("href"),
    ).toBe("/contracts/602");
    expect(screen.queryByRole("link", { name: "업무 방문 준비의 계약 보기" })).toBeNull();
    expect(screen.queryByRole("link", { name: "업무 직접 만든 업무의 계약 보기" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "업무 방문 준비 열기" }));
    expect(await screen.findByRole("dialog")).not.toBeNull();
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
