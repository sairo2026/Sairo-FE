// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_ME, resetMockAccountState, setMockMe } from "@/mocks/handlers/account";
import { resetMockAuthState, setMockAuthContext } from "@/mocks/handlers/auth";
import { mockErrors } from "@/mocks/error-responses";
import { server, startMockServer } from "@/mocks/server";
import { setStepUpHandler } from "@/shared/api/auth-events";
import { AccountScreenFrame } from "./account-screen-frame";
import { ContactChangeScreen, ContactEmailVerify } from "./contact-change-screen";
import {
  KakaoLinkCallback,
  LoginMethodEmailVerify,
  LoginMethodsScreen,
} from "./login-methods-screen";
import { ReconsentNotice } from "./reconsent-notice";
import { renderWithQuery } from "./test-utils";

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
  usePathname: () => "/settings/login-methods",
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
  setStepUpHandler(null);
  navigation.replace.mockClear();
  vi.unstubAllGlobals();
});

afterAll(() => stopServer());

function unlinkButton(index: number): HTMLElement {
  const buttons = screen.getAllByRole("button", { name: "해제" });
  const target = buttons.at(index);
  if (!target) throw new Error("해제 버튼이 없습니다.");
  return target;
}

const KAKAO_ONLY = {
  ...MOCK_ME,
  email: null,
  emailVerified: false,
  loginMethods: ["KAKAO"],
  kakaoLinked: true,
};
const BOTH = { ...MOCK_ME, loginMethods: ["EMAIL", "KAKAO"], kakaoLinked: true };

describe("계정 화면 접근", () => {
  it("로그인하지 않았으면 로그인으로 보낸다", async () => {
    setMockAuthContext(null);
    renderWithQuery(
      <AccountScreenFrame>
        <p>계정 화면</p>
      </AccountScreenFrame>,
    );
    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith("/login?next=%2Fsettings%2Flogin-methods"),
    );
    expect(screen.queryByText("계정 화면")).toBeNull();
  });

  it("사무소 인증 전 상태에서도 열린다", async () => {
    setMockAuthContext({
      accessCondition: "PRE_VERIFICATION" as const,
      officeId: null,
      role: null,
      pendingRegistrationId: null,
      pendingMembershipId: null,
      reconsentRequired: false,
    });
    renderWithQuery(
      <AccountScreenFrame>
        <p>계정 화면</p>
      </AccountScreenFrame>,
    );
    expect(await screen.findByText("계정 화면")).not.toBeNull();
  });
});

describe("로그인 방식 연결", () => {
  it("불러오는 동안 로딩을 보여주고 연결 상태를 표시한다", async () => {
    setMockMe(BOTH);
    renderWithQuery(<LoginMethodsScreen />);
    expect(screen.getByText("로그인 방식을 불러오는 중입니다.")).not.toBeNull();
    expect(await screen.findByText("agent@example.com")).not.toBeNull();
    expect(screen.getAllByRole("button", { name: "해제" })).toHaveLength(2);
  });

  it("불러오지 못하면 오류 화면에서 다시 시도할 수 있다", async () => {
    server.use(http.get("/api/me", () => mockErrors.server()));
    renderWithQuery(<LoginMethodsScreen />);
    expect(await screen.findByRole("button", { name: /다시 시도/ })).not.toBeNull();
  });

  it("수단이 하나뿐이면 해제를 막고 이유를 알린다", async () => {
    renderWithQuery(<LoginMethodsScreen />);
    await screen.findByText("agent@example.com");
    expect(screen.getByRole("button", { name: "해제" }).getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText(/하나뿐이라 해제할 수 없습니다/)).not.toBeNull();
  });

  it("해제를 확인하면 연결을 끊고 알린다", async () => {
    setMockMe(BOTH);
    const user = userEvent.setup();
    renderWithQuery(<LoginMethodsScreen />);
    await screen.findByText("agent@example.com");
    await user.click(unlinkButton(1));
    expect(await screen.findByRole("dialog")).not.toBeNull();
    await user.click(unlinkButton(-1));
    expect(await screen.findByText("로그인 방식을 해제했습니다.")).not.toBeNull();
  });

  it("마지막 수단 해제 충돌은 오류 문구로 안내한다", async () => {
    setMockMe(BOTH);
    server.use(
      http.delete("/api/me/login-methods/:method", () =>
        Response.json(
          { code: "LAST_LOGIN_METHOD", message: "마지막", traceId: "t" },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithQuery(<LoginMethodsScreen />);
    await screen.findByText("agent@example.com");
    await user.click(unlinkButton(0));
    await user.click(unlinkButton(-1));
    expect((await screen.findByRole("alert")).textContent).toContain("마지막 남은 로그인 방식");
  });

  it("이메일이 없으면 인증 링크를 보내 연결을 시작한다", async () => {
    setMockMe(KAKAO_ONLY);
    const user = userEvent.setup();
    renderWithQuery(<LoginMethodsScreen />);
    await user.type(await screen.findByLabelText("연결할 이메일"), "me@example.com");
    await user.click(screen.getByRole("button", { name: "인증 링크 받기" }));
    expect(await screen.findByText(/비밀번호를 설정하면 연결됩니다/)).not.toBeNull();
  });

  it("이메일 형식이 틀리면 보내지 않는다", async () => {
    setMockMe(KAKAO_ONLY);
    const user = userEvent.setup();
    renderWithQuery(<LoginMethodsScreen />);
    await user.type(await screen.findByLabelText("연결할 이메일"), "bad");
    await user.click(screen.getByRole("button", { name: "인증 링크 받기" }));
    expect(await screen.findByText("이메일 주소를 올바르게 입력해 주세요.")).not.toBeNull();
  });

  it("링크 발송이 몰리면 기다릴 시간을 알린다", async () => {
    setMockMe(KAKAO_ONLY);
    server.use(
      http.post("/api/me/login-methods/email/verification", () => mockErrors.rateLimited(90)),
    );
    const user = userEvent.setup();
    renderWithQuery(<LoginMethodsScreen />);
    await user.type(await screen.findByLabelText("연결할 이메일"), "me@example.com");
    await user.click(screen.getByRole("button", { name: "인증 링크 받기" }));
    expect(await screen.findByText(/1분 30초 뒤에 다시 시도/)).not.toBeNull();
  });

  it("카카오 연결은 재인증을 마친 뒤 인가 페이지로 이동한다", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    setStepUpHandler(async () => true);
    const user = userEvent.setup();
    renderWithQuery(<LoginMethodsScreen />);
    await user.click(await screen.findByRole("button", { name: "카카오 연결" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/api/me/login-methods/kakao/start"));
  });

  it("재인증을 취소하면 이동하지 않는다", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    setStepUpHandler(async () => false);
    const user = userEvent.setup();
    renderWithQuery(<LoginMethodsScreen />);
    await user.click(await screen.findByRole("button", { name: "카카오 연결" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "카카오 연결" }).getAttribute("aria-busy"),
      ).toBeNull(),
    );
    expect(assign).not.toHaveBeenCalled();
  });
});

describe("이메일 연결 링크", () => {
  it("토큰을 확인한 뒤 비밀번호를 정해 연결하고 주소에서 토큰을 지운다", async () => {
    window.history.replaceState(
      null,
      "",
      "/settings/login-methods/verify-email?token=valid-token-0000000000",
    );
    const user = userEvent.setup();
    render(<LoginMethodEmailVerify token="valid-token-0000000000" />);
    expect(screen.getByText("이메일 인증을 확인하는 중입니다.")).not.toBeNull();
    await user.type(await screen.findByLabelText("비밀번호"), "abcd1234!");
    expect(window.location.search).toBe("");
    await user.type(screen.getByLabelText("비밀번호 확인"), "abcd1234!");
    await user.click(screen.getByRole("button", { name: "연결하기" }));
    expect(await screen.findByText("이메일 로그인을 연결했습니다")).not.toBeNull();
  });

  it("비밀번호 규칙을 어기면 서버에 보내지 않는다", async () => {
    const user = userEvent.setup();
    render(<LoginMethodEmailVerify token="valid-token-0000000000" />);
    await user.type(await screen.findByLabelText("비밀번호"), "abc");
    await user.type(screen.getByLabelText("비밀번호 확인"), "abd");
    await user.click(screen.getByRole("button", { name: "연결하기" }));
    expect(await screen.findByText("비밀번호는 8자 이상이어야 합니다.")).not.toBeNull();
    expect(screen.getByText("비밀번호가 일치하지 않습니다.")).not.toBeNull();
  });

  it("만료된 링크는 새 링크를 받도록 안내한다", async () => {
    render(<LoginMethodEmailVerify token="expired-token-000000" />);
    expect((await screen.findByRole("alert")).textContent).toContain("인증 시간이 지났습니다");
  });

  it("토큰이 없으면 바로 오류 안내를 보여준다", () => {
    render(<LoginMethodEmailVerify token={null} />);
    expect(screen.getByRole("alert")).not.toBeNull();
  });
});

describe("카카오 연결 결과", () => {
  it("인가 결과로 연결을 마치고 주소에서 code를 지운다", async () => {
    window.history.replaceState(
      null,
      "",
      "/settings/login-methods/kakao-callback?code=abc&state=xyz",
    );
    render(<KakaoLinkCallback code="abc" state="xyz" hasError={false} />);
    expect(screen.getByText("카카오 로그인을 연결하는 중입니다.")).not.toBeNull();
    expect(await screen.findByText("카카오 로그인을 연결했습니다")).not.toBeNull();
    expect(window.location.search).toBe("");
  });

  it("이미 다른 계정에 연결된 카카오 계정이면 알린다", async () => {
    render(<KakaoLinkCallback code="taken-code" state="xyz" hasError={false} />);
    expect((await screen.findByRole("alert")).textContent).toContain("이미 다른 계정에 연결된");
  });

  it("카카오가 오류로 돌려보냈거나 값이 없으면 실패 안내를 보여준다", () => {
    render(<KakaoLinkCallback code={null} state={null} hasError />);
    expect(screen.getByRole("alert").textContent).toContain("연결에 실패했습니다");
  });
});

describe("이메일·휴대폰 변경", () => {
  it("이메일 로그인이 있으면 새 주소로 인증 링크를 보내고 이전 주소 알림을 안내한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<ContactChangeScreen />);
    expect(screen.getByText("내 정보를 불러오는 중입니다.")).not.toBeNull();
    await user.type(await screen.findByLabelText("새 이메일"), "next@example.com");
    expect(screen.getByText(/이전 이메일로 변경 알림을 보냅니다/)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "인증 링크 받기" }));
    expect(await screen.findByText(/새 주소로 인증 링크를 보냈습니다/)).not.toBeNull();
    expect(window.localStorage.getItem("sairo.contact.pendingEmail")).toBe("next@example.com");
  });

  it("카카오 전용 계정은 이메일 로그인 연결을 먼저 안내한다", async () => {
    setMockMe(KAKAO_ONLY);
    renderWithQuery(<ContactChangeScreen />);
    expect(await screen.findByText(/이메일을 바꿀 수 없습니다/)).not.toBeNull();
    expect(screen.getByRole("link", { name: "이메일 로그인 연결하기" }).getAttribute("href")).toBe(
      "/settings/login-methods",
    );
  });

  it("휴대폰은 재인증 없이 새 번호 인증만으로 바꾼다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<ContactChangeScreen />);
    await user.click(await screen.findByRole("tab", { name: "휴대폰" }));
    expect(
      screen.getByRole("button", { name: "휴대폰 번호 변경" }).getAttribute("aria-disabled"),
    ).toBe("true");
    await user.type(screen.getByLabelText(/^새 휴대폰 번호/), "01099998888");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    await user.type(await screen.findByLabelText(/^인증번호/), "123456");
    await user.click(screen.getByRole("button", { name: "확인" }));
    await screen.findByText("인증이 완료되었습니다.");
    await user.click(screen.getByRole("button", { name: "휴대폰 번호 변경" }));
    expect(await screen.findByText("휴대폰 번호를 바꿨습니다.")).not.toBeNull();
  });

  it("휴대폰 변경 요청이 실패하면 오류를 보여준다", async () => {
    server.use(http.patch("/api/me/contact", () => mockErrors.server()));
    const user = userEvent.setup();
    renderWithQuery(<ContactChangeScreen />);
    await user.click(await screen.findByRole("tab", { name: "휴대폰" }));
    await user.type(screen.getByLabelText(/^새 휴대폰 번호/), "01099998888");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    await user.type(await screen.findByLabelText(/^인증번호/), "123456");
    await user.click(screen.getByRole("button", { name: "확인" }));
    await screen.findByText("인증이 완료되었습니다.");
    await user.click(screen.getByRole("button", { name: "휴대폰 번호 변경" }));
    expect((await screen.findByRole("alert")).textContent).toContain("일시적인 오류");
  });

  it("불러오지 못하면 오류 화면을 보여준다", async () => {
    server.use(http.get("/api/me", () => mockErrors.server()));
    renderWithQuery(<ContactChangeScreen />);
    expect(await screen.findByRole("button", { name: /다시 시도/ })).not.toBeNull();
  });

  it("새 이메일 링크를 열면 확인하고 변경을 마친 뒤 이전 주소 알림을 알린다", async () => {
    window.localStorage.setItem("sairo.contact.pendingEmail", "next@example.com");
    const user = userEvent.setup();
    renderWithQuery(<ContactEmailVerify token="valid-token-0000000000" />);
    await waitFor(() =>
      expect((screen.getByLabelText("새 이메일") as HTMLInputElement).value).toBe(
        "next@example.com",
      ),
    );
    await user.click(screen.getByRole("button", { name: "이메일 변경" }));
    expect(await screen.findByText("이메일을 바꿨습니다")).not.toBeNull();
    expect(screen.getByRole("status").textContent).toContain("이전 이메일로 변경 알림");
    expect(window.localStorage.getItem("sairo.contact.pendingEmail")).toBeNull();
  });

  it("인증한 주소가 달라 티켓이 거부되면 새 링크를 받도록 안내한다", async () => {
    server.use(
      http.patch("/api/me/contact", () =>
        Response.json({ code: "TOKEN_INVALID", message: "x", traceId: "t" }, { status: 422 }),
      ),
    );
    const user = userEvent.setup();
    renderWithQuery(<ContactEmailVerify token="valid-token-0000000000" />);
    await user.type(await screen.findByLabelText("새 이메일"), "other@example.com");
    await user.click(screen.getByRole("button", { name: "이메일 변경" }));
    expect((await screen.findByRole("alert")).textContent).toContain("인증한 주소와 다릅니다");
  });

  it("만료된 변경 링크는 오류 안내를 보여준다", async () => {
    renderWithQuery(<ContactEmailVerify token="expired-token-000000" />);
    expect((await screen.findByRole("alert")).textContent).toContain("인증 시간이 지났습니다");
  });
});

describe("약관 개정 재동의", () => {
  const reconsentContext = {
    accessCondition: "ACTIVE" as const,
    officeId: 12,
    role: "AGENT" as const,
    pendingRegistrationId: null,
    pendingMembershipId: null,
    reconsentRequired: true,
  };

  it("항목마다 이전·새 버전과 바뀐 내용과 이전 약관 링크를 보여준다", async () => {
    setMockAuthContext(reconsentContext);
    renderWithQuery(<ReconsentNotice />);
    expect(await screen.findByText(/이전 버전 2026-09-01, 새 버전 2026-12-01/)).not.toBeNull();
    expect(screen.getByText("자동결제 안내 문구가 추가되었습니다")).not.toBeNull();
    expect(screen.getByRole("link", { name: "바뀐 내용 보기" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "이전 약관 보기" })).not.toBeNull();
    expect(
      screen.getByText(/로그아웃, 개인정보 권리 요청, 지원 문의는 동의하지 않아도 할 수 있습니다/),
    ).not.toBeNull();
    expect(screen.getByRole("link", { name: "회원 탈퇴" }).getAttribute("href")).toBe(
      "/account/withdrawal",
    );
    expect(screen.getByRole("button", { name: "동의하지 않음" })).not.toBeNull();
  });

  it("동의하지 않음을 누르면 계속 이용할 수 없다는 오류를 보여준다", async () => {
    setMockAuthContext(reconsentContext);
    const user = userEvent.setup();
    renderWithQuery(<ReconsentNotice />);
    await user.click(await screen.findByRole("button", { name: "동의하지 않음" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "새 약관에 동의하셔야 계속 이용할 수 있습니다.",
    );
  });

  it("동의하면 기록하고 홈으로 이동한다", async () => {
    setMockAuthContext(reconsentContext);
    const user = userEvent.setup();
    renderWithQuery(<ReconsentNotice />);
    await user.click(await screen.findByRole("button", { name: "동의하고 계속" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/"));
  });

  it("그 사이 약관이 또 바뀌면 안내하고 다시 불러온다", async () => {
    setMockAuthContext(reconsentContext);
    server.use(
      http.post("/api/me/terms-agreements", () =>
        Response.json(
          { code: "TERMS_VERSION_CHANGED", message: "x", traceId: "t" },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithQuery(<ReconsentNotice />);
    await user.click(await screen.findByRole("button", { name: "동의하고 계속" }));
    expect((await screen.findByRole("alert")).textContent).toContain("약관이 다시 바뀌었습니다");
  });

  it("로그인하지 않았으면 로그인으로 보낸다", async () => {
    setMockAuthContext(null);
    renderWithQuery(<ReconsentNotice />);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/login"));
  });

  it("조회에 실패하면 오류 화면에서 다시 시도할 수 있다", async () => {
    server.use(http.get("/api/me/terms-reconsent", () => mockErrors.server()));
    renderWithQuery(<ReconsentNotice />);
    expect(await screen.findByRole("button", { name: /다시 시도/ })).not.toBeNull();
  });
});
