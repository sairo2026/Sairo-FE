// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { resetMockWorkState, setMockWorkState } from "@/mocks/handlers/work";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { AUTH_ROUTES } from "../model/routes";
import { OfficeHeaderActions } from "./office-header-actions";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
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
  replace.mockClear();
});

afterAll(() => stopServer());

describe("사무소 상단 동작", () => {
  it("읽지 않은 알림이 있으면 종 버튼 이름에 건수를 알린다", async () => {
    renderOffice(<OfficeHeaderActions />, { role: "OWNER" });
    expect(
      await screen.findByRole("button", { name: "알림 열기, 읽지 않은 알림 1건" }),
    ).toBeTruthy();
  });

  it("읽지 않은 알림이 없으면 건수 없이 알림 열기만 알린다", async () => {
    setMockWorkState({ notifications: [] });
    renderOffice(<OfficeHeaderActions />, { role: "OWNER" });
    expect(await screen.findByRole("button", { name: "알림 열기" })).toBeTruthy();
  });

  it("종을 누르면 알림 패널이 열리고 알림 내용과 전체 알림함 링크를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeHeaderActions />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: /알림 열기/ }));
    const panel = await screen.findByRole("dialog", { name: "알림" });
    expect(await within(panel).findByText("방문 일정이 확정되었습니다.")).toBeTruthy();
    expect(
      within(panel).getByRole("link", { name: "알림함에서 모두 보기" }).getAttribute("href"),
    ).toBe("/notifications");
  });

  it("알림 패널은 닫기 버튼과 ESC로 닫힌다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeHeaderActions />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: /알림 열기/ }));
    await user.click(await screen.findByRole("button", { name: "알림 닫기" }));
    expect(screen.queryByRole("dialog", { name: "알림" })).toBeNull();
    await user.click(screen.getByRole("button", { name: /알림 열기/ }));
    await screen.findByRole("dialog", { name: "알림" });
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "알림" })).toBeNull();
  });

  it("이미 세션이 끝났을 때 로그아웃하면 오류 없이 로그인 화면으로 보낸다", async () => {
    server.use(http.post("/api/auth/logout", () => mockErrors.unauthenticated()));
    const user = userEvent.setup();
    renderOffice(<OfficeHeaderActions />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: /내 계정/ }));
    await user.click(screen.getByRole("button", { name: "로그아웃" }));
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith(AUTH_ROUTES.login));
    expect(screen.queryByText("로그아웃하지 못했습니다. 다시 시도해 주세요.")).toBeNull();
  });

  it("로그아웃이 서버 오류로 실패하면 안내하고 화면에 머문다", async () => {
    server.use(http.post("/api/auth/logout", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<OfficeHeaderActions />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: /내 계정/ }));
    await user.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(await screen.findByText("로그아웃하지 못했습니다. 다시 시도해 주세요.")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("내 계정 메뉴에서 내 계정, 지원, 로그아웃에 닿고 ESC로 닫힌다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeHeaderActions />, { role: "OWNER" });
    const trigger = await screen.findByRole("button", { name: /내 계정/ });
    expect(screen.queryByRole("link", { name: "지원" })).toBeNull();
    await user.click(trigger);
    expect(screen.getByRole("link", { name: "내 계정" }).getAttribute("href")).toBe(
      AUTH_ROUTES.account,
    );
    expect(screen.getByRole("link", { name: "지원" }).getAttribute("href")).toBe(
      AUTH_ROUTES.support,
    );
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("link", { name: "지원" })).toBeNull();
  });
});
