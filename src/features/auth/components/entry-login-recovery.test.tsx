// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMockAccountState } from "@/mocks/handlers/account";
import { resetMockAuthState } from "@/mocks/handlers/auth";
import { mockErrors } from "@/mocks/error-responses";
import { server, startMockServer } from "@/mocks/server";
import { AuthEntry } from "./auth-entry";
import { EmailLoginForm } from "./email-login-form";
import { MarketingUnsubscribe } from "./marketing-unsubscribe";
import { PasswordResetForm, PasswordResetRequestForm } from "./password-recovery";
import { renderWithQuery } from "./test-utils";

const navigation = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace, push: navigation.push }),
  usePathname: () => "/login",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockAuthState();
  resetMockAccountState();
  navigation.replace.mockClear();
});

afterAll(() => stopServer());

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("진입 화면", () => {
  it("로그인 진입은 카카오와 이메일 선택과 회원가입 링크를 보여준다", () => {
    render(<AuthEntry mode="login" />);
    expect(screen.getByRole("link", { name: "카카오로 시작하기" }).getAttribute("href")).toBe(
      "/api/auth/kakao/start",
    );
    expect(screen.getByRole("link", { name: "이메일로 시작하기" }).getAttribute("href")).toBe(
      "/login/email",
    );
    expect(screen.getByRole("link", { name: "회원가입" }).getAttribute("href")).toBe("/signup");
  });

  it("카카오 로그인이 실패해 돌아오면 오류 문구를 보여준다", () => {
    render(<AuthEntry mode="login" errorCode="auth_failed" />);
    expect(screen.getByRole("alert").textContent).toContain("카카오 로그인에 실패했습니다");
  });

  it("알 수 없는 오류 코드는 문구를 만들지 않는다", () => {
    render(<AuthEntry mode="login" errorCode="other" />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("돌아갈 주소가 있으면 이메일 로그인 링크에 붙인다", () => {
    render(<AuthEntry mode="login" next="/properties" />);
    expect(screen.getByRole("link", { name: "이메일로 시작하기" }).getAttribute("href")).toBe(
      "/login/email?next=%2Fproperties",
    );
  });

  it("가입 진입은 이메일 가입으로 이어지고 로그인 링크를 둔다", () => {
    render(<AuthEntry mode="signup" />);
    expect(screen.getByRole("link", { name: "이메일로 시작하기" }).getAttribute("href")).toBe(
      "/signup/email",
    );
    expect(screen.getByRole("link", { name: "로그인" }).getAttribute("href")).toBe("/login");
  });
});

describe("이메일 로그인", () => {
  it("입력하지 않고 제출하면 검증 오류를 보여주고 요청하지 않는다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm />);
    await user.click(screen.getByRole("button", { name: "로그인" }));
    expect(await screen.findByText("이메일을 입력해 주세요.")).not.toBeNull();
    expect(screen.getByText("비밀번호를 입력해 주세요.")).not.toBeNull();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("이메일 형식이 틀리면 안내한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm />);
    await user.type(screen.getByLabelText("이메일"), "not-an-email");
    await user.type(screen.getByLabelText("비밀번호"), "mock-password-1");
    await user.click(screen.getByRole("button", { name: "로그인" }));
    expect(await screen.findByText("이메일 주소를 올바르게 입력해 주세요.")).not.toBeNull();
  });

  it("성공하면 접근 상태에 맞는 화면으로 이동한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm />);
    await user.type(screen.getByLabelText("이메일"), "agent@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "mock-password-1");
    await user.click(screen.getByRole("button", { name: "로그인" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/home"));
  });

  it("돌아갈 주소가 안전하면 그곳으로 이동한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm next="/properties" />);
    await user.type(screen.getByLabelText("이메일"), "agent@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "mock-password-1");
    await user.click(screen.getByRole("button", { name: "로그인" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/properties"));
  });

  it("바깥 주소로 돌려보내는 next는 무시한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm next="//evil.example" />);
    await user.type(screen.getByLabelText("이메일"), "agent@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "mock-password-1");
    await user.click(screen.getByRole("button", { name: "로그인" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/home"));
  });

  it("미가입과 비밀번호 오류는 같은 문구로 안내한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm />);
    await user.type(screen.getByLabelText("이메일"), "nobody@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "로그인" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "이메일 또는 비밀번호가 맞지 않습니다.",
    );
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("5회 실패로 잠기면 남은 시간을 보여주고 제출을 막는다", async () => {
    server.use(http.post("/api/auth/login", () => mockErrors.loginLocked(900)));
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm />);
    await user.type(screen.getByLabelText("이메일"), "agent@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "mock-password-1");
    await user.click(screen.getByRole("button", { name: "로그인" }));
    const timer = await screen.findByRole("timer");
    expect(timer.textContent).toBe("15:00");
    expect(screen.getByRole("button", { name: "로그인" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
  });

  it("요청이 몰리면 기다릴 시간을 알려준다", async () => {
    server.use(http.post("/api/auth/login", () => mockErrors.rateLimited(90)));
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm />);
    await user.type(screen.getByLabelText("이메일"), "agent@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "mock-password-1");
    await user.click(screen.getByRole("button", { name: "로그인" }));
    expect((await screen.findByRole("alert")).textContent).toContain("1분 30초 뒤에 다시 시도");
  });

  it("서버 오류와 연결 실패는 일반 문구로 안내한다", async () => {
    server.use(http.post("/api/auth/login", () => mockErrors.server()));
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm />);
    await user.type(screen.getByLabelText("이메일"), "agent@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "mock-password-1");
    await user.click(screen.getByRole("button", { name: "로그인" }));
    expect((await screen.findByRole("alert")).textContent).toContain("일시적인 오류");
  });

  it("회원가입과 비밀번호 찾기로 이동하는 링크가 있다", () => {
    renderWithQuery(<EmailLoginForm />);
    expect(screen.getByRole("link", { name: "회원가입" }).getAttribute("href")).toBe("/signup");
    expect(screen.getByRole("link", { name: "비밀번호 찾기" }).getAttribute("href")).toBe(
      "/password/forgot",
    );
  });
});

describe("비밀번호 찾기와 재설정", () => {
  it("이메일 형식이 틀리면 요청하지 않는다", async () => {
    const user = userEvent.setup();
    render(<PasswordResetRequestForm />);
    await user.type(screen.getByLabelText("이메일"), "bad");
    await user.click(screen.getByRole("button", { name: "재설정 링크 받기" }));
    expect(await screen.findByText("이메일 주소를 올바르게 입력해 주세요.")).not.toBeNull();
  });

  it("가입 여부와 관계없이 같은 안내를 보여주고 재요청 대기를 건다", async () => {
    const user = userEvent.setup();
    render(<PasswordResetRequestForm />);
    await user.type(screen.getByLabelText("이메일"), "someone@example.com");
    await user.click(screen.getByRole("button", { name: "재설정 링크 받기" }));
    expect((await screen.findByRole("status")).textContent).toContain("가입한 계정이 있다면");
    expect(screen.getByRole("button", { name: /초 뒤 다시 보내기/ })).not.toBeNull();
  });

  it("요청이 몰리면 기다릴 시간을 알려준다", async () => {
    server.use(http.post("/api/auth/password/reset-request", () => mockErrors.rateLimited(120)));
    const user = userEvent.setup();
    render(<PasswordResetRequestForm />);
    await user.type(screen.getByLabelText("이메일"), "someone@example.com");
    await user.click(screen.getByRole("button", { name: "재설정 링크 받기" }));
    expect((await screen.findByRole("alert")).textContent).toContain("2분 뒤에 다시 시도");
  });

  it("새 비밀번호가 규칙을 어기면 서버에 보내지 않는다", async () => {
    const user = userEvent.setup();
    render(<PasswordResetForm token="valid-token-0000000000" />);
    await user.type(screen.getByLabelText("새 비밀번호"), "short");
    await user.type(screen.getByLabelText("새 비밀번호 확인"), "short");
    await user.click(screen.getByRole("button", { name: "비밀번호 바꾸기" }));
    expect(await screen.findByText("비밀번호는 8자 이상이어야 합니다.")).not.toBeNull();
  });

  it("두 비밀번호가 다르면 안내한다", async () => {
    const user = userEvent.setup();
    render(<PasswordResetForm token="valid-token-0000000000" />);
    await user.type(screen.getByLabelText("새 비밀번호"), "abcd1234!");
    await user.type(screen.getByLabelText("새 비밀번호 확인"), "abcd12345");
    await user.click(screen.getByRole("button", { name: "비밀번호 바꾸기" }));
    expect(await screen.findByText("비밀번호가 일치하지 않습니다.")).not.toBeNull();
  });

  it("성공하면 모든 기기에서 로그아웃되었음을 알리고 주소에서 토큰을 지운다", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/password/reset?token=valid-token-0000000000");
    render(<PasswordResetForm token="valid-token-0000000000" />);
    expect(window.location.search).toBe("");
    await user.type(screen.getByLabelText("새 비밀번호"), "abcd1234!");
    await user.type(screen.getByLabelText("새 비밀번호 확인"), "abcd1234!");
    await user.click(screen.getByRole("button", { name: "비밀번호 바꾸기" }));
    expect(await screen.findByText("비밀번호를 바꿨습니다")).not.toBeNull();
    expect(screen.getByRole("status").textContent).toContain("모든 기기에서 로그아웃");
  });

  it("링크가 만료되면 이메일을 받아 다시 요청하는 화면으로 바뀐다", async () => {
    const user = userEvent.setup();
    render(<PasswordResetForm token="expired-token-000000" />);
    await user.type(screen.getByLabelText("새 비밀번호"), "abcd1234!");
    await user.type(screen.getByLabelText("새 비밀번호 확인"), "abcd1234!");
    await user.click(screen.getByRole("button", { name: "비밀번호 바꾸기" }));
    expect(await screen.findByText("링크를 사용할 수 없습니다")).not.toBeNull();
    expect(screen.getByLabelText("이메일")).not.toBeNull();
  });

  it("토큰 형식이 맞지 않는 링크는 처음부터 재요청 화면을 보여준다", () => {
    render(<PasswordResetForm token={null} />);
    expect(screen.getByText("링크를 사용할 수 없습니다")).not.toBeNull();
  });

  it("서버가 필드 오류를 주면 비밀번호 칸에 보여준다", async () => {
    server.use(
      http.post("/api/auth/password/reset", () =>
        mockErrors.validation([
          { field: "newPassword", code: "INVALID_VALUE", message: "너무 흔한 비밀번호입니다." },
        ]),
      ),
    );
    const user = userEvent.setup();
    render(<PasswordResetForm token="valid-token-0000000000" />);
    await user.type(screen.getByLabelText("새 비밀번호"), "abcd1234!");
    await user.type(screen.getByLabelText("새 비밀번호 확인"), "abcd1234!");
    await user.click(screen.getByRole("button", { name: "비밀번호 바꾸기" }));
    expect(await screen.findByText("너무 흔한 비밀번호입니다.")).not.toBeNull();
  });
});

describe("광고성 수신 거부", () => {
  it("링크를 열기만 해서는 처리하지 않고 확인 버튼을 보여준다", () => {
    render(<MarketingUnsubscribe token="valid-token-0000000000" />);
    expect(screen.getByRole("button", { name: "수신 거부" })).not.toBeNull();
    expect(screen.queryByText("수신 거부를 처리했습니다")).toBeNull();
  });

  it("누르면 처리 시각과 결과 통지 안내를 보여준다", async () => {
    const user = userEvent.setup();
    render(<MarketingUnsubscribe token="valid-token-0000000000" />);
    await user.click(screen.getByRole("button", { name: "수신 거부" }));
    expect(await screen.findByText("수신 거부를 처리했습니다")).not.toBeNull();
    expect(screen.getByText(/처리 시각 2026-11-10 09:00\./)).not.toBeNull();
    expect(screen.getByText(/14일 이내에 이메일로 처리 결과를 알려 드립니다/)).not.toBeNull();
    expect(screen.getByText(/사이로 내 정보에서 켤 수 있습니다/)).not.toBeNull();
  });

  it("이미 철회한 상태면 그렇게 안내한다", async () => {
    const user = userEvent.setup();
    render(<MarketingUnsubscribe token="already-token-000000" />);
    await user.click(screen.getByRole("button", { name: "수신 거부" }));
    expect(await screen.findByText("이미 수신 거부가 처리되어 있습니다")).not.toBeNull();
    expect(screen.getByText(/처리 시각 2026-11-10 09:00/)).not.toBeNull();
  });

  it("링크가 올바르지 않으면 오류 안내를 보여준다", async () => {
    const user = userEvent.setup();
    render(<MarketingUnsubscribe token="invalid-token-000000" />);
    await user.click(screen.getByRole("button", { name: "수신 거부" }));
    expect(await screen.findByText("수신 거부 링크를 확인해 주세요")).not.toBeNull();
    expect(screen.getByText(/수신 거부 링크가 올바르지 않습니다/)).not.toBeNull();
  });

  it("토큰 오류가 아닌 400은 링크 오류로 단정하지 않고 다시 시도하게 한다", async () => {
    server.use(
      http.post("/api/public/marketing-unsubscribe", () =>
        mockErrors.validation([
          { field: "other", code: "INVALID_VALUE", message: "값이 올바르지 않습니다." },
        ]),
      ),
    );
    const user = userEvent.setup();
    render(<MarketingUnsubscribe token="valid-token-0000000000" />);
    await user.click(screen.getByRole("button", { name: "수신 거부" }));
    expect(await screen.findByRole("alert")).not.toBeNull();
    expect(screen.getByRole("button", { name: "수신 거부" })).not.toBeNull();
  });

  it("네트워크 오류면 같은 화면에서 다시 시도할 수 있다", async () => {
    server.use(http.post("/api/public/marketing-unsubscribe", () => HttpResponse.error()));
    const user = userEvent.setup();
    render(<MarketingUnsubscribe token="valid-token-0000000000" />);
    await user.click(screen.getByRole("button", { name: "수신 거부" }));
    expect(await screen.findByRole("alert")).not.toBeNull();
    expect(screen.getByRole("button", { name: "수신 거부" })).not.toBeNull();
  });

  it("토큰은 주소창에서 지우고 요청 본문으로만 보낸다", async () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    let sent: unknown = null;
    server.use(
      http.post("/api/public/marketing-unsubscribe", async ({ request }) => {
        sent = await request.json();
        return mockErrors.server();
      }),
    );
    const user = userEvent.setup();
    render(<MarketingUnsubscribe token="valid-token-0000000000" />);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/unsubscribe");
    await user.click(screen.getByRole("button", { name: "수신 거부" }));
    await screen.findByRole("alert");
    expect(sent).toEqual({ token: "valid-token-0000000000" });
    replaceState.mockRestore();
  });

  it("토큰이 없거나 형식이 틀린 링크는 바로 오류 안내를 보여준다", () => {
    render(<MarketingUnsubscribe token={null} />);
    expect(screen.getByText("수신 거부 링크를 확인해 주세요")).not.toBeNull();
  });

  it("서버 오류면 같은 화면에서 다시 시도할 수 있다", async () => {
    server.use(http.post("/api/public/marketing-unsubscribe", () => mockErrors.server()));
    const user = userEvent.setup();
    render(<MarketingUnsubscribe token="valid-token-0000000000" />);
    await user.click(screen.getByRole("button", { name: "수신 거부" }));
    expect((await screen.findByRole("alert")).textContent).toContain("일시적인 오류");
    expect(screen.getByRole("button", { name: "수신 거부" })).not.toBeNull();
  });

  it("처리 중에는 버튼이 중복 제출을 막는다", async () => {
    let calls = 0;
    server.use(
      http.post("/api/public/marketing-unsubscribe", async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return new Response(
          JSON.stringify({
            status: "UNSUBSCRIBED",
            expressedAt: "2026-11-10T09:00:00+09:00",
            processedAt: "2026-11-10T09:00:00+09:00",
            resultNoticeDueAt: "2026-11-24T09:00:00+09:00",
            emailNoticeScheduled: true,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }),
    );
    const user = userEvent.setup();
    render(<MarketingUnsubscribe token="valid-token-0000000000" />);
    const button = screen.getByRole("button", { name: "수신 거부" });
    await user.click(button);
    await user.click(button);
    await screen.findByText("수신 거부를 처리했습니다");
    expect(calls).toBe(1);
  });
});
