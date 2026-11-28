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
import { describeLoginMismatch } from "../model/login-lock";

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
  it("로그인과 가입의 제목·설명·이메일 동작을 구분하고 카카오는 실제 공통 시작 경로를 쓴다", () => {
    const { unmount } = render(<AuthEntry mode="login" />);
    expect(screen.getByRole("heading", { name: "로그인" })).not.toBeNull();
    expect(screen.getByText("사이로 계정으로 로그인해 업무를 이어가세요.")).not.toBeNull();
    expect(screen.getByRole("link", { name: "이메일로 로그인하기" }).getAttribute("href")).toBe(
      "/login/email",
    );
    unmount();

    render(<AuthEntry mode="signup" />);
    expect(screen.getByRole("heading", { name: "회원가입" })).not.toBeNull();
    expect(screen.getByText("계정을 만들고 부동산 업무 관리를 시작하세요.")).not.toBeNull();
    expect(screen.getByRole("link", { name: "이메일로 회원가입하기" }).getAttribute("href")).toBe(
      "/signup/email",
    );
    expect(screen.getByRole("link", { name: "카카오로 시작하기" }).getAttribute("href")).toBe(
      "/api/auth/kakao/start",
    );
  });

  it("로그인 진입은 카카오와 이메일 선택과 회원가입 링크를 보여준다", () => {
    render(<AuthEntry mode="login" />);
    expect(screen.getByRole("link", { name: "카카오로 시작하기" }).getAttribute("href")).toBe(
      "/api/auth/kakao/start",
    );
    expect(screen.getByRole("link", { name: "이메일로 로그인하기" }).getAttribute("href")).toBe(
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
    expect(screen.getByRole("link", { name: "이메일로 로그인하기" }).getAttribute("href")).toBe(
      "/login/email?next=%2Fproperties",
    );
  });

  it("가입 진입은 이메일 가입으로 이어지고 로그인 링크를 둔다", () => {
    render(<AuthEntry mode="signup" />);
    expect(screen.getByRole("link", { name: "이메일로 회원가입하기" }).getAttribute("href")).toBe(
      "/signup/email",
    );
    expect(screen.getByRole("link", { name: "로그인" }).getAttribute("href")).toBe("/login");
  });
});

describe("이메일 로그인", () => {
  it("비밀번호 보기·숨기기는 값을 유지하고 접근 가능한 버튼으로 동작한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm />);
    const password = screen.getByLabelText("비밀번호") as HTMLInputElement;
    await user.type(password, "mock-password-1");
    expect(password.type).toBe("password");
    await user.click(screen.getByRole("button", { name: "입력값 보기: 비밀번호" }));
    expect(password.type).toBe("text");
    expect(password.value).toBe("mock-password-1");
    await user.click(screen.getByRole("button", { name: "입력값 숨기기: 비밀번호" }));
    expect(password.type).toBe("password");
    expect(password.value).toBe("mock-password-1");
  });

  it("입력하지 않고 제출하면 검증 오류를 보여주고 요청하지 않는다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm />);
    await user.click(screen.getByRole("button", { name: "로그인하기" }));
    expect(await screen.findByText("이메일을 입력해 주세요.")).not.toBeNull();
    expect(screen.getByText("비밀번호를 입력해 주세요.")).not.toBeNull();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("이메일 형식이 틀리면 안내한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm />);
    await user.type(screen.getByLabelText("이메일 주소"), "not-an-email");
    await user.type(screen.getByLabelText("비밀번호"), "mock-password-1");
    await user.click(screen.getByRole("button", { name: "로그인하기" }));
    expect(await screen.findByText("이메일 주소를 올바르게 입력해 주세요.")).not.toBeNull();
  });

  it("성공하면 접근 상태에 맞는 화면으로 이동한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm />);
    await user.type(screen.getByLabelText("이메일 주소"), "agent@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "mock-password-1");
    await user.click(screen.getByRole("button", { name: "로그인하기" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/home"));
  });

  it("로그인하면 이전 계정이 보던 조회 결과를 모두 지운다", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderWithQuery(<EmailLoginForm />);
    queryClient.setQueryData(["customers", "list"], { items: [{ name: "이전 계정의 고객" }] });
    await user.type(screen.getByLabelText("이메일 주소"), "agent@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "mock-password-1");
    await user.click(screen.getByRole("button", { name: "로그인하기" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/home"));
    expect(queryClient.getQueryData(["customers", "list"])).toBeUndefined();
  });

  it("돌아갈 주소가 안전하면 그곳으로 이동한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm next="/properties" />);
    await user.type(screen.getByLabelText("이메일 주소"), "agent@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "mock-password-1");
    await user.click(screen.getByRole("button", { name: "로그인하기" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/properties"));
  });

  it("바깥 주소로 돌려보내는 next는 무시한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm next="//evil.example" />);
    await user.type(screen.getByLabelText("이메일 주소"), "agent@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "mock-password-1");
    await user.click(screen.getByRole("button", { name: "로그인하기" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/home"));
  });

  it("로그인 서버 오류에 내부 진단 문구를 띄우거나 자동으로 다시 제출하지 않는다", async () => {
    const login = vi.fn(() =>
      HttpResponse.json(
        { code: "INTERNAL_ERROR", message: "Internal diagnostic information" },
        { status: 500 },
      ),
    );
    server.use(http.post("/api/auth/login", login));
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm />);
    await user.type(screen.getByLabelText("이메일 주소"), "member@example.test");
    await user.type(screen.getByLabelText("비밀번호"), "example-password");
    await user.click(screen.getByRole("button", { name: "로그인하기" }));
    expect(await screen.findByRole("alert")).not.toBeNull();
    expect(screen.queryByText(/Internal diagnostic information/)).toBeNull();
    expect(login).toHaveBeenCalledTimes(1);
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("미가입과 비밀번호 오류는 같은 문구로 안내한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm />);
    await user.type(screen.getByLabelText("이메일 주소"), "nobody@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "로그인하기" }));
    const alert = await screen.findByRole("alert");
    const lines = Array.from(alert.querySelectorAll("p")).map((line) => line.textContent);
    expect(lines).toEqual([
      "이메일 또는 비밀번호가 맞지 않습니다. 5회 불일치 시 15분 뒤 다시 시도할 수 있습니다.",
      "남은 시도 4회",
    ]);
    expect(alert.className).toContain("text-danger");
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("서버가 잠금 정책 값을 변경하면 안내에도 실제 값을 사용한다", () => {
    expect(
      describeLoginMismatch({
        failedAttempts: 1,
        remainingAttempts: 6,
        maxAttempts: 7,
        lockMinutes: 20,
      }),
    ).toEqual({
      lead: "이메일 또는 비밀번호가 맞지 않습니다. 7회 불일치 시 20분 뒤 다시 시도할 수 있습니다.",
      count: "남은 시도 6회",
    });
  });

  it("실패가 쌓이면 남은 횟수를 갱신한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm />);
    await user.type(screen.getByLabelText("이메일 주소"), "nobody@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "로그인하기" }));
    expect((await screen.findByRole("alert")).className).toContain("border-danger");
    await user.click(screen.getByRole("button", { name: "로그인하기" }));
    await screen.findByText("남은 시도 3회");
    await user.click(screen.getByRole("button", { name: "로그인하기" }));
    await screen.findByText("남은 시도 2회");
    expect(screen.getByRole("alert").className).toContain("bg-white");
  });

  it("서버가 횟수를 내려주지 않으면 기존 한 줄 문구로 안내한다", async () => {
    server.use(http.post("/api/auth/login", () => mockErrors.invalidCredentials()));
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm />);
    await user.type(screen.getByLabelText("이메일 주소"), "nobody@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "로그인하기" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "이메일 또는 비밀번호가 맞지 않습니다. 5회 불일치 시 15분 뒤 다시 시도할 수 있습니다.",
    );
  });

  it("5회 실패로 잠기면 남은 시간을 보여주고 제출을 막는다", async () => {
    server.use(http.post("/api/auth/login", () => mockErrors.loginLocked(900)));
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm />);
    await user.type(screen.getByLabelText("이메일 주소"), "agent@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "mock-password-1");
    await user.click(screen.getByRole("button", { name: "로그인하기" }));
    const timer = await screen.findByRole("timer");
    expect(timer.textContent).toBe("15:00");
    const notice = screen.getByRole("alert");
    expect(notice.textContent).toContain("로그인에 5회 실패해 잠시 막았습니다.");
    expect(notice.className).toContain("text-danger");
    expect(screen.getByRole("button", { name: "로그인하기" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
  });

  it("요청이 몰리면 기다릴 시간을 알려준다", async () => {
    server.use(http.post("/api/auth/login", () => mockErrors.rateLimited(90)));
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm />);
    await user.type(screen.getByLabelText("이메일 주소"), "agent@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "mock-password-1");
    await user.click(screen.getByRole("button", { name: "로그인하기" }));
    expect((await screen.findByRole("alert")).textContent).toContain("1분 30초 뒤에 다시 시도");
  });

  it("서버 오류와 연결 실패는 일반 문구로 안내한다", async () => {
    server.use(http.post("/api/auth/login", () => mockErrors.server()));
    const user = userEvent.setup();
    renderWithQuery(<EmailLoginForm />);
    await user.type(screen.getByLabelText("이메일 주소"), "agent@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "mock-password-1");
    await user.click(screen.getByRole("button", { name: "로그인하기" }));
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
    const explanation = screen.getByText(/가입한 이메일 주소를 입력하면/);
    expect(explanation.className).toContain("mt-4");
    expect(explanation.nextElementSibling?.className).toContain("mt-14");
    await user.type(screen.getByLabelText("가입한 이메일 주소"), "bad");
    await user.click(screen.getByRole("button", { name: "재설정 링크 받기" }));
    expect(await screen.findByText("이메일 주소를 올바르게 입력해 주세요.")).not.toBeNull();
  });

  it("가입 여부와 관계없이 같은 안내를 보여주고 재요청 대기를 건다", async () => {
    const user = userEvent.setup();
    render(<PasswordResetRequestForm />);
    await user.type(screen.getByLabelText("가입한 이메일 주소"), "someone@example.com");
    await user.click(screen.getByRole("button", { name: "재설정 링크 받기" }));
    expect((await screen.findByRole("status")).textContent).toContain("가입한 계정이 있다면");
    expect(screen.queryByText("입력한 주소로 안내를 보냈습니다.")).toBeNull();
    expect(screen.getByRole("timer").textContent).toMatch(/^\d:\d{2}$/);
    const resend = screen.getByRole("button", { name: "재발송" }) as HTMLButtonElement;
    expect(resend.disabled).toBe(true);
  });

  it("요청이 몰리면 기다릴 시간을 알려준다", async () => {
    server.use(http.post("/api/auth/password/reset-request", () => mockErrors.rateLimited(120)));
    const user = userEvent.setup();
    render(<PasswordResetRequestForm />);
    await user.type(screen.getByLabelText("가입한 이메일 주소"), "someone@example.com");
    await user.click(screen.getByRole("button", { name: "재설정 링크 받기" }));
    expect((await screen.findByRole("alert")).textContent).toContain("2분 뒤에 다시 시도");
  });

  it("새 비밀번호가 규칙을 어기면 서버에 보내지 않는다", async () => {
    const user = userEvent.setup();
    render(<PasswordResetForm token="valid-token-0000000000" />);
    await user.type(screen.getByLabelText("새 비밀번호"), "short");
    await user.type(screen.getByLabelText("새 비밀번호 확인"), "short");
    await user.click(screen.getByRole("button", { name: "비밀번호 변경" }));
    expect(await screen.findByText("8~12자 이내로 설정해 주십시오.")).not.toBeNull();
  });

  it("두 비밀번호가 다르면 안내한다", async () => {
    const user = userEvent.setup();
    render(<PasswordResetForm token="valid-token-0000000000" />);
    await user.type(screen.getByLabelText("새 비밀번호"), "abcd1234!");
    await user.type(screen.getByLabelText("새 비밀번호 확인"), "abcd12345");
    await user.click(screen.getByRole("button", { name: "비밀번호 변경" }));
    expect(await screen.findByText("비밀번호가 일치하지 않습니다.")).not.toBeNull();
  });

  it("성공하면 모든 기기에서 로그아웃되었음을 알리고 주소에서 토큰을 지운다", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/password/reset?token=valid-token-0000000000");
    render(<PasswordResetForm token="valid-token-0000000000" />);
    expect(window.location.search).toBe("");
    await user.type(screen.getByLabelText("새 비밀번호"), "abcd1234!");
    await user.type(screen.getByLabelText("새 비밀번호 확인"), "abcd1234!");
    await user.click(screen.getByRole("button", { name: "비밀번호 변경" }));
    expect(await screen.findByText("비밀번호 변경 완료")).not.toBeNull();
    expect(screen.getByRole("status").textContent).toContain("모든 기기에서 로그아웃");
  });

  it("링크가 만료되면 이메일을 받아 다시 요청하는 화면으로 바뀐다", async () => {
    const user = userEvent.setup();
    render(<PasswordResetForm token="expired-token-000000" />);
    await user.type(screen.getByLabelText("새 비밀번호"), "abcd1234!");
    await user.type(screen.getByLabelText("새 비밀번호 확인"), "abcd1234!");
    await user.click(screen.getByRole("button", { name: "비밀번호 변경" }));
    expect(await screen.findByText("링크를 사용할 수 없습니다")).not.toBeNull();
    expect(screen.getByLabelText("가입한 이메일 주소")).not.toBeNull();
  });

  it("토큰 형식이 맞지 않는 링크는 처음부터 재요청 화면을 보여준다", () => {
    render(<PasswordResetForm token={null} />);
    expect(screen.getByText("링크를 사용할 수 없습니다")).not.toBeNull();
  });

  it("서버가 필드 오류를 주면 비밀번호 칸에 보여준다", async () => {
    server.use(
      http.post("/api/auth/password/reset", () =>
        mockErrors.validation([
          {
            field: "newPassword",
            code: "NOT_ALLOWED",
            message: "서버 문장: 흔한 비밀번호 사용 시도",
          },
        ]),
      ),
    );
    const user = userEvent.setup();
    render(<PasswordResetForm token="valid-token-0000000000" />);
    await user.type(screen.getByLabelText("새 비밀번호"), "abcd1234!");
    await user.type(screen.getByLabelText("새 비밀번호 확인"), "abcd1234!");
    await user.click(screen.getByRole("button", { name: "비밀번호 변경" }));
    expect(
      await screen.findByText("안전성이 낮은 비밀번호입니다. 다른 비밀번호를 입력해 주세요."),
    ).not.toBeNull();
    expect(screen.queryByText(/서버 문장/)).toBeNull();
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
