// @vitest-environment jsdom
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { operatorQueryKey } from "@/features/auth/hooks/use-auth-context";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { MOCK_OTP_CODE, resetMockOpsSession, setMockOperator } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderPublicScreen } from "../../home/testing/render-ops-screen";
import { OpsLoginScreen } from "./ops-login-screen";
import { OpsMfaScreen } from "./ops-mfa-screen";

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace, back: vi.fn() }),
  usePathname: () => "/ops/login",
  useSearchParams: () => new URLSearchParams(),
}));

let stopServer: () => void;
beforeAll(() => {
  stopServer = startMockServer();
});
beforeEach(() => {
  setMockOperator(null);
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockOpsSession();
  replace.mockClear();
});
afterAll(() => stopServer());

describe("운영자 로그인 화면", () => {
  it("카카오 시작 링크와 만료 규칙 안내를 보인다", () => {
    renderPublicScreen(<OpsLoginScreen />);
    expect(screen.getByRole("link", { name: "카카오로 시작" }).getAttribute("href")).toBe(
      "/api/ops/auth/kakao/start",
    );
    expect(screen.getByText(/30분 동안 활동이 없으면/)).not.toBeNull();
    expect(screen.getByText(/8시간이 지나면/)).not.toBeNull();
    expect(screen.getByText(/최근 5분 이내 재인증/)).not.toBeNull();
  });

  it("허용되지 않은 계정 오류는 운영자 존재 여부를 드러내지 않는다", () => {
    renderPublicScreen(<OpsLoginScreen errorCode="OPERATOR_NOT_ALLOWED" />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("접근할 수 없습니다");
    expect(alert.textContent).not.toMatch(/등록되지 않|비활성|존재/);
  });

  it("인가 값 오류와 요청 제한 오류는 다시 시작하라고 안내한다", () => {
    renderPublicScreen(<OpsLoginScreen errorCode="INVALID_REQUEST" />);
    expect(screen.getByRole("alert").textContent).toContain("카카오 인증을 마치지 못했습니다");
    cleanup();
    renderPublicScreen(<OpsLoginScreen errorCode="RATE_LIMITED" />);
    expect(screen.getByRole("alert").textContent).toContain("요청이 많아");
  });

  it("알 수 없는 오류 코드는 안내를 만들지 않는다", () => {
    renderPublicScreen(<OpsLoginScreen errorCode="SOMETHING_ELSE" />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("30분 무활동 만료와 8시간 절대 만료를 따로 안내한다", () => {
    const { unmount } = renderPublicScreen(<OpsLoginScreen reason="idle" />);
    expect(screen.getByRole("status").textContent).toContain("30분 동안 활동이 없어");
    unmount();
    renderPublicScreen(<OpsLoginScreen reason="absolute" />);
    expect(screen.getByRole("status").textContent).toContain("8시간이 지나");
  });

  it("이미 로그인한 운영자는 운영 홈으로 보낸다", async () => {
    resetMockOpsSession();
    renderPublicScreen(<OpsLoginScreen />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/ops"));
    expect(screen.getByText(/운영 홈으로 이동합니다/)).not.toBeNull();
  });

  it("로그아웃 상태에서는 이동하지 않고 로그인 화면을 유지한다", async () => {
    renderPublicScreen(<OpsLoginScreen />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "카카오로 시작" })).not.toBeNull();
  });
});

describe("운영자 2차 인증 화면", () => {
  it("6자리가 아니면 요청하지 않고 안내한다", async () => {
    let called = false;
    server.use(
      http.post("/api/ops/auth/mfa/verify", () => {
        called = true;
        return HttpResponse.json({});
      }),
    );
    renderPublicScreen(<OpsMfaScreen />);
    await userEvent.type(screen.getByLabelText("확인 코드"), "123");
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(screen.getByText("인증 앱의 6자리 숫자를 입력해 주세요.")).not.toBeNull();
    expect(called).toBe(false);
  });

  it("숫자 외 문자는 입력되지 않는다", async () => {
    renderPublicScreen(<OpsMfaScreen />);
    const input = screen.getByLabelText("확인 코드") as HTMLInputElement;
    await userEvent.type(input, "12ab34");
    expect(input.value).toBe("1234");
  });

  it("성공하면 운영자 조회 캐시를 갱신하고 운영 홈으로 이동한다", async () => {
    const { queryClient } = renderPublicScreen(<OpsMfaScreen />);
    queryClient.setQueryData(operatorQueryKey, { operatorId: 99, name: "이전 운영자", roles: [] });
    await userEvent.type(screen.getByLabelText("확인 코드"), MOCK_OTP_CODE);
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/ops"));
    expect(queryClient.getQueryData(operatorQueryKey)).toMatchObject({ name: "운영 김사이" });
  });

  it("틀릴 때마다 틀린 횟수를 알리고 잠금 규칙을 안내한다", async () => {
    renderPublicScreen(<OpsMfaScreen />);
    await userEvent.type(screen.getByLabelText("확인 코드"), "000000");
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    expect((await screen.findByRole("alert")).textContent).toContain("현재 1회");
    await userEvent.type(screen.getByLabelText("확인 코드"), "000001");
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("현재 2회"));
    expect(screen.getByRole("alert").textContent).toContain("15분 동안 잠깁니다");
  });

  it("서버가 남은 횟수를 주면 그 값을 보인다", async () => {
    server.use(
      http.post("/api/ops/auth/mfa/verify", () =>
        errorResponse(401, "MFA_CODE_INVALID", "확인 코드가 맞지 않습니다.", {
          remainingAttempts: 3,
        }),
      ),
    );
    renderPublicScreen(<OpsMfaScreen />);
    await userEvent.type(screen.getByLabelText("확인 코드"), "000000");
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    expect((await screen.findByRole("alert")).textContent).toContain("3회 더 틀리면");
  });

  it("연속 5회 틀리면 15분 잠금을 안내하고 입력을 막는다", async () => {
    renderPublicScreen(<OpsMfaScreen />);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await userEvent.type(screen.getByLabelText("확인 코드"), "000000");
      await userEvent.click(screen.getByRole("button", { name: "확인" }));
      await waitFor(() => expect(screen.getByRole("alert")).not.toBeNull());
    }
    await userEvent.type(screen.getByLabelText("확인 코드"), "000000");
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("잠겼습니다"));
    expect(screen.getByRole("alert").textContent).toContain("15분");
    expect((screen.getByLabelText("확인 코드") as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "확인" }).getAttribute("aria-disabled")).toBe("true");
  });

  it("잠금 응답은 남은 시간을 서버 값으로 보인다", async () => {
    server.use(
      http.post("/api/ops/auth/mfa/verify", () =>
        errorResponse(429, "MFA_LOCKED", "잠금", { retryAfterSeconds: 600 }),
      ),
    );
    renderPublicScreen(<OpsMfaScreen />);
    await userEvent.type(screen.getByLabelText("확인 코드"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/(9분|10분)/);
  });

  it("대기 세션이 없으면 로그인으로 안내한다", async () => {
    server.use(http.post("/api/ops/auth/mfa/verify", () => mockErrors.unauthenticated()));
    renderPublicScreen(<OpsMfaScreen />);
    await userEvent.type(screen.getByLabelText("확인 코드"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    expect((await screen.findByRole("alert")).textContent).toContain("진행 중인 로그인이 없");
    expect(screen.getByRole("link", { name: "운영자 로그인으로 이동" }).getAttribute("href")).toBe(
      "/ops/login",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("검증 실패 응답은 입력 칸 아래에 보인다", async () => {
    server.use(
      http.post("/api/ops/auth/mfa/verify", () =>
        mockErrors.validation([{ field: "otpCode", message: "코드 형식이 올바르지 않습니다." }]),
      ),
    );
    renderPublicScreen(<OpsMfaScreen />);
    await userEvent.type(screen.getByLabelText("확인 코드"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(await screen.findByText("코드 형식이 올바르지 않습니다.")).not.toBeNull();
  });

  it("서버 오류는 일반 오류 안내를 보인다", async () => {
    server.use(http.post("/api/ops/auth/mfa/verify", () => mockErrors.server()));
    renderPublicScreen(<OpsMfaScreen />);
    await userEvent.type(screen.getByLabelText("확인 코드"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    expect((await screen.findByRole("alert")).textContent).toContain("확인하지 못했습니다");
    expect(replace).not.toHaveBeenCalled();
  });
});
