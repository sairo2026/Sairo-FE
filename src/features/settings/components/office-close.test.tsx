// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetSettingsState, settingsState } from "@/mocks/handlers/settings";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { OfficeCloseScreen } from "./office-close-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/office/close",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetSettingsState();
});

afterAll(() => stopServer());

describe("사무소 종료 확인", () => {
  it("종료 효과와 구성원 수, 구독 현황, 자료 반환 기간을 보여준다", async () => {
    renderOffice(<OfficeCloseScreen />, { role: "OWNER" });
    expect(
      screen.getByText(/모든 구성원의 업무 접근이 바로 끝나고 소속이 풀립니다/),
    ).not.toBeNull();
    expect(screen.getByText(/구독이 종료되고 자동결제가 멈춥니다/)).not.toBeNull();
    expect(await screen.findByText(/^\d+명$/)).not.toBeNull();
    expect(screen.getAllByText(/종료한 날부터 30일 동안 일반 업무 자료를/).length).toBeGreaterThan(
      0,
    );
  });

  it("대표가 아니면 권한 없음을 보여준다", () => {
    renderOffice(<OfficeCloseScreen />, { role: "AGENT" });
    expect(screen.getByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("보관계약 선택과 종료 확인이 없으면 종료하지 않는다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeCloseScreen />, { role: "OWNER" });
    await user.click(screen.getByRole("button", { name: "사무소 종료" }));
    expect(screen.getByText("보관계약 신청 여부를 선택해 주세요.")).not.toBeNull();
    expect(screen.getByText("종료 확인에 체크해 주세요.")).not.toBeNull();
    expect(settingsState.closeCount).toBe(0);
  });

  it("보관계약을 신청하지 않고 종료하면 반환 권한 만료일을 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeCloseScreen />, { role: "OWNER" });
    await user.click(screen.getByLabelText("신청하지 않습니다"));
    await user.click(screen.getByLabelText("위 내용을 확인했고 사무소를 종료합니다."));
    await user.click(screen.getByRole("button", { name: "사무소 종료" }));
    expect(await screen.findByText("사무소가 종료되었습니다")).not.toBeNull();
    expect(screen.getByText("반환 권한 만료일은 2026-12-10 09:00입니다.")).not.toBeNull();
    expect(screen.queryByText(/보관계약 신청이 접수되었습니다/)).toBeNull();
    expect(screen.getByRole("link", { name: "자료 반환 안내" }).getAttribute("href")).toBe(
      "/billing/return-guide",
    );
  });

  it("보관계약을 신청하면 운영자 승인 안내를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<OfficeCloseScreen />, { role: "OWNER" });
    await user.click(screen.getByLabelText("신청합니다"));
    await user.click(screen.getByLabelText("위 내용을 확인했고 사무소를 종료합니다."));
    await user.click(screen.getByRole("button", { name: "사무소 종료" }));
    expect(
      await screen.findByText(/보관계약 신청이 접수되었습니다. 운영자 승인 뒤/),
    ).not.toBeNull();
  });

  it("재인증이 없으면 본인 확인 안내를 보여준다", async () => {
    server.use(
      http.post("/api/offices/current/close", () =>
        errorResponse(401, "STEP_UP_REQUIRED", "본인 확인"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<OfficeCloseScreen />, { role: "OWNER" });
    await user.click(screen.getByLabelText("신청하지 않습니다"));
    await user.click(screen.getByLabelText("위 내용을 확인했고 사무소를 종료합니다."));
    await user.click(screen.getByRole("button", { name: "사무소 종료" }));
    expect(await screen.findByText(/본인 확인이 필요합니다/)).not.toBeNull();
  });

  it("서버가 403으로 거절하면 권한 문구를 보여준다", async () => {
    server.use(http.post("/api/offices/current/close", () => mockErrors.forbidden()));
    const user = userEvent.setup();
    renderOffice(<OfficeCloseScreen />, { role: "OWNER" });
    await user.click(screen.getByLabelText("신청하지 않습니다"));
    await user.click(screen.getByLabelText("위 내용을 확인했고 사무소를 종료합니다."));
    await user.click(screen.getByRole("button", { name: "사무소 종료" }));
    expect(await screen.findByText("이 작업을 할 권한이 없습니다.")).not.toBeNull();
  });

  it("구성원과 구독 조회가 실패해도 종료 화면은 보인다", async () => {
    server.use(
      http.get("/api/offices/current/memberships", () => mockErrors.server()),
      http.get("/api/subscriptions/current", () => mockErrors.server()),
    );
    renderOffice(<OfficeCloseScreen />, { role: "OWNER" });
    expect((await screen.findAllByText("불러오지 못했습니다")).length).toBe(2);
    expect(screen.getByRole("button", { name: "사무소 종료" })).not.toBeNull();
  });
});
