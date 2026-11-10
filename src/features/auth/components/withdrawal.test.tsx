// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  MOCK_WITHDRAWAL_PREVIEW,
  isMockWithdrawn,
  resetMockAccountState,
  setMockWithdrawalPreview,
} from "@/mocks/handlers/account";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { server, startMockServer } from "@/mocks/server";
import { renderWithQuery } from "./test-utils";
import { WithdrawalScreen } from "./withdrawal-screen";
import { describeRetentionPeriod } from "../model/withdrawal-copy";

const navigation = vi.hoisted(() => ({ replace: vi.fn(), back: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace, back: navigation.back }),
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockAccountState();
  navigation.replace.mockClear();
  navigation.back.mockClear();
});

afterAll(() => stopServer());

describe("보관 기간 문구", () => {
  it.each([
    [365, "RECORDED_AT", "기록한 날부터 1년"],
    [1095, "WITHDRAWN_AT", "탈퇴한 날부터 3년"],
    [1825, "ISSUED_AT", "발급한 날부터 5년"],
    [1095, "COMPLETED_AT", "처리 완료 후 3년"],
    [1095, "CLOSED_AT", "문의 종료 후 3년"],
    [90, "RECORDED_AT", "기록한 날부터 90일"],
  ])("%i일 %s는 %s로 쓴다", (days, anchor, expected) => {
    expect(describeRetentionPeriod(days, anchor)).toBe(expected);
  });
});

describe("회원 탈퇴 화면", () => {
  it("탈퇴 안내 본문 네 단락과 보관 항목 표를 보여준다", async () => {
    renderWithQuery(<WithdrawalScreen />);
    expect(await screen.findByRole("heading", { name: "회원 탈퇴" })).not.toBeNull();
    expect(
      screen.getByText(/탈퇴하면 즉시 로그인할 수 없고 사무소 데이터에 접근할 수 없습니다/),
    ).not.toBeNull();
    expect(
      screen.getByText(/삭제 작업에 들어가며 지체 없이 삭제하는 것을 목표로 합니다/),
    ).not.toBeNull();
    expect(screen.getByText(/탈퇴해도 삭제되지 않습니다/)).not.toBeNull();
    expect(screen.getByText(/탈퇴 후에는 복구할 수 없습니다/)).not.toBeNull();
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(
      MOCK_WITHDRAWAL_PREVIEW.retainedItems.length + 1,
    );
    expect(within(table).getByText("개인정보 보호법, 통신비밀보호법")).not.toBeNull();
    expect(within(table).getByText("기록한 날부터 1년")).not.toBeNull();
    expect(within(table).getByText("탈퇴한 날부터 3년")).not.toBeNull();
    expect(within(table).getAllByText("기록한 날부터 5년").length).toBeGreaterThan(0);
    expect(screen.getByText(/근거를 확인하지 못한 항목은 탈퇴 때 함께 파기되며/)).not.toBeNull();
    expect(screen.queryByText(/카카오 계정 연결도 함께/)).toBeNull();
  });

  it("카카오 계정 이용자에게는 연결 끊기 안내를 보여준다", async () => {
    setMockWithdrawalPreview({ ...MOCK_WITHDRAWAL_PREVIEW, kakaoLinked: true });
    renderWithQuery(<WithdrawalScreen />);
    expect(
      await screen.findByText(
        "카카오 계정 연결도 함께 해제를 요청합니다. 요청이 실패하면 자동으로 다시 시도합니다.",
      ),
    ).not.toBeNull();
  });

  it("확인 체크 없이는 탈퇴하지 않고 체크하면 탈퇴한 뒤 로그인으로 보낸다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<WithdrawalScreen />);
    await user.click(await screen.findByRole("button", { name: "탈퇴하기" }));
    expect((await screen.findByRole("alert")).textContent).toBe("탈퇴 안내를 확인해 주세요.");
    expect(isMockWithdrawn()).toBe(false);
    await user.click(screen.getByLabelText("위 내용을 확인했습니다."));
    await user.click(screen.getByRole("button", { name: "탈퇴하기" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/login"));
    expect(isMockWithdrawn()).toBe(true);
  });

  it("마지막 대표는 탈퇴 대신 대표 이전과 사무소 종료를 안내받는다", async () => {
    setMockWithdrawalPreview({ ...MOCK_WITHDRAWAL_PREVIEW, isOwner: true, isLastOwner: true });
    renderWithQuery(<WithdrawalScreen />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "대표님이 사무소의 유일한 대표라서 바로 탈퇴할 수 없습니다. 아래 중 하나를 먼저 진행해 주세요.",
    );
    expect(within(alert).getByRole("link", { name: "다른 구성원에게 대표 이전" })).not.toBeNull();
    expect(within(alert).getByRole("link", { name: "사무소 종료" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "탈퇴하기" })).toBeNull();
  });

  it("재인증이 필요하면 본인 확인 문구를, 그 밖의 실패면 변경 없음 문구를 보여준다", async () => {
    const user = userEvent.setup();
    server.use(http.delete("/api/me", () => errorResponse(401, "STEP_UP_REQUIRED", "재인증")));
    renderWithQuery(<WithdrawalScreen />);
    await user.click(await screen.findByLabelText("위 내용을 확인했습니다."));
    await user.click(screen.getByRole("button", { name: "탈퇴하기" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "본인 확인이 필요합니다. 비밀번호 또는 카카오 계정으로 다시 인증해 주세요.",
      ),
    );
    server.use(http.delete("/api/me", () => mockErrors.server()));
    await user.click(screen.getByRole("button", { name: "탈퇴하기" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "탈퇴 처리 중 문제가 생겨 아무것도 변경되지 않았습니다. 잠시 후 다시 시도해 주세요.",
      ),
    );
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("미리보기를 불러오지 못하면 오류 화면에서 다시 시도할 수 있다", async () => {
    server.use(http.get("/api/me/withdrawal-preview", () => mockErrors.server()));
    const user = userEvent.setup();
    renderWithQuery(<WithdrawalScreen />);
    expect(await screen.findByRole("button", { name: /다시 시도/ })).not.toBeNull();
    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: /다시 시도/ }));
    expect(await screen.findByRole("heading", { name: "회원 탈퇴" })).not.toBeNull();
  });
});
