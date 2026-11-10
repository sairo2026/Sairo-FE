// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { MOCK_OTP_CODE, resetMockOpsSession, setMockOperator } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { ApiError } from "@/shared/api/client";
import { createQueryClient } from "@/shared/api/query-client";
import { OpsReasonDialog } from "./components/common/ops-reason-dialog";
import { OpsRoleGate } from "./components/common/ops-role-gate";
import { OpsStepUpDialog } from "./components/common/ops-step-up-dialog";
import { activeMenuKey, visibleMenu } from "./model/menu";
import { describeOpsError } from "./model/ops-errors";
import { OpsSessionProvider } from "./model/ops-session";
import { hasAnyRole, toOpsRoles } from "./model/roles";
import type { OpsRole } from "./model/roles";

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
});
afterAll(() => stopServer());

function withSession(roles: OpsRole[], ui: ReactNode) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <OpsSessionProvider value={{ operatorId: 1, name: "운영 김사이", roles }}>
        {ui}
      </OpsSessionProvider>
    </QueryClientProvider>,
  );
}

describe("운영 역할과 메뉴", () => {
  it("알 수 없는 역할 코드는 걸러낸다", () => {
    expect(toOpsRoles(["REVIEW", "UNKNOWN", "OPS"])).toEqual(["REVIEW", "OPS"]);
  });

  it("필요한 역할이 비어 있으면 누구나 쓰고 있으면 하나라도 가져야 한다", () => {
    expect(hasAnyRole([], [])).toBe(true);
    expect(hasAnyRole(["OPS"], ["REVIEW"])).toBe(false);
    expect(hasAnyRole(["OPS", "REVIEW"], ["REVIEW"])).toBe(true);
  });

  it("경영조회는 회원 메뉴가 없고 심사담당만 인증 심사 메뉴를 본다", () => {
    const exec = visibleMenu(["EXEC_VIEW"]).map((item) => item.key);
    expect(exec).toContain("offices");
    expect(exec).not.toContain("members");
    expect(exec).not.toContain("registrations");
    expect(visibleMenu(["REVIEW"]).map((item) => item.key)).toContain("registrations");
    expect(visibleMenu(["SECURITY_ADMIN"]).map((item) => item.key)).toContain("operators");
  });

  it("경로로 현재 메뉴를 찾는다", () => {
    expect(activeMenuKey("/ops")).toBe("home");
    expect(activeMenuKey("/ops/registrations/12")).toBe("registrations");
    expect(activeMenuKey("/ops/audit-log")).toBe("operators");
    expect(activeMenuKey("/office")).toBeUndefined();
  });
});

describe("역할 가드", () => {
  it("역할이 없으면 화면 대신 접근 불가 안내를 보인다", () => {
    withSession(["SUPPORT"], <OpsRoleGate roles={["REVIEW"]}>심사 화면</OpsRoleGate>);
    expect(screen.getByRole("alert").textContent).toContain("심사담당");
    expect(screen.queryByText("심사 화면")).toBeNull();
  });

  it("역할이 있으면 화면을 보인다", () => {
    withSession(["REVIEW"], <OpsRoleGate roles={["REVIEW"]}>심사 화면</OpsRoleGate>);
    expect(screen.getByText("심사 화면")).toBeTruthy();
  });
});

describe("운영 오류 문구", () => {
  it("코드별 문구를 서버 메시지보다 우선한다", () => {
    const error = new ApiError(403, { code: "SELF_APPROVAL_FORBIDDEN", message: "x" });
    expect(describeOpsError(error)).toContain("직접 승인할 수 없습니다");
  });

  it("429는 기다릴 시간을 알린다", () => {
    const error = new ApiError(429, { code: "RATE_LIMITED", message: "x", retryAfterSeconds: 90 });
    expect(describeOpsError(error)).toContain("1분 30초");
  });
});

describe("사유 입력 대화상자", () => {
  it("사유가 비어 있으면 실행할 수 없고 입력하면 사유를 넘긴다", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <OpsReasonDialog
        isOpen
        title="반려"
        confirmLabel="반려하기"
        onSubmit={onSubmit}
        onClose={onClose}
      />,
    );
    const confirm = screen.getByRole("button", { name: "반려하기" });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    await userEvent.type(screen.getByLabelText("사유"), "  서류 불일치  ");
    await userEvent.click(confirm);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("서류 불일치"));
    expect(onClose).toHaveBeenCalled();
  });

  it("처리가 실패하면 대화상자를 닫지 않고 오류를 보인다", async () => {
    const onClose = vi.fn();
    render(
      <OpsReasonDialog
        isOpen
        title="반려"
        confirmLabel="반려하기"
        onSubmit={() =>
          Promise.reject(new ApiError(409, { code: "INVALID_TRANSITION", message: "x" }))
        }
        onClose={onClose}
      />,
    );
    await userEvent.type(screen.getByLabelText("사유"), "사유");
    await userEvent.click(screen.getByRole("button", { name: "반려하기" }));
    expect((await screen.findByRole("alert")).textContent).toContain("지금 상태에서는");
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("운영자 재인증 대화상자", () => {
  it("6자리가 아니면 요청하지 않는다", async () => {
    const onSuccess = vi.fn();
    render(<OpsStepUpDialog onSuccess={onSuccess} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("확인 코드"), "12");
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(screen.getByText("인증 앱의 6자리 숫자를 입력해 주세요.")).toBeTruthy();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("맞는 코드면 성공을 알린다", async () => {
    setMockOperator({ operatorId: 1, name: "운영", roles: ["OPS"] });
    const onSuccess = vi.fn();
    render(<OpsStepUpDialog onSuccess={onSuccess} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("확인 코드"), MOCK_OTP_CODE);
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("틀린 코드가 5회 쌓이면 잠금을 안내한다", async () => {
    setMockOperator({ operatorId: 1, name: "운영", roles: ["OPS"] });
    render(<OpsStepUpDialog onSuccess={vi.fn()} onCancel={vi.fn()} />);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await userEvent.type(screen.getByLabelText("확인 코드"), "000000");
      await userEvent.click(screen.getByRole("button", { name: "확인" }));
      await screen.findByText(
        `연속 5회 틀리면 15분 동안 잠깁니다. 현재 ${attempt + 1}회 틀렸습니다.`,
      );
    }
    await userEvent.type(screen.getByLabelText("확인 코드"), MOCK_OTP_CODE);
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(await screen.findByText(/15분 뒤에 다시 시도/)).toBeTruthy();
  });

  it("서버 오류는 일반 안내로 바꾼다", async () => {
    server.use(http.post("/api/ops/auth/step-up", () => mockErrors.server()));
    render(<OpsStepUpDialog onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("확인 코드"), MOCK_OTP_CODE);
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(await screen.findByText(/재인증하지 못했습니다/)).toBeTruthy();
  });
});
