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
  it("확인을 마치면 기억해 둔 화면으로 돌아가고 주소에서 인가 값을 지운다", async () => {
    rememberStepUpReturn("/settings/office/close?from=settings");
    window.history.replaceState(null, "", "/account/step-up/kakao-callback?code=ok&state=s1");
    render(<KakaoStepUpCallback code="ok-code" state="state-1" hasError={false} />);
    expect(screen.getByRole("status").textContent).toContain("본인 확인을 마치는 중입니다");
    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith("/settings/office/close?from=settings"),
    );
    expect(window.location.search).toBe("");
    expect(takeStepUpReturn()).toBe("/");
  });

  it("인가 값을 서버 콜백에 그대로 전달한다", async () => {
    let query = "";
    server.use(
      http.get("/api/auth/step-up/kakao/callback", ({ request }) => {
        query = new URL(request.url).search;
      }),
    );
    render(<KakaoStepUpCallback code="ok-code" state="state-1" hasError={false} />);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/"));
    expect(query).toBe("?code=ok-code&state=state-1");
  });

  it("다른 카카오 계정이면 같은 계정으로 다시 확인하라고 안내한다", async () => {
    render(<KakaoStepUpCallback code="other-account-code" state="state-1" hasError={false} />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "로그인한 계정에 연결된 카카오 계정이 아닙니다",
    );
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("카카오에서 취소하고 돌아오면 서버에 묻지 않고 안내한다", async () => {
    let calls = 0;
    server.use(
      http.get("/api/auth/step-up/kakao/callback", () => {
        calls += 1;
      }),
    );
    render(<KakaoStepUpCallback code={null} state="state-1" hasError />);
    expect((await screen.findByRole("alert")).textContent).toContain("취소되었거나");
    expect(calls).toBe(0);
  });

  it("실패한 뒤 돌아가기를 누르면 기억해 둔 화면으로 간다", async () => {
    rememberStepUpReturn("/billing");
    const user = userEvent.setup();
    render(<KakaoStepUpCallback code="expired-code" state="state-1" hasError={false} />);
    await user.click(await screen.findByRole("button", { name: "하던 화면으로 돌아가기" }));
    expect(navigation.replace).toHaveBeenCalledWith("/billing");
  });

  it("세션이 끝났으면 다시 로그인하라고 안내한다", async () => {
    server.use(http.get("/api/auth/step-up/kakao/callback", () => mockErrors.unauthenticated()));
    render(<KakaoStepUpCallback code="ok-code" state="state-1" hasError={false} />);
    expect((await screen.findByRole("alert")).textContent).toContain("다시 로그인한 뒤");
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
        <KakaoStepUpCallback code="ok-code" state="state-1" hasError={false} />
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
