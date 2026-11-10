// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MOCK_ME,
  resetMockAccountState,
  setMockMe,
  setMockTermsVersion,
} from "@/mocks/handlers/account";
import { resetMockAuthState } from "@/mocks/handlers/auth";
import { mockErrors } from "@/mocks/error-responses";
import { server, startMockServer } from "@/mocks/server";
import { KakaoSignupForm } from "./kakao-signup-form";
import { PhoneVerificationField } from "./phone-verification-field";
import { SignupEmailFlow } from "./signup-email-flow";
import { renderWithQuery } from "./test-utils";
import { useState } from "react";

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

async function verifyPhone(user: ReturnType<typeof userEvent.setup>, code = "123456") {
  await user.type(screen.getByLabelText(/^휴대폰 번호/), "01012345678");
  await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
  await user.type(await screen.findByLabelText(/^인증번호/), code);
  await user.click(screen.getByRole("button", { name: "확인" }));
}

async function fillInfoStep(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText("기본 가입 정보 입력");
  await user.type(screen.getByLabelText(/^이름/), "김중개");
  await verifyPhone(user);
  await waitFor(() => expect(screen.getAllByText("인증이 완료되었습니다.")).toHaveLength(2));
  await user.click(screen.getByLabelText(/약관 전체 동의/));
}

describe("이메일 가입 기본 정보", () => {
  it("약관을 불러오는 동안 로딩을 보여주고 카탈로그 항목을 그대로 표시한다", async () => {
    renderWithQuery(<SignupEmailFlow />);
    expect(screen.getByText("약관을 불러오는 중입니다.")).not.toBeNull();
    expect(await screen.findByText(/서비스 이용 약관 동의/)).not.toBeNull();
    expect(screen.getByText(/개인정보 수집·이용 동의/)).not.toBeNull();
    expect(screen.getByText(/마케팅 정보 수신 동의/)).not.toBeNull();
    expect(screen.getAllByText("전문 보기")).toHaveLength(3);
  });

  it("약관 목록을 불러오지 못하면 오류 화면에서 다시 시도할 수 있다", async () => {
    server.use(http.get("/api/terms", () => mockErrors.server()));
    const user = userEvent.setup();
    renderWithQuery(<SignupEmailFlow />);
    expect(await screen.findByRole("button", { name: /다시 시도/ })).not.toBeNull();
    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: /다시 시도/ }));
    expect(await screen.findByText("기본 가입 정보 입력")).not.toBeNull();
  });

  it("시행 중인 약관이 하나도 없으면 가입할 수 없다는 빈 화면을 보여준다", async () => {
    server.use(http.get("/api/terms", () => Response.json({ items: [] })));
    renderWithQuery(<SignupEmailFlow />);
    expect(await screen.findByText("지금은 가입할 수 없습니다")).not.toBeNull();
  });

  it("이메일 형식이 틀리면 링크를 보내지 않는다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<SignupEmailFlow />);
    await screen.findByText("기본 가입 정보 입력");
    await user.type(screen.getByLabelText(/^이메일 인증/), "bad");
    await user.click(screen.getByRole("button", { name: "인증 링크 받기" }));
    expect(await screen.findByText("이메일 주소를 올바르게 입력해 주세요.")).not.toBeNull();
  });

  it("인증 링크를 보내면 재발송 대기와 30분 1회 안내를 보여준다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<SignupEmailFlow />);
    await screen.findByText("기본 가입 정보 입력");
    await user.type(screen.getByLabelText(/^이메일 인증/), "new@example.com");
    await user.click(screen.getByRole("button", { name: "인증 링크 받기" }));
    expect(await screen.findByText(/인증 링크를 보냈습니다.*60초 뒤 재발송/)).not.toBeNull();
    expect(screen.getByText(/30분 동안 한 번만/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "재발송" }).hasAttribute("disabled")).toBe(true);
  });

  it("이미 가입한 이메일이면 로그인과 비밀번호 찾기로 안내한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<SignupEmailFlow />);
    await screen.findByText("기본 가입 정보 입력");
    await user.type(screen.getByLabelText(/^이메일 인증/), "registered@example.com");
    await user.click(screen.getByRole("button", { name: "인증 링크 받기" }));
    expect(await screen.findByText("이미 가입된 이메일입니다.")).not.toBeNull();
    expect(screen.getByRole("link", { name: "이메일로 로그인" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "비밀번호 찾기" })).not.toBeNull();
  });

  it("링크 발송이 너무 잦으면 기다릴 시간을 알려준다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<SignupEmailFlow />);
    await screen.findByText("기본 가입 정보 입력");
    await user.type(screen.getByLabelText(/^이메일 인증/), "limited@example.com");
    await user.click(screen.getByRole("button", { name: "인증 링크 받기" }));
    expect((await screen.findByText(/2분 뒤에 다시 시도/)).getAttribute("role")).toBe("alert");
    expect(screen.getByRole("button", { name: "인증 링크 받기" }).hasAttribute("disabled")).toBe(
      true,
    );
  });

  it("인증 링크로 열면 토큰을 확인해 인증 완료로 표시하고 주소에서 토큰을 지운다", async () => {
    window.history.replaceState(null, "", `/signup/verify-email?token=${VALID_TOKEN}`);
    renderWithQuery(<SignupEmailFlow token={VALID_TOKEN} />);
    expect(screen.getByText("이메일 인증을 확인하는 중입니다.")).not.toBeNull();
    await screen.findByText("기본 가입 정보 입력");
    expect(screen.getByText("인증이 완료되었습니다.")).not.toBeNull();
    expect(window.location.search).toBe("");
  });

  it("만료된 인증 링크는 오류와 함께 새 링크를 받도록 안내한다", async () => {
    renderWithQuery(<SignupEmailFlow token="expired-token-000000" />);
    expect((await screen.findAllByRole("alert"))[0]?.textContent).toContain(
      "인증 시간이 지났습니다",
    );
    expect(screen.getByRole("button", { name: "인증 링크 받기" })).not.toBeNull();
  });

  it("이미 사용한 인증 링크도 같은 방식으로 안내한다", async () => {
    renderWithQuery(<SignupEmailFlow token="used-token-0000000000" />);
    expect((await screen.findAllByRole("alert"))[0]?.textContent).toContain(
      "인증 정보가 올바르지 않습니다",
    );
  });

  it("이름과 인증과 필수 약관이 비어 있으면 다음으로 가지 않는다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<SignupEmailFlow />);
    await screen.findByText("기본 가입 정보 입력");
    await user.click(screen.getByRole("button", { name: "다음" }));
    expect(await screen.findByText(/이름을 1자 이상/)).not.toBeNull();
    expect(screen.getByText("이메일 인증을 완료해 주세요.")).not.toBeNull();
    expect(screen.getByText("필수 약관에 모두 동의해 주세요.")).not.toBeNull();
    expect(screen.queryByText("비밀번호 설정")).toBeNull();
  });

  it("약관 전체 동의는 모든 항목을 한 번에 체크하고 개별 해제를 반영한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<SignupEmailFlow />);
    await screen.findByText("기본 가입 정보 입력");
    const all = screen.getByLabelText(/약관 전체 동의/) as HTMLInputElement;
    await user.click(all);
    expect((screen.getByLabelText(/마케팅 정보 수신 동의/) as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getByLabelText(/마케팅 정보 수신 동의/));
    expect(all.checked).toBe(false);
  });
});

describe("휴대폰 본인확인", () => {
  function Harness() {
    const [phone, setPhone] = useState("");
    const [ticket, setTicket] = useState<string | null>(null);
    return (
      <>
        <PhoneVerificationField
          purpose="SIGNUP"
          phone={phone}
          onPhoneChange={setPhone}
          isVerified={ticket !== null}
          onVerified={setTicket}
          onReset={() => setTicket(null)}
        />
        <p data-testid="ticket">{ticket ?? "없음"}</p>
      </>
    );
  }

  it("번호 형식이 틀리면 발송하지 않는다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<Harness />);
    await user.type(screen.getByLabelText(/^휴대폰 번호/), "0101234");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    expect(await screen.findByText(/010-0000-0000 형식/)).not.toBeNull();
  });

  it("발송하면 입력 중 하이픈을 붙이고 6자리 입력과 5분 타이머를 보여준다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<Harness />);
    await user.type(screen.getByLabelText(/^휴대폰 번호/), "01012345678");
    expect((screen.getByLabelText(/^휴대폰 번호/) as HTMLInputElement).value).toBe("010-1234-5678");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    expect(await screen.findByLabelText(/^인증번호/)).not.toBeNull();
    expect(screen.getByRole("timer").textContent).toBe("05:00");
    expect(screen.getByText(/60초 뒤 재발송/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "재발송" }).hasAttribute("disabled")).toBe(true);
  });

  it("인증번호가 맞으면 완료 상태가 되고 티켓을 넘긴다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<Harness />);
    await user.type(screen.getByLabelText(/^휴대폰 번호/), "01012345678");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    await user.type(await screen.findByLabelText(/^인증번호/), "123456");
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(await screen.findByText("인증이 완료되었습니다.")).not.toBeNull();
    expect(screen.getByTestId("ticket").textContent).toBe("phone-ticket:010-1234-5678");
  });

  it("6자리가 아니면 확인하지 않는다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<Harness />);
    await user.type(screen.getByLabelText(/^휴대폰 번호/), "01012345678");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    await user.type(await screen.findByLabelText(/^인증번호/), "123");
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(await screen.findByText("인증번호 6자리를 입력해 주세요.")).not.toBeNull();
  });

  it("인증번호가 틀리면 같은 칸에서 다시 입력하게 한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<Harness />);
    await user.type(screen.getByLabelText(/^휴대폰 번호/), "01012345678");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    await user.type(await screen.findByLabelText(/^인증번호/), "000000");
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(await screen.findByText("인증번호가 맞지 않습니다.")).not.toBeNull();
    expect(screen.getByLabelText(/^인증번호/)).not.toBeNull();
  });

  it("시간이 지나면 새 인증번호를 받도록 안내한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<Harness />);
    await user.type(screen.getByLabelText(/^휴대폰 번호/), "01012345678");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    await user.type(await screen.findByLabelText(/^인증번호/), "999999");
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(await screen.findByText(/새 인증번호를 받아 주세요/)).not.toBeNull();
    expect(screen.queryByLabelText(/^인증번호/)).toBeNull();
  });

  it("5회 틀려 폐기되면 새 인증번호를 받도록 안내한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<Harness />);
    await user.type(screen.getByLabelText(/^휴대폰 번호/), "01012345678");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    await user.type(await screen.findByLabelText(/^인증번호/), "111111");
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(await screen.findByText(/5회 틀렸거나/)).not.toBeNull();
  });

  it("발송이 너무 잦으면 응답이 알려준 시간만큼 재발송을 막는다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<Harness />);
    await user.type(screen.getByLabelText(/^휴대폰 번호/), "01099999999");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    expect(await screen.findByText(/30초 뒤에 다시 시도/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "인증번호 받기" }).hasAttribute("disabled")).toBe(
      true,
    );
  });

  it("인증 뒤 번호를 바꾸면 완료 상태를 되돌린다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<Harness />);
    await user.type(screen.getByLabelText(/^휴대폰 번호/), "01012345678");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    await user.type(await screen.findByLabelText(/^인증번호/), "123456");
    await user.click(screen.getByRole("button", { name: "확인" }));
    await screen.findByText("인증이 완료되었습니다.");
    await user.type(screen.getByLabelText(/^휴대폰 번호/), "1");
    expect(screen.getByTestId("ticket").textContent).toBe("없음");
  });

  it("서버 오류는 일반 문구로 안내한다", async () => {
    server.use(http.post("/api/auth/phone-verification", () => mockErrors.server()));
    const user = userEvent.setup();
    renderWithQuery(<Harness />);
    await user.type(screen.getByLabelText(/^휴대폰 번호/), "01012345678");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    expect(await screen.findByText(/일시적인 오류/)).not.toBeNull();
  });
});

describe("이메일 가입 완료", () => {
  async function toPasswordStep(user: ReturnType<typeof userEvent.setup>) {
    renderWithQuery(<SignupEmailFlow token={VALID_TOKEN} />);
    await fillInfoStep(user);
    await user.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByRole("heading", { name: "비밀번호 설정" });
  }

  it("인증과 약관을 마치면 비밀번호를 정해 가입하고 접근 상태에 맞는 화면으로 간다", async () => {
    const user = userEvent.setup();
    await toPasswordStep(user);
    await user.type(screen.getByLabelText(/^비밀번호\*?$/), "abcd1234!");
    await user.type(screen.getByLabelText(/^비밀번호 확인/), "abcd1234!");
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/office/start"));
  });

  it("비밀번호가 8자보다 짧거나 12자보다 길면 안내한다", async () => {
    const user = userEvent.setup();
    await toPasswordStep(user);
    await user.type(screen.getByLabelText(/^비밀번호\*?$/), "abc");
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    expect(await screen.findByText("비밀번호는 8자 이상이어야 합니다.")).not.toBeNull();
    await user.clear(screen.getByLabelText(/^비밀번호\*?$/));
    await user.type(screen.getByLabelText(/^비밀번호\*?$/), "abcd1234abcd1");
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    expect(await screen.findByText("비밀번호는 12자 이하여야 합니다.")).not.toBeNull();
  });

  it("너무 흔한 비밀번호는 막고 두 칸이 다르면 안내한다", async () => {
    const user = userEvent.setup();
    await toPasswordStep(user);
    await user.type(screen.getByLabelText(/^비밀번호\*?$/), "12345678");
    await user.type(screen.getByLabelText(/^비밀번호 확인/), "1234567");
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    expect(await screen.findByText(/너무 흔한 비밀번호/)).not.toBeNull();
    expect(screen.getByText("비밀번호가 일치하지 않습니다.")).not.toBeNull();
  });

  it("입력한 비밀번호의 강도를 표시한다", async () => {
    const user = userEvent.setup();
    await toPasswordStep(user);
    await user.type(screen.getByLabelText(/^비밀번호\*?$/), "abcdefgh");
    expect(screen.getByText("강도 약함")).not.toBeNull();
    await user.clear(screen.getByLabelText(/^비밀번호\*?$/));
    await user.type(screen.getByLabelText(/^비밀번호\*?$/), "Abcd1234!x");
    expect(screen.getByText("강도 강함")).not.toBeNull();
  });

  it("서버가 비밀번호를 거부하면 그 칸에 사유를 보여준다", async () => {
    const user = userEvent.setup();
    await toPasswordStep(user);
    await user.type(screen.getByLabelText(/^비밀번호\*?$/), "weakpass1");
    await user.type(screen.getByLabelText(/^비밀번호 확인/), "weakpass1");
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    expect(await screen.findByText("너무 흔한 비밀번호입니다.")).not.toBeNull();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("가입하는 동안 약관이 바뀌면 안내를 겹쳐 띄우고 입력값을 지키며 바뀐 항목만 비운다", async () => {
    const user = userEvent.setup();
    await toPasswordStep(user);
    setMockTermsVersion("2026-12-01");
    await user.type(screen.getByLabelText(/^비밀번호\*?$/), "abcd1234!");
    await user.type(screen.getByLabelText(/^비밀번호 확인/), "abcd1234!");
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("아직 가입되지 않았습니다.")).not.toBeNull();
    expect(within(dialog).getAllByText("바뀜").length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText("새 약관 보기").length).toBeGreaterThan(0);
    await user.click(within(dialog).getByRole("button", { name: "바뀐 약관 확인" }));
    expect((screen.getByLabelText(/^이름/) as HTMLInputElement).value).toBe("김중개");
    expect(screen.getAllByText("인증이 완료되었습니다.").length).toBe(2);
    expect((screen.getByLabelText(/서비스 이용 약관 동의/) as HTMLInputElement).checked).toBe(
      false,
    );
    await user.click(screen.getByLabelText(/약관 전체 동의/));
    await user.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByRole("heading", { name: "비밀번호 설정" });
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/office/start"));
  });

  it("이미 다른 계정에 인증된 휴대폰이면 기존 계정 로그인 안내로 보낸다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<SignupEmailFlow token={VALID_TOKEN} />);
    await screen.findByText("기본 가입 정보 입력");
    await user.type(screen.getByLabelText(/^이름/), "김중개");
    await user.type(screen.getByLabelText(/^휴대폰 번호/), "01011111111");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    await user.type(await screen.findByLabelText(/^인증번호/), "123456");
    await user.click(screen.getByRole("button", { name: "확인" }));
    await screen.findAllByText("인증이 완료되었습니다.");
    await user.click(screen.getByLabelText(/약관 전체 동의/));
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.type(await screen.findByLabelText(/^비밀번호\*?$/), "abcd1234!");
    await user.type(screen.getByLabelText(/^비밀번호 확인/), "abcd1234!");
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    expect(await screen.findByText("이미 가입된 계정이 있습니다")).not.toBeNull();
    expect(screen.getByRole("link", { name: "이메일로 로그인" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "비밀번호 찾기" })).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "가입 화면으로 돌아가기" }));
    expect(await screen.findByText("기본 가입 정보 입력")).not.toBeNull();
  });

  it("기존 계정 조회가 실패하면 오류 화면을 보여준다", async () => {
    server.use(http.get("/api/auth/recovery-options", () => mockErrors.server()));
    const user = userEvent.setup();
    renderWithQuery(<SignupEmailFlow token={VALID_TOKEN} />);
    await screen.findByText("기본 가입 정보 입력");
    await user.type(screen.getByLabelText(/^이름/), "김중개");
    await user.type(screen.getByLabelText(/^휴대폰 번호/), "01011111111");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    await user.type(await screen.findByLabelText(/^인증번호/), "123456");
    await user.click(screen.getByRole("button", { name: "확인" }));
    await screen.findAllByText("인증이 완료되었습니다.");
    await user.click(screen.getByLabelText(/약관 전체 동의/));
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.type(await screen.findByLabelText(/^비밀번호\*?$/), "abcd1234!");
    await user.type(screen.getByLabelText(/^비밀번호 확인/), "abcd1234!");
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    expect(await screen.findByRole("button", { name: /다시 시도/ })).not.toBeNull();
  });

  it("인증이 만료되면 인증을 다시 하도록 첫 단계로 돌려보낸다", async () => {
    server.use(
      http.post("/api/auth/signup/email", () =>
        Response.json({ code: "TOKEN_EXPIRED", message: "만료", traceId: "t" }, { status: 422 }),
      ),
    );
    const user = userEvent.setup();
    await toPasswordStep(user);
    await user.type(screen.getByLabelText(/^비밀번호\*?$/), "abcd1234!");
    await user.type(screen.getByLabelText(/^비밀번호 확인/), "abcd1234!");
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    expect(await screen.findByText(/인증 시간이 지났거나/)).not.toBeNull();
    expect(screen.getByRole("heading", { name: "기본 가입 정보 입력" })).not.toBeNull();
  });

  it("이전을 누르면 입력한 기본 정보로 돌아간다", async () => {
    const user = userEvent.setup();
    await toPasswordStep(user);
    await user.click(screen.getByRole("button", { name: "이전" }));
    expect((screen.getByLabelText(/^이름/) as HTMLInputElement).value).toBe("김중개");
  });

  it("서버가 다운되어도 가입 화면에 일반 문구를 보여준다", async () => {
    server.use(http.post("/api/auth/signup/email", () => mockErrors.server()));
    const user = userEvent.setup();
    await toPasswordStep(user);
    await user.type(screen.getByLabelText(/^비밀번호\*?$/), "abcd1234!");
    await user.type(screen.getByLabelText(/^비밀번호 확인/), "abcd1234!");
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    expect((await screen.findByRole("alert")).textContent).toContain("일시적인 오류");
  });

  it("입력하던 이름을 보관해 새 탭에서 이어 쓴다", async () => {
    const user = userEvent.setup();
    const first = renderWithQuery(<SignupEmailFlow />);
    await screen.findByText("기본 가입 정보 입력");
    await user.type(screen.getByLabelText(/^이름/), "김중개");
    first.unmount();
    renderWithQuery(<SignupEmailFlow />);
    await screen.findByText("기본 가입 정보 입력");
    await waitFor(() =>
      expect((screen.getByLabelText(/^이름/) as HTMLInputElement).value).toBe("김중개"),
    );
  });
});

describe("카카오 가입 보완 입력", () => {
  it("계정 조회 응답의 이름을 채워 보여주고 마케팅 항목은 숨긴다", async () => {
    setMockMe({
      ...MOCK_ME,
      displayName: "카카오 사용자",
      loginMethods: ["KAKAO"],
      kakaoLinked: true,
    });
    renderWithQuery(<KakaoSignupForm />);
    await waitFor(() =>
      expect((screen.getByLabelText(/^이름/) as HTMLInputElement).value).toBe("카카오 사용자"),
    );
    expect(screen.queryByText(/마케팅 정보 수신 동의/)).toBeNull();
    expect(screen.getByText(/이메일을 연결한 뒤 내 정보에서 선택/)).not.toBeNull();
    expect(screen.getByLabelText(/^휴대폰 번호/)).not.toBeNull();
  });

  it("로그인되지 않았으면 로그인으로 보낸다", async () => {
    server.use(http.get("/api/me", () => mockErrors.unauthenticated()));
    renderWithQuery(<KakaoSignupForm />);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/login"));
  });

  it("계정 조회가 실패하면 오류 화면을 보여준다", async () => {
    server.use(http.get("/api/me", () => mockErrors.server()));
    renderWithQuery(<KakaoSignupForm />);
    expect(await screen.findByRole("button", { name: /다시 시도/ })).not.toBeNull();
  });

  it("휴대폰 인증과 필수 약관 없이는 가입하지 않는다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<KakaoSignupForm />);
    await screen.findByRole("heading", { name: "카카오로 가입" });
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    expect(await screen.findByText("휴대폰 번호 인증을 완료해 주세요.")).not.toBeNull();
    expect(screen.getByText("필수 약관에 모두 동의해 주세요.")).not.toBeNull();
  });

  it("참고 이메일 형식이 틀리면 안내한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<KakaoSignupForm />);
    await screen.findByRole("heading", { name: "카카오로 가입" });
    await user.type(screen.getByLabelText(/^참고 이메일/), "nope");
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    expect(await screen.findByText("이메일 주소를 올바르게 입력해 주세요.")).not.toBeNull();
  });

  it("이름과 인증과 약관을 마치면 가입한다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<KakaoSignupForm />);
    await screen.findByRole("heading", { name: "카카오로 가입" });
    await verifyPhone(user);
    await screen.findByText("인증이 완료되었습니다.");
    await user.click(screen.getByLabelText(/약관 전체 동의/));
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/office/start"));
  });

  it("약관이 바뀌면 안내를 띄우고 바뀐 항목을 다시 동의받는다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<KakaoSignupForm />);
    await screen.findByRole("heading", { name: "카카오로 가입" });
    await verifyPhone(user);
    await screen.findByText("인증이 완료되었습니다.");
    await user.click(screen.getByLabelText(/약관 전체 동의/));
    setMockTermsVersion("2026-12-01");
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("아직 가입되지 않았습니다.")).not.toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "바뀐 약관 확인" }));
    expect((screen.getByLabelText(/서비스 이용 약관 동의/) as HTMLInputElement).checked).toBe(
      false,
    );
  });

  it("이미 가입된 휴대폰이면 기존 계정 안내로 보낸다", async () => {
    const user = userEvent.setup();
    renderWithQuery(<KakaoSignupForm />);
    await screen.findByRole("heading", { name: "카카오로 가입" });
    await user.type(screen.getByLabelText(/^휴대폰 번호/), "01011111111");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    await user.type(await screen.findByLabelText(/^인증번호/), "123456");
    await user.click(screen.getByRole("button", { name: "확인" }));
    await screen.findByText("인증이 완료되었습니다.");
    await user.click(screen.getByLabelText(/약관 전체 동의/));
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    expect(await screen.findByText("이미 가입된 계정이 있습니다")).not.toBeNull();
    expect(screen.getByRole("link", { name: "카카오로 로그인" })).not.toBeNull();
  });

  it("요청 제한이나 서버 오류는 일반 문구로 안내한다", async () => {
    server.use(http.post("/api/auth/signup/kakao", () => mockErrors.rateLimited(60)));
    const user = userEvent.setup();
    renderWithQuery(<KakaoSignupForm />);
    await screen.findByRole("heading", { name: "카카오로 가입" });
    await verifyPhone(user);
    await screen.findByText("인증이 완료되었습니다.");
    await user.click(screen.getByLabelText(/약관 전체 동의/));
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    expect(
      (await screen.findAllByRole("alert")).some((el) =>
        /1분 뒤에 다시 시도/.test(el.textContent ?? ""),
      ),
    ).toBe(true);
  });
});
