// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { resetBillingState } from "@/mocks/handlers/billing";
import {
  buildMockNotification,
  getMockWorkState,
  resetMockWorkState,
  setMockWorkState,
} from "@/mocks/handlers/work";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { NotificationPanel } from "./notification-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/home",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockWorkState();
  resetBillingState();
});

afterAll(() => stopServer());

describe("알림 패널", () => {
  it("대표의 카드 미등록 안내를 홈 본문 대신 알림 패널에 보여준다", async () => {
    renderOffice(<NotificationPanel onClose={vi.fn()} onNavigate={vi.fn()} />, { role: "OWNER" });
    const panel = await screen.findByRole("dialog", { name: "알림" });
    expect(
      (await within(panel).findByRole("link", { name: "카드 등록 안내" })).getAttribute("href"),
    ).toBe("/billing/card-guide");
    cleanup();
    renderOffice(<NotificationPanel onClose={vi.fn()} onNavigate={vi.fn()} />, { role: "AGENT" });
    expect(screen.queryByRole("link", { name: "카드 등록 안내" })).toBeNull();
  });

  it("이동할 화면이 없는 읽지 않은 알림은 눌러서 읽음 처리한다", async () => {
    setMockWorkState({
      notifications: [
        buildMockNotification({
          notificationId: 7,
          type: "NOTICE",
          message: "공지입니다.",
          targetType: "NONE",
          targetId: null,
        }),
      ],
    });
    const user = userEvent.setup();
    renderOffice(<NotificationPanel onClose={vi.fn()} onNavigate={vi.fn()} />, { role: "OWNER" });
    const panel = await screen.findByRole("dialog", { name: "알림" });
    await user.click(await within(panel).findByRole("button", { name: "공지입니다. 읽음 처리" }));
    await waitFor(() => expect(getMockWorkState().notifications[0]?.read).toBe(true));
    await waitFor(() =>
      expect(within(panel).queryByRole("button", { name: "공지입니다. 읽음 처리" })).toBeNull(),
    );
  });

  it("이미 읽은 알림은 누를 수 있는 항목으로 만들지 않는다", async () => {
    setMockWorkState({
      notifications: [
        buildMockNotification({
          notificationId: 8,
          type: "NOTICE",
          message: "읽은 공지입니다.",
          targetType: "NONE",
          targetId: null,
          read: true,
        }),
      ],
    });
    renderOffice(<NotificationPanel onClose={vi.fn()} onNavigate={vi.fn()} />, { role: "OWNER" });
    const panel = await screen.findByRole("dialog", { name: "알림" });
    expect(await within(panel).findByText("읽은 공지입니다.")).not.toBeNull();
    expect(within(panel).queryByRole("button", { name: /읽음 처리/ })).toBeNull();
  });
});
