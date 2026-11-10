// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { mockHome, resetOpsHomeMock } from "@/mocks/handlers/ops-home";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import type { OpsRole } from "../../model/roles";
import { opsHomeKeys } from "../api/ops-home-api";
import { countOverdueIncreaseNotices, judgeTrialWindow } from "../model/home-cards";
import { renderOpsScreen } from "../testing/render-ops-screen";
import { OpsHomeScreen } from "./ops-home-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops",
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
  resetOpsHomeMock();
});
afterAll(() => stopServer());

const DAY_MS = 24 * 60 * 60 * 1000;

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

function trialEvent(overrides: Record<string, unknown> = {}) {
  return {
    eventId: 1,
    name: "겨울 가입 이벤트",
    startsAt: daysFromNow(-30),
    endsAt: daysFromNow(30),
    officeCreatedDuring: true,
    firstApplicationDuring: true,
    freeEndMode: "DURATION",
    fixedFreeEndsAt: null,
    status: "ACTIVE",
    approvedByOperatorId: 3,
    createdAt: daysFromNow(-40),
    audience: "GENERAL",
    maxOffices: null,
    ...overrides,
  };
}

function useTrialEvents(items: unknown[]) {
  server.use(
    http.get("/api/ops/trial-events", () =>
      HttpResponse.json({ items, page: 0, size: 100, totalElements: items.length }),
    ),
  );
}

function notice(overrides: Record<string, unknown> = {}) {
  return {
    noticeId: 1,
    officeId: 501,
    officeName: "사이로중개",
    subscriptionId: 8,
    changeKind: "INCREASE",
    fromPriceVersion: "A",
    toPriceVersion: "B",
    notifiedAt: daysFromNow(-40),
    effectiveAt: daysFromNow(10),
    responseDueAt: daysFromNow(-3),
    decision: "PENDING",
    decidedAt: null,
    ...overrides,
  };
}

function usePriceNotices(items: unknown[], totalElements = items.length) {
  server.use(
    http.get("/api/ops/price-change-notices", () =>
      HttpResponse.json({
        items,
        summary: {
          pending: items.length,
          agreed: 0,
          declined: 0,
          notRequired: 0,
          endedNoConsent: 0,
        },
        page: 0,
        size: 100,
        totalElements,
      }),
    ),
  );
}

function renderHome(roles: OpsRole[]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<OpsHomeScreen />, roles);
}

describe("운영 홈 큐 카드", () => {
  it("불러오는 동안 로딩 안내를 보인다", () => {
    renderHome(["REVIEW"]);
    expect(screen.getByText("운영 현황을 불러오는 중입니다.")).not.toBeNull();
  });

  it("큐별 건수와 심사 기한 초과 건수를 보인다", async () => {
    renderHome(["REVIEW"]);
    const review = await screen.findByRole("listitem", { name: "심사 대기" });
    expect(within(review).getByText("7건")).not.toBeNull();
    expect(within(review).getByText("기한 초과 2건")).not.toBeNull();
    expect(
      within(screen.getByRole("listitem", { name: "미배정 문의" })).getByText("4건"),
    ).not.toBeNull();
    expect(
      within(screen.getByRole("listitem", { name: "결제 확인 중" })).getByText("3건"),
    ).not.toBeNull();
    expect(
      within(screen.getByRole("listitem", { name: "환불 실패" })).getByText("1건"),
    ).not.toBeNull();
    expect(
      within(screen.getByRole("listitem", { name: "이전 검수 대기" })).getByText("5건"),
    ).not.toBeNull();
    expect(
      within(screen.getByRole("listitem", { name: "권리요청 기한 임박" })).getByText("2건"),
    ).not.toBeNull();
    expect(
      within(screen.getByRole("listitem", { name: "파기 실패" })).getByText("0건"),
    ).not.toBeNull();
    expect(
      within(screen.getByRole("listitem", { name: "장애 진행 중" })).getByText("1건"),
    ).not.toBeNull();
  });

  it("해당 업무 역할이 있는 큐만 이동 링크가 켜지고 나머지는 건수만 읽기 전용이다", async () => {
    renderHome(["REVIEW"]);
    const review = await screen.findByRole("listitem", { name: "심사 대기" });
    expect(within(review).getByRole("link").getAttribute("href")).toBe("/ops/registrations");
    const inquiry = screen.getByRole("listitem", { name: "미배정 문의" });
    expect(within(inquiry).queryByRole("link")).toBeNull();
    expect(within(inquiry).getByText(/읽기 전용/)).not.toBeNull();
  });

  it("모든 업무 역할이면 큐마다 알맞은 화면으로 연결한다", async () => {
    renderHome(["REVIEW", "SUPPORT", "BILLING", "MIGRATION", "PRIVACY", "OPS"]);
    await screen.findByRole("listitem", { name: "심사 대기" });
    const hrefOf = (name: string) =>
      within(screen.getByRole("listitem", { name })).getByRole("link").getAttribute("href");
    expect(hrefOf("심사 대기")).toBe("/ops/registrations");
    expect(hrefOf("미배정 문의")).toBe("/ops/inquiries");
    expect(hrefOf("결제 확인 중")).toBe("/ops/billing");
    expect(hrefOf("환불 실패")).toBe("/ops/billing/refunds");
    expect(hrefOf("이전 검수 대기")).toBe("/ops/import-support");
    expect(hrefOf("권리요청 기한 임박")).toBe("/ops/privacy-requests");
    expect(hrefOf("파기 실패")).toBe("/ops/deletion-queue");
    expect(hrefOf("장애 진행 중")).toBe("/ops/incidents");
  });

  it("경영조회만 있으면 모든 큐가 읽기 전용이다", async () => {
    renderHome(["EXEC_VIEW"]);
    await screen.findByRole("listitem", { name: "심사 대기" });
    expect(
      within(screen.getByRole("list", { name: "처리 대기 큐" })).queryAllByRole("link"),
    ).toHaveLength(0);
  });

  it("서버 오류가 나면 오류 화면과 다시 시도를 보이고 다시 시도하면 불러온다", async () => {
    server.use(http.get("/api/ops/home", () => mockErrors.server(), { once: true }));
    renderHome(["REVIEW"]);
    await userEvent.click(await screen.findByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("listitem", { name: "심사 대기" })).not.toBeNull();
  });

  it("권한이 없다는 응답은 오류 화면으로 안내한다", async () => {
    server.use(http.get("/api/ops/home", () => mockErrors.forbidden()));
    renderHome(["REVIEW"]);
    expect(await screen.findByRole("heading", { name: "접근 권한이 없습니다" })).not.toBeNull();
    expect(screen.queryByRole("listitem", { name: "심사 대기" })).toBeNull();
  });

  it("처리할 건이 없으면 0건으로 보인다", async () => {
    mockHome.counts = {
      pendingReviewCount: 0,
      overdueReviewCount: 0,
      unassignedInquiryCount: 0,
      paymentPendingCount: 0,
      refundFailedCount: 0,
      migrationReviewPendingCount: 0,
      privacyDeadlineApproachingCount: 0,
      deletionFailedCount: 0,
      activeIncidentCount: 0,
    };
    renderHome(["REVIEW"]);
    const review = await screen.findByRole("listitem", { name: "심사 대기" });
    expect(within(review).getByText("0건")).not.toBeNull();
    expect(within(review).getByText("기한 초과 0건")).not.toBeNull();
  });
});

describe("운영 홈 경영 지표", () => {
  it("경영조회 역할이면 사무소 수와 당월 순수납과 기준 시각을 보인다", async () => {
    renderHome(["EXEC_VIEW"]);
    const card = await screen.findByRole("region", { name: "경영 지표" });
    expect(within(card).getByText("12곳")).not.toBeNull();
    expect(within(card).getByText("34곳")).not.toBeNull();
    expect(within(card).getByText("4,250,000원")).not.toBeNull();
    expect(within(card).getByText(/기준 시각 2026-11-10 09:00/)).not.toBeNull();
    expect(within(card).getByText(/당월 1일 00:00부터/)).not.toBeNull();
  });

  it("execSummary가 내려오지 않으면 경영 지표 카드를 그리지 않는다", async () => {
    renderHome(["REVIEW"]);
    await screen.findByRole("listitem", { name: "심사 대기" });
    expect(screen.queryByRole("region", { name: "경영 지표" })).toBeNull();
  });
});

describe("운영 홈 이벤트와 가격 안내 점검", () => {
  it("활성 일반 체험 이벤트의 가입 창이 60일 안에 끝나면 경고한다", async () => {
    useTrialEvents([trialEvent({ endsAt: daysFromNow(30) })]);
    renderHome(["OPS"]);
    const card = await screen.findByRole("region", { name: "일반 체험 이벤트 점검" });
    await waitFor(() =>
      expect(within(card).getByRole("alert").textContent).toContain("겨울 가입 이벤트"),
    );
    expect(within(card).getByRole("alert").textContent).toMatch(/\d+일 뒤/);
  });

  it("가입 창이 60일 넘게 남았으면 경고하지 않는다", async () => {
    useTrialEvents([trialEvent({ endsAt: daysFromNow(120) })]);
    renderHome(["OPS"]);
    const card = await screen.findByRole("region", { name: "일반 체험 이벤트 점검" });
    expect(await within(card).findByText(/60일 넘게 남아/)).not.toBeNull();
    expect(within(card).queryByRole("alert")).toBeNull();
  });

  it("활성 일반 체험 이벤트가 없으면 경고한다", async () => {
    useTrialEvents([
      trialEvent({ status: "ENDED" }),
      trialEvent({ eventId: 2, audience: "START_CUSTOMER" }),
    ]);
    renderHome(["OPS"]);
    const card = await screen.findByRole("region", { name: "일반 체험 이벤트 점검" });
    expect((await within(card).findByRole("alert")).textContent).toContain(
      "활성 상태인 일반 체험 이벤트가 없습니다",
    );
  });

  it("체험 이벤트를 불러오지 못하면 카드 안에서 다시 시도할 수 있다", async () => {
    useTrialEvents([]);
    server.use(http.get("/api/ops/trial-events", () => mockErrors.server(), { once: true }));
    renderHome(["OPS"]);
    const card = await screen.findByRole("region", { name: "일반 체험 이벤트 점검" });
    await userEvent.click(await within(card).findByRole("button", { name: "다시 시도" }));
    expect(await within(card).findByText(/활성 상태인 일반 체험 이벤트가 없습니다/)).not.toBeNull();
  });

  it("응답 기한이 지난 인상 안내만 센다", async () => {
    usePriceNotices([
      notice(),
      notice({ noticeId: 2, responseDueAt: daysFromNow(5) }),
      notice({ noticeId: 3, changeKind: "NON_INCREASE" }),
    ]);
    renderHome(["BILLING"]);
    const card = await screen.findByRole("region", { name: "인상 가격 변경 안내 점검" });
    expect(await within(card).findByText("응답 기한이 지난 안내 1건")).not.toBeNull();
  });

  it("가격 변경 안내를 불러오지 못하면 카드 안에서 오류를 보인다", async () => {
    server.use(http.get("/api/ops/price-change-notices", () => mockErrors.server()));
    renderHome(["BILLING"]);
    const card = await screen.findByRole("region", { name: "인상 가격 변경 안내 점검" });
    expect((await within(card).findByRole("alert")).textContent).toContain("불러오지 못했습니다");
  });

  it("운영담당에게는 이벤트 카드만, 결제담당에게는 가격 안내 카드만 보인다", async () => {
    useTrialEvents([trialEvent()]);
    usePriceNotices([]);
    const { unmount } = renderHome(["OPS"]);
    await screen.findByRole("listitem", { name: "심사 대기" });
    expect(screen.getByRole("region", { name: "일반 체험 이벤트 점검" })).not.toBeNull();
    expect(screen.queryByRole("region", { name: "인상 가격 변경 안내 점검" })).toBeNull();
    unmount();
    cleanup();
    renderHome(["BILLING"]);
    await screen.findByRole("listitem", { name: "심사 대기" });
    expect(screen.getByRole("region", { name: "인상 가격 변경 안내 점검" })).not.toBeNull();
    expect(screen.queryByRole("region", { name: "일반 체험 이벤트 점검" })).toBeNull();
  });

  it("다른 역할에는 두 카드를 보이지 않고 해당 API도 부르지 않는다", async () => {
    const { queryClient } = renderHome(["REVIEW", "SUPPORT"]);
    await screen.findByRole("listitem", { name: "심사 대기" });
    expect(screen.queryByRole("region", { name: "일반 체험 이벤트 점검" })).toBeNull();
    expect(screen.queryByRole("region", { name: "인상 가격 변경 안내 점검" })).toBeNull();
    expect(queryClient.getQueryCache().find({ queryKey: opsHomeKeys.trialEvents })).toBeUndefined();
    expect(
      queryClient.getQueryCache().find({ queryKey: opsHomeKeys.priceNotices }),
    ).toBeUndefined();
  });
});

describe("운영 홈 점검 계산", () => {
  const now = Date.parse("2026-11-10T00:00:00+09:00");

  it("가장 먼저 끝나는 활성 일반 이벤트를 기준으로 남은 일수를 계산한다", () => {
    const result = judgeTrialWindow(
      [
        {
          name: "나중",
          endsAt: "2027-03-01T00:00:00+09:00",
          status: "ACTIVE",
          audience: "GENERAL",
        },
        {
          name: "먼저",
          endsAt: "2026-12-10T00:00:00+09:00",
          status: "ACTIVE",
          audience: "GENERAL",
        },
      ],
      now,
    );
    expect(result).toEqual({
      kind: "ending",
      name: "먼저",
      endsAt: "2026-12-10T00:00:00+09:00",
      daysLeft: 30,
    });
  });

  it("예약·종료 이벤트와 시작 고객 이벤트는 활성 일반 이벤트로 치지 않는다", () => {
    expect(
      judgeTrialWindow(
        [
          {
            name: "예약",
            endsAt: "2027-01-01T00:00:00+09:00",
            status: "SCHEDULED",
            audience: "GENERAL",
          },
          {
            name: "시작고객",
            endsAt: "2027-01-01T00:00:00+09:00",
            status: "ACTIVE",
            audience: "START_CUSTOMER",
          },
        ],
        now,
      ),
    ).toEqual({ kind: "none" });
  });

  it("응답 기한 경계와 결정 상태를 구분해 센다", () => {
    const base = { changeKind: "INCREASE", decision: "PENDING" };
    expect(
      countOverdueIncreaseNotices(
        [
          { ...base, responseDueAt: "2026-11-09T23:59:59+09:00" },
          { ...base, responseDueAt: "2026-11-10T00:00:01+09:00" },
          { ...base, decision: "AGREED", responseDueAt: "2026-11-01T00:00:00+09:00" },
        ],
        now,
      ),
    ).toBe(1);
  });
});
