// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import {
  buildMockNotification,
  getMockWorkState,
  resetMockWorkState,
  setMockWorkState,
} from "@/mocks/handlers/work";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import {
  notificationHref,
  notificationLink,
  notificationTypeLabel,
  parseNotificationTab,
  visitRequestNoticeHref,
} from "../model/labels";
import { NotificationListScreen } from "./notification-list-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/notifications",
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

describe("알림함", () => {
  it("로딩 뒤 알림 종류와 읽음 상태를 표시하고 관련 화면 링크를 건다", async () => {
    renderOffice(<NotificationListScreen />, { role: "OWNER" });
    expect(document.querySelector("[aria-busy=true]")).not.toBeNull();
    expect(await screen.findByText("방문 일정이 확정되었습니다.")).not.toBeNull();
    expect(screen.getByText("확정 완료")).not.toBeNull();
    expect(screen.getByText("읽지 않음")).not.toBeNull();
    const link = screen.getAllByRole("link", { name: "관련 화면으로 이동" })[0];
    expect(link?.getAttribute("href")).toBe("/coordinations/801");
  });

  it("읽음 처리하면 읽지 않음 표시가 사라진다", async () => {
    const user = userEvent.setup();
    renderOffice(<NotificationListScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: /읽음 처리/ }));
    await waitFor(() => expect(screen.queryByText("읽지 않음")).toBeNull());
    expect(getMockWorkState().notifications.every((item) => item.read)).toBe(true);
  });

  it("읽지 않은 알림만 보기를 켜면 읽은 알림이 빠진다", async () => {
    const user = userEvent.setup();
    renderOffice(<NotificationListScreen />, { role: "OWNER" });
    await screen.findByText("결제가 완료되었습니다.");
    await user.click(screen.getByRole("checkbox", { name: "읽지 않은 알림만 보기" }));
    await waitFor(() => expect(screen.queryByText("결제가 완료되었습니다.")).toBeNull());
    expect(screen.getByText("방문 일정이 확정되었습니다.")).not.toBeNull();
  });

  it("읽지 않은 알림이 없으면 전용 빈 안내를 보여준다", async () => {
    setMockWorkState({ notifications: [] });
    const user = userEvent.setup();
    renderOffice(<NotificationListScreen />, { role: "OWNER" });
    expect(await screen.findByText("받은 알림이 없습니다.")).not.toBeNull();
    await user.click(screen.getByRole("checkbox", { name: "읽지 않은 알림만 보기" }));
    expect(await screen.findByText("읽지 않은 알림이 없습니다.")).not.toBeNull();
  });

  it("페이지 크기를 바꾸고 페이지를 이동한다", async () => {
    setMockWorkState({
      notifications: Array.from({ length: 30 }, (_, index) =>
        buildMockNotification({ notificationId: index + 1, message: `알림 ${index + 1}` }),
      ),
    });
    const user = userEvent.setup();
    renderOffice(<NotificationListScreen />, { role: "OWNER" });
    expect(await screen.findByText("알림 1")).not.toBeNull();
    expect(screen.queryByText("알림 26")).toBeNull();
    await user.click(screen.getByRole("button", { name: "다음" }));
    expect(await screen.findByText("알림 26")).not.toBeNull();
    await user.selectOptions(screen.getByLabelText("페이지당 알림 수"), "50");
    expect(await screen.findByText("알림 30")).not.toBeNull();
  });

  it("대상 화면이 없는 알림은 이동 링크를 만들지 않는다", async () => {
    setMockWorkState({
      notifications: [
        buildMockNotification({
          notificationId: 1,
          type: "NOTICE",
          message: "공지입니다.",
          targetType: "NONE",
          targetId: null,
        }),
      ],
    });
    renderOffice(<NotificationListScreen />, { role: "OWNER" });
    expect(await screen.findByText("공지입니다.")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "관련 화면으로 이동" })).toBeNull();
  });

  it("조회 오류는 다시 시도 버튼으로 복구하고 403과 429를 구분한다", async () => {
    server.use(http.get("/api/notifications", () => mockErrors.server()));
    const user = userEvent.setup();
    const first = renderOffice(<NotificationListScreen />, { role: "OWNER" });
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("방문 일정이 확정되었습니다.")).not.toBeNull();
    first.unmount();
    server.use(http.get("/api/notifications", () => mockErrors.forbidden()));
    const second = renderOffice(<NotificationListScreen />, { role: "OWNER" });
    expect(await screen.findByText(/사무소 접근이 정지된 경우 정지가 풀릴 때까지/)).not.toBeNull();
    expect(screen.getByRole("link", { name: "접근 상태 확인" }).getAttribute("href")).toBe(
      "/access",
    );
    second.unmount();
    server.use(http.get("/api/notifications", () => mockErrors.rateLimited(20)));
    renderOffice(<NotificationListScreen />, { role: "OWNER" });
    expect(await screen.findByText("요청이 너무 많습니다")).not.toBeNull();
  });

  it("읽음 처리 요청이 실패하면 오류 안내를 보여준다", async () => {
    server.use(http.post("/api/notifications/:id/read", () => mockErrors.notFound()));
    const user = userEvent.setup();
    renderOffice(<NotificationListScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: /읽음 처리/ }));
    expect(await screen.findByText(/대상을 찾을 수 없습니다/)).not.toBeNull();
  });

  it("방문 신청 알림 탭에서 신청 마감 같은 알림을 보고 읽음 처리한다", async () => {
    let read = false;
    server.use(
      http.get("/api/visit-request-notices", () =>
        HttpResponse.json({
          items: [
            {
              noticeId: 31,
              requestId: 5,
              noticeType: "TIME_CLOSED",
              channel: "IN_APP",
              createdAt: "2026-11-10T09:00:00+09:00",
              readAt: read ? "2026-11-10T09:05:00+09:00" : null,
            },
          ],
        }),
      ),
      http.post("/api/visit-request-notices/31/read", () => {
        read = true;
        return HttpResponse.json({});
      }),
    );
    const user = userEvent.setup();
    renderOffice(<NotificationListScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("tab", { name: "방문 신청 알림" }));
    const panel = await screen.findByRole("tabpanel");
    expect(await within(panel).findByText("시간 마감")).not.toBeNull();
    await user.click(within(panel).getByRole("button", { name: /읽음 처리/ }));
    await waitFor(() => expect(read).toBe(true));
  });

  it("방문 신청 알림이 없으면 빈 안내를 보여준다", async () => {
    server.use(http.get("/api/visit-request-notices", () => HttpResponse.json({ items: [] })));
    const user = userEvent.setup();
    renderOffice(<NotificationListScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("tab", { name: "방문 신청 알림" }));
    expect(await screen.findByText("방문 신청 알림이 없습니다.")).not.toBeNull();
  });
});

describe("방문 신청 알림 이동", () => {
  const notice = (noticeId: number, coordinationId?: number) => ({
    noticeId,
    requestId: noticeId + 100,
    ...(coordinationId === undefined ? {} : { coordinationId }),
    noticeType: "TIME_CLOSED",
    channel: "IN_APP",
    createdAt: "2026-11-10T09:00:00+09:00",
    readAt: null,
  });

  it("조율 번호가 있으면 해당 조율의 신청 현황으로, 없으면 조율 목록으로 보낸다", async () => {
    server.use(
      http.get("/api/visit-request-notices", () =>
        HttpResponse.json({ items: [notice(31, 801), notice(32)] }),
      ),
    );
    renderOffice(<NotificationListScreen initialTab="visit-request" />, { role: "OWNER" });
    const panel = await screen.findByRole("tabpanel");
    await within(panel).findAllByRole("link", { name: "방문 조율로 이동" });
    const links = within(panel).getAllByRole("link", { name: "방문 조율로 이동" });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/coordinations/801/requests",
      "/coordinations",
    ]);
    expect(links[0]?.className).toContain("clickable-control");
  });

  it("알림 주소 규칙과 탭 쿼리 해석", () => {
    expect(visitRequestNoticeHref(801)).toBe("/coordinations/801/requests");
    expect(visitRequestNoticeHref(undefined)).toBe("/coordinations");
    expect(visitRequestNoticeHref(null)).toBe("/coordinations");
    expect(notificationHref("VISIT_COORDINATION", 801)).toBe("/coordinations/801");
    expect(notificationHref("VISIT_COORDINATION", null)).toBe("/coordinations");
    expect(parseNotificationTab("visit-request")).toBe("visit-request");
    expect(parseNotificationTab(["visit-request"])).toBe("visit-request");
    expect(parseNotificationTab("other")).toBe("general");
    expect(parseNotificationTab(undefined)).toBe("general");
  });
});

describe("알림 종류 확장", () => {
  it("임대 만기 알림은 계약 상세로 이어진다", async () => {
    setMockWorkState({
      notifications: [
        buildMockNotification({
          notificationId: 9101,
          type: "CONTRACT_EXPIRY",
          message: "정릉 아파트 계약의 임대차 만기가 90일 남았습니다.",
          targetType: "CONTRACT",
          targetId: 601,
        }),
      ],
    });
    renderOffice(<NotificationListScreen />, { role: "OWNER" });
    expect(
      await screen.findByText("정릉 아파트 계약의 임대차 만기가 90일 남았습니다."),
    ).not.toBeNull();
    expect(screen.getByText("임대 만기")).not.toBeNull();
    const link = screen.getByRole("link", { name: "관련 화면으로 이동" });
    expect(link.getAttribute("href")).toBe("/contracts/601");
  });

  it("대표 이전 알림은 이동 대상이 없어도 대표 이전 화면으로 이어진다", async () => {
    setMockWorkState({
      notifications: [
        buildMockNotification({
          notificationId: 9103,
          type: "OWNER_TRANSFER",
          message: "대표 이전 요청이 도착했습니다.",
          targetType: "NONE",
          targetId: null,
        }),
      ],
    });
    renderOffice(<NotificationListScreen />, { role: "OWNER" });
    expect(await screen.findByText("대표 이전 요청이 도착했습니다.")).not.toBeNull();
    expect(screen.getByText("대표 이전")).not.toBeNull();
    const link = screen.getByRole("link", { name: "관련 화면으로 이동" });
    expect(link.getAttribute("href")).toBe("/members/owner-transfer");
  });

  it("구성원 정지·복구·강등 알림은 보안 알림 라벨로 보이고 링크 없이 표시한다", async () => {
    setMockWorkState({
      notifications: [
        buildMockNotification({
          notificationId: 9104,
          type: "SECURITY_ALERT",
          message: "사무소 구성원 접근이 정지되었습니다.",
          targetType: "NONE",
          targetId: null,
        }),
      ],
    });
    renderOffice(<NotificationListScreen />, { role: "OWNER" });
    expect(await screen.findByText("사무소 구성원 접근이 정지되었습니다.")).not.toBeNull();
    expect(screen.getByText("로그인·보안")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "관련 화면으로 이동" })).toBeNull();
  });

  it("알 수 없는 알림 종류와 이동 대상은 일반 알림으로 표시하고 링크를 달지 않는다", async () => {
    setMockWorkState({
      notifications: [
        buildMockNotification({
          notificationId: 9102,
          type: "FUTURE_KIND",
          message: "새 종류의 알림입니다.",
          targetType: "FUTURE_TARGET",
          targetId: 5,
        }),
      ],
    });
    renderOffice(<NotificationListScreen />, { role: "OWNER" });
    expect(await screen.findByText("새 종류의 알림입니다.")).not.toBeNull();
    expect(screen.getByText("알림")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "관련 화면으로 이동" })).toBeNull();
  });
});

describe("알림 종류 20가지", () => {
  const SERVER_TYPES = [
    "OFFICE_REVIEW",
    "MEMBERSHIP_APPROVAL_NEEDED",
    "INVITATION",
    "ASSIGNEE_CHANGED",
    "VISIT_SCHEDULED",
    "VISIT_CONFIRMED",
    "VISIT_RESCHEDULE_NEEDED",
    "VISIT_COMPLETION_PENDING",
    "VISIT_SUPERVISION_CHECK",
    "SECURITY_ALERT",
    "NOTICE",
    "TRIAL_ENDING",
    "PLAN_CHANGED",
    "PAYMENT",
    "RETURN_SCHEDULED",
    "DELETION_SCHEDULED",
    "SUPPORT_REPLY",
    "TERMS_CHANGED",
    "CONTRACT_EXPIRY",
    "OWNER_TRANSFER",
  ];

  it("서버의 모든 알림 종류에 전용 라벨이 있다", () => {
    expect(SERVER_TYPES).toHaveLength(20);
    for (const type of SERVER_TYPES) {
      expect(notificationTypeLabel(type), type).not.toBe("알림");
    }
  });

  it("대표 이전 알림은 대상 종류와 관계없이 대표 이전 화면 주소를 준다", () => {
    expect(notificationLink("OWNER_TRANSFER", "NONE", null)).toBe("/members/owner-transfer");
    expect(notificationLink("PAYMENT", "SUBSCRIPTION", null)).toBe("/billing");
    expect(notificationLink("SECURITY_ALERT", "NONE", null)).toBeNull();
  });
});

describe("알림 이동 경로", () => {
  it("지원 답변 알림은 문의 상세로 보낸다", () => {
    expect(notificationHref("CONTRACT", 7)).toBe("/contracts/7");
    expect(notificationHref("CONTRACT", null)).toBe("/contracts");
    expect(notificationTypeLabel("TERMS_CHANGED")).toBe("약관·방침 변경");
    expect(notificationHref("NONE", null)).toBeNull();
    expect(notificationHref("SUPPORT_TICKET", 31)).toBe("/support/31");
    expect(notificationHref("SUPPORT_TICKET", null)).toBe("/support");
  });
});
