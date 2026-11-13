// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { resetMockAuthState } from "@/mocks/handlers/auth";
import { server, startMockServer } from "@/mocks/server";
import { getStepUpHandler, setStepUpHandler } from "@/shared/api/auth-events";
import { rememberStepUpReturn, takeStepUpReturn } from "@/shared/lib/step-up-return";
import { AuthEventsProvider } from "./auth-events-provider";
import { KakaoStepUpCallback } from "./kakao-step-up-callback";
import { MarketingUnsubscribe } from "./marketing-unsubscribe";
import { renderWithQuery } from "./test-utils";

const navigation = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace, push: navigation.push }),
  usePathname: () => "/settings/office/close",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

beforeEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockAuthState();
  setStepUpHandler(null);
  navigation.replace.mockClear();
  vi.unstubAllGlobals();
});

afterAll(() => stopServer());

describe("카카오 재인증 콜백", () => {
  it("오류 없이 이동해 오면 기억해 둔 화면으로 돌아가고 주소에서 쿼리를 지운다", async () => {
    rememberStepUpReturn("/settings/office/close?from=settings");
    window.history.replaceState(null, "", "/auth/kakao/step-up/callback");
    render(<KakaoStepUpCallback error={null} />);
    expect(screen.getByRole("status").textContent).toContain("본인 확인을 마치는 중입니다");
    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith("/settings/office/close?from=settings"),
    );
    expect(window.location.search).toBe("");
    expect(takeStepUpReturn()).toBe("/home");
  });

  it("다른 카카오 계정이면 같은 계정으로 다시 확인하라고 안내한다", async () => {
    render(<KakaoStepUpCallback error="STEP_UP_ACCOUNT_MISMATCH" />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "로그인한 계정에 연결된 카카오 계정이 아닙니다",
    );
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("인가 값 오류나 취소는 취소 안내를 보인다", async () => {
    render(<KakaoStepUpCallback error="INVALID_REQUEST" />);
    expect((await screen.findByRole("alert")).textContent).toContain("취소되었거나");
  });

  it("실패한 뒤 돌아가기를 누르면 기억해 둔 화면으로 간다", async () => {
    rememberStepUpReturn("/billing");
    const user = userEvent.setup();
    render(<KakaoStepUpCallback error="INVALID_REQUEST" />);
    await user.click(await screen.findByRole("button", { name: "하던 화면으로 돌아가기" }));
    expect(navigation.replace).toHaveBeenCalledWith("/billing");
  });

  it("세션이 끝났으면 다시 로그인하라고 안내한다", async () => {
    render(<KakaoStepUpCallback error="UNAUTHENTICATED" />);
    expect((await screen.findByRole("alert")).textContent).toContain("다시 로그인한 뒤");
    expect(screen.queryByRole("button", { name: "하던 화면으로 돌아가기" })).toBeNull();
  });

  it("세션이 끝난 경우 로그인 화면으로 이동할 수 있다", async () => {
    const user = userEvent.setup();
    render(<KakaoStepUpCallback error="UNAUTHENTICATED" />);
    await user.click(await screen.findByRole("button", { name: "로그인으로 이동" }));
    expect(navigation.replace).toHaveBeenCalledWith("/login");
  });

  it("알 수 없는 오류 코드는 일반 실패 안내를 보인다", async () => {
    render(<KakaoStepUpCallback error="SOMETHING_ELSE" />);
    expect((await screen.findByRole("alert")).textContent).toContain("본인 확인을 하지 못했습니다");
  });
});

describe("재인증 대화상자와 카카오 이동", () => {
  it("카카오로 확인을 누르면 지금 화면을 기억하고 카카오 재인증으로 이동한다", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", {
      ...window.location,
      pathname: "/settings/office/close",
      search: "?step=confirm",
      assign,
    });
    const user = userEvent.setup();
    renderWithQuery(
      <AuthEventsProvider>
        <p>화면</p>
      </AuthEventsProvider>,
    );
    const handler = getStepUpHandler();
    if (!handler) throw new Error("재인증 처리기가 없습니다.");
    void handler();
    await user.click(await screen.findByRole("button", { name: "카카오로 확인" }));
    expect(assign).toHaveBeenCalledWith("/api/auth/step-up/kakao/start");
    vi.unstubAllGlobals();
    expect(takeStepUpReturn()).toBe("/settings/office/close?step=confirm");
  });

  it("카카오 확인을 마치고 돌아오면 하던 작업을 다시 진행하라고 알리고 닫을 수 있다", async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <AuthEventsProvider>
        <KakaoStepUpCallback error={null} />
      </AuthEventsProvider>,
    );
    expect(
      await screen.findByText(
        "카카오로 본인 확인을 마쳤습니다. 10분 안에 하던 작업을 다시 진행해 주세요.",
      ),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "본인 확인 알림 닫기" }));
    expect(screen.queryByText(/카카오로 본인 확인을 마쳤습니다/)).toBeNull();
  });
});

describe("광고성 수신 거부 결과 통지", () => {
  it("결과 이메일이 예약되지 않으면 이메일 통지 안내를 보이지 않는다", async () => {
    const user = userEvent.setup();
    render(<MarketingUnsubscribe token="no-email-token-000000" />);
    await user.click(screen.getByRole("button", { name: "수신 거부" }));
    expect(await screen.findByText("수신 거부를 처리했습니다")).toBeTruthy();
    expect(screen.queryByText(/이메일로 알려드립니다/)).toBeNull();
  });

  it("요청이 몰리면 잠시 뒤 다시 시도하라고 안내한다", async () => {
    server.use(http.post("/api/public/marketing-unsubscribe", () => mockErrors.rateLimited(30)));
    const user = userEvent.setup();
    render(<MarketingUnsubscribe token="valid-token-0000000000" />);
    await user.click(screen.getByRole("button", { name: "수신 거부" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/다시 시도/);
    expect(screen.getByRole("button", { name: "수신 거부" })).toBeTruthy();
  });
});
