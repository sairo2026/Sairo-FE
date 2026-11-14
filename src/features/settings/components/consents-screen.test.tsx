// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { MOCK_ME, getMockMe, resetMockAccountState, setMockMe } from "@/mocks/handlers/account";
import { resetSettingsState, settingsState } from "@/mocks/handlers/settings";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { ConsentsScreen } from "./consents-screen";

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockAccountState();
  resetSettingsState();
});

afterAll(() => stopServer());

function seedMe(marketingAgreed = true) {
  setMockMe({
    ...MOCK_ME,
    termsAgreements: [
      {
        termsCode: "TOS",
        termsName: "이용약관",
        required: true,
        withdrawable: false,
        termsVersion: "1.0",
        agreed: true,
        recordedAt: "2026-10-01T09:00:00+09:00",
      },
      {
        termsCode: "MARKETING",
        termsName: "이메일 공지·혜택 안내 수신 동의",
        required: false,
        withdrawable: true,
        termsVersion: "1.0",
        agreed: marketingAgreed,
        recordedAt: "2026-11-01T09:00:00+09:00",
      },
    ],
    notificationPreferences: {
      channels: { VISIT_REMINDER: true, MARKETING: marketingAgreed, SECURITY: true },
      mandatoryTypes: [],
    },
  });
}

function open(isReadOnly = false) {
  return renderOffice(<ConsentsScreen />, { role: "AGENT", isReadOnly });
}

describe("동의 내역", () => {
  it("현재 동의 상태와 필수·선택 구분을 보여준다", async () => {
    seedMe();
    open();
    const table = await screen.findByRole("table", { name: "현재 동의 상태" });
    expect(within(table).getByText("이용약관")).not.toBeNull();
    expect(within(table).getByText("필수")).not.toBeNull();
    expect(within(table).getByText("선택")).not.toBeNull();
    expect(within(table).getAllByText("동의함")).toHaveLength(2);
    expect(
      within(table).getByText(/이용약관 동의는 철회할 수 없습니다. 이용을 멈추려면 회원 탈퇴를/),
    ).not.toBeNull();
    expect(within(table).getAllByRole("button", { name: "철회" })).toHaveLength(1);
  });

  it("항목, 버전, 상태, 처리 시각, 경로 열로 이력을 보여준다", async () => {
    seedMe();
    open();
    const table = await screen.findByRole("table", { name: "동의·철회 이력" });
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((node) => node.textContent);
    expect(headers).toEqual(["항목", "버전", "상태", "처리 시각", "경로"]);
    expect(await within(table).findByText("이메일 가입")).not.toBeNull();
    expect(within(table).getByText("내 정보 화면")).not.toBeNull();
    expect(within(table).getByText("이전 기록(경로 미기록)")).not.toBeNull();
    expect(within(table).getByText("철회함")).not.toBeNull();
    expect(within(table).getAllByText("동의함")).toHaveLength(2);
  });

  it("선택 약관을 철회하면 이력이 새로 고쳐진다", async () => {
    seedMe();
    const user = userEvent.setup();
    open();
    const current = await screen.findByRole("table", { name: "현재 동의 상태" });
    await user.click(within(current).getByRole("button", { name: "철회" }));
    expect(await screen.findByText("동의를 철회했습니다.")).not.toBeNull();
    await waitFor(() => expect(getMockMe().termsAgreements[1]?.agreed).toBe(false));
    expect(settingsState.termsHistory[0]).toMatchObject({ agreed: false, termsCode: "MARKETING" });
    const history = screen.getByRole("table", { name: "동의·철회 이력" });
    await waitFor(() => expect(within(history).getAllByText("철회함")).toHaveLength(2));
  });

  it("철회된 선택 약관은 토글로 다시 켤 수 있다", async () => {
    seedMe(false);
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("switch", { name: "이메일로 공지·혜택 안내 받기" }));
    await user.click(screen.getByLabelText("공지·혜택 안내 수신에 동의합니다."));
    await user.click(screen.getByRole("button", { name: "동의하고 켜기" }));
    expect(await screen.findByText(/공지·혜택 안내 수신에 동의했습니다/)).not.toBeNull();
    const history = screen.getByRole("table", { name: "동의·철회 이력" });
    await waitFor(() => expect(within(history).getAllByText("동의함").length).toBeGreaterThan(2));
  });

  it("이력이 없으면 빈 안내를 보여준다", async () => {
    seedMe();
    settingsState.termsHistory = [];
    open();
    expect(await screen.findByText("동의·철회 이력이 없습니다.")).not.toBeNull();
  });

  it("이력 조회가 실패하면 다시 시도할 수 있다", async () => {
    seedMe();
    server.use(http.get("/api/me/terms-agreements", () => mockErrors.server()));
    open();
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "다시 시도" })).not.toBeNull();
  });

  it("현재 동의 상태 조회가 실패하면 오류 화면을 보여준다", async () => {
    server.use(http.get("/api/me", () => mockErrors.forbidden()));
    open();
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("이력이 여러 쪽이면 다음 쪽을 불러온다", async () => {
    seedMe();
    settingsState.termsHistory = Array.from({ length: 30 }, (_, index) => ({
      agreementId: index + 1,
      termsCode: "MARKETING",
      termsName: "이메일 공지·혜택 안내 수신 동의",
      version: `1.${index}`,
      agreed: index % 2 === 0,
      consentPath: "ACCOUNT_SETTINGS",
      recordedAt: "2026-11-01T09:00:00+09:00",
    }));
    const user = userEvent.setup();
    open();
    const history = await screen.findByRole("table", { name: "동의·철회 이력" });
    expect(await within(history).findByText("1.0")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: /다음/ }));
    expect(await within(history).findByText("1.28")).not.toBeNull();
  });

  it("읽기 전용이면 철회와 토글을 막는다", async () => {
    seedMe();
    open(true);
    const current = await screen.findByRole("table", { name: "현재 동의 상태" });
    expect(
      within(current).getByRole("button", { name: "철회" }).getAttribute("aria-disabled"),
    ).toBe("true");
    expect(
      (screen.getByRole("switch", { name: "이메일로 공지·혜택 안내 받기" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
