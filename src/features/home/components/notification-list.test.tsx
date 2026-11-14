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
import { notificationHref, notificationTypeLabel } from "../model/labels";
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
    expect(screen.getByText("방문 확정")).not.toBeNull();
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
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
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
