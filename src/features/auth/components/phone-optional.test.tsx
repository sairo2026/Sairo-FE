// @vitest-environment jsdom
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMockAccountState, setMockPhoneVerificationRequired } from "@/mocks/handlers/account";
import { resetMockAuthState } from "@/mocks/handlers/auth";
import { server, startMockServer } from "@/mocks/server";
import { ContactChangeScreen } from "./contact-change-screen";
import { KakaoSignupForm } from "./kakao-signup-form";
import { SignupEmailFlow } from "./signup-email-flow";
import { renderWithQuery } from "./test-utils";

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
  usePathname: () => "/signup/email",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockAuthState();
  resetMockAccountState();
  navigation.replace.mockClear();
});

afterAll(() => stopServer());

const VALID_TOKEN = "valid-token-0000000000";

function captureBody(path: string) {
  const captured: { body?: Record<string, unknown> } = {};
  server.use(
    http.post(path, async ({ request }) => {
      captured.body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(
        {
          accessCondition: "PRE_VERIFICATION",
          officeId: null,
          role: null,
          pendingRegistrationId: null,
          pendingMembershipId: null,
        },
        { status: 201 },
      );
    }),
  );
  return captured;
}

describe("휴대폰 번호를 인증 없이 저장할 때 이메일 가입", () => {
  it("인증번호 입력 없이 번호만 받고 미인증 안내를 작은 글씨로 보여준다", async () => {
    const user = userEvent.setup();
    const captured = captureBody("/api/auth/signup/email");
    renderWithQuery(<SignupEmailFlow token={VALID_TOKEN} />);
    await screen.findByText("기본 가입 정보 입력");
    expect(screen.queryByRole("button", { name: "인증번호 받기" })).toBeNull();
    expect(screen.getByText(/이메일로 본인을 확인하며/)).not.toBeNull();
    await user.type(screen.getByLabelText(/^이름/), "김중개");
    await user.type(screen.getByLabelText(/^휴대폰 번호/), "01012345678");
    await user.click(screen.getByLabelText(/이용약관에 동의합니다/));
    await user.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByRole("heading", { name: "비밀번호 설정" });
    await user.type(screen.getByLabelText(/^비밀번호\*?$/), "abcd1234!");
    await user.type(screen.getByLabelText(/^비밀번호 확인/), "abcd1234!");
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/office/start"));
    expect(captured.body?.phone).toBe("010-1234-5678");
    expect(captured.body).not.toHaveProperty("verifiedPhoneTicket");
  });

  it("번호 형식이 틀리면 다음으로 가지 않는다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<SignupEmailFlow token={VALID_TOKEN} />);
    await screen.findByText("기본 가입 정보 입력");
    await user.type(screen.getByLabelText(/^이름/), "김중개");
    await user.type(screen.getByLabelText(/^휴대폰 번호/), "0101234");
    await user.click(screen.getByLabelText(/이용약관에 동의합니다/));
    await user.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.queryByRole("heading", { name: "비밀번호 설정" })).toBeNull();
  });
});

describe("휴대폰 번호를 인증 없이 저장할 때 카카오 가입", () => {
  it("번호만 보내 가입한다", async () => {
    const user = userEvent.setup();
    const captured = captureBody("/api/auth/signup/kakao");
    renderWithQuery(<KakaoSignupForm />);
    await screen.findByRole("heading", { name: "카카오로 가입" });
    expect(screen.queryByRole("button", { name: "인증번호 받기" })).toBeNull();
    await user.type(screen.getByLabelText(/^휴대폰 번호/), "01012345678");
    await user.click(screen.getByLabelText(/이용약관에 동의합니다/));
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/office/start"));
    expect(captured.body?.phone).toBe("010-1234-5678");
    expect(captured.body).not.toHaveProperty("verifiedPhoneTicket");
  });
});

describe("휴대폰 번호를 인증 없이 저장할 때 휴대폰 변경", () => {
  it("티켓 없이 번호만 보내 바꾼다", async () => {
    const user = userEvent.setup();
    const captured: { body?: Record<string, unknown> } = {};
    server.use(
      http.patch("/api/me/contact", async ({ request }) => {
        captured.body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          field: "phone",
          value: "010-9999-0000",
          verifiedAt: "2026-11-10T09:00:00+09:00",
        });
      }),
    );
    renderWithQuery(<ContactChangeScreen />);
    await user.click(await screen.findByRole("tab", { name: "휴대폰" }));
    await user.type(screen.getByLabelText(/^새 휴대폰 번호/), "01099990000");
    await user.click(screen.getByRole("button", { name: "휴대폰 번호 변경" }));
    await screen.findByText("휴대폰 번호를 바꿨습니다.");
    expect(captured.body).toEqual({ phone: "010-9999-0000" });
  });
});
