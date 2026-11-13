// @vitest-environment jsdom
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { operatorQueryKey } from "@/features/auth/hooks/use-auth-context";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import {
  MOCK_INVITATION_SECRET,
  mockInvitation,
  resetOpsHomeMock,
} from "@/mocks/handlers/ops-home";
import { MOCK_OTP_CODE, resetMockOpsSession } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderPublicScreen } from "../../home/testing/render-ops-screen";
import { InvitationAcceptScreen } from "./invitation-accept-screen";
import { InvitationEnrollScreen } from "./invitation-enroll-screen";

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace, back: vi.fn() }),
  usePathname: () => "/ops/invitations/accept",
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
  resetOpsHomeMock();
  replace.mockClear();
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterAll(() => stopServer());

describe("운영자 초대 확인 화면", () => {
  it("확인하는 동안 로딩 안내를 보인다", () => {
    renderPublicScreen(<InvitationAcceptScreen token="valid-token" />);
    expect(screen.getByText("초대를 확인하는 중입니다.")).not.toBeNull();
  });

  it("이름과 부여 역할과 만료 시각을 보이고 15분 규칙을 안내한다", async () => {
    renderPublicScreen(<InvitationAcceptScreen token="valid-token" />);
    expect(await screen.findByText("김운영")).not.toBeNull();
    expect(screen.getByText("고객지원, 결제담당")).not.toBeNull();
    expect(screen.getByText("2026-11-13 09:00")).not.toBeNull();
    expect(screen.getByText(/15분 안에 인증 앱 등록을 마쳐야/)).not.toBeNull();
  });

  it("카카오 인증을 시작하면 서버가 준 주소로 이동한다", async () => {
    const navigate = vi.fn();
    renderPublicScreen(<InvitationAcceptScreen token="valid-token" navigate={navigate} />);
    await userEvent.click(await screen.findByRole("button", { name: "카카오로 인증하고 계속" }));
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        "https://kauth.kakao.com/oauth/authorize?state=mock-state",
      ),
    );
  });

  it("토큰이 없으면 링크가 올바르지 않다고 안내한다", () => {
    renderPublicScreen(<InvitationAcceptScreen />);
    expect(screen.getByRole("heading", { name: "초대 링크가 올바르지 않습니다" })).not.toBeNull();
  });

  it.each([
    ["expired-token", "초대 링크가 만료되었습니다"],
    ["cancelled-token", "취소된 초대입니다"],
    ["accepted-token", "이미 수락한 초대입니다"],
  ])("초대 상태 값으로 %s 안내를 구분한다", async (token, title) => {
    renderPublicScreen(<InvitationAcceptScreen token={token} />);
    expect(await screen.findByRole("heading", { name: title })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "카카오로 인증하고 계속" })).toBeNull();
  });

  it("이미 수락한 초대에는 운영자 로그인 이동을 보인다", async () => {
    renderPublicScreen(<InvitationAcceptScreen token="accepted-token" />);
    const link = await screen.findByRole("link", { name: "운영자 로그인으로 이동" });
    expect(link.getAttribute("href")).toBe("/ops/login");
  });

  it("없는 토큰은 찾을 수 없다고 안내한다", async () => {
    renderPublicScreen(<InvitationAcceptScreen token="unknown-token" />);
    expect(
      await screen.findByRole("heading", { name: "초대 링크를 찾을 수 없습니다" }),
    ).not.toBeNull();
  });

  it("요청이 많으면 기다릴 시간을 안내한다", async () => {
    server.use(http.post("/api/ops/auth/invitations/preview", () => mockErrors.rateLimited(90)));
    renderPublicScreen(<InvitationAcceptScreen token="valid-token" />);
    expect(await screen.findByRole("heading", { name: "요청이 너무 많습니다" })).not.toBeNull();
    expect(screen.getByText(/1분 30초 뒤에 다시/)).not.toBeNull();
  });

  it("서버 오류는 일반 안내를 보인다", async () => {
    server.use(http.post("/api/ops/auth/invitations/preview", () => mockErrors.server()));
    renderPublicScreen(<InvitationAcceptScreen token="valid-token" />);
    expect(
      await screen.findByRole("heading", { name: "초대를 확인하지 못했습니다" }),
    ).not.toBeNull();
  });

  it("이미 운영자 계정이 있는 카카오 계정이면 로그인으로 안내한다", () => {
    renderPublicScreen(<InvitationAcceptScreen errorCode="OPERATOR_ALREADY_EXISTS" />);
    expect(screen.getByRole("heading", { name: "이미 운영자 계정이 있습니다" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "운영자 로그인으로 이동" })).not.toBeNull();
  });

  it("카카오 인증 뒤 돌아온 초대 상태 오류를 구분한다", () => {
    renderPublicScreen(
      <InvitationAcceptScreen errorCode="INVITATION_NOT_USABLE" errorState="EXPIRED" />,
    );
    expect(screen.getByRole("heading", { name: "초대 링크가 만료되었습니다" })).not.toBeNull();
  });

  it("카카오 인증의 인가 값 오류와 요청 제한은 초대 링크를 다시 열라고 안내한다", () => {
    renderPublicScreen(<InvitationAcceptScreen errorCode="INVALID_REQUEST" />);
    expect(screen.getByRole("heading", { name: "카카오 인증을 마치지 못했습니다" })).not.toBeNull();
    expect(screen.getByText(/초대 링크를 다시 열어/)).not.toBeNull();
  });

  it("카카오 인증 시작이 실패하면 오류를 보이고 다시 시도할 수 있다", async () => {
    server.use(
      http.post("/api/ops/auth/invitations/kakao-start", () => mockErrors.rateLimited(30)),
    );
    const navigate = vi.fn();
    renderPublicScreen(<InvitationAcceptScreen token="valid-token" navigate={navigate} />);
    await userEvent.click(await screen.findByRole("button", { name: "카카오로 인증하고 계속" }));
    expect((await screen.findByRole("alert")).textContent).toContain("30초 뒤에 다시");
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("운영자 인증 앱 등록 화면", () => {
  it("수동 입력 비밀값과 남은 시간을 보인다", async () => {
    renderPublicScreen(<InvitationEnrollScreen />);
    expect(await screen.findByLabelText("수동 입력 비밀값")).not.toBeNull();
    expect(screen.getByLabelText("수동 입력 비밀값").textContent).toBe("JBSW Y3DP EHPK 3PXP");
    expect(screen.getByRole("timer").textContent).toMatch(/^1[45]:\d\d$/);
  });

  it("서버가 QR 이미지를 주지 않으면 이미지를 그리지 않는다", async () => {
    renderPublicScreen(<InvitationEnrollScreen />);
    await screen.findByLabelText("수동 입력 비밀값");
    expect(screen.queryByAltText("인증 앱 등록용 QR 코드")).toBeNull();
    expect(
      screen.getByRole("link", { name: "휴대폰의 인증 앱에서 바로 열기" }).getAttribute("href"),
    ).toContain("otpauth://totp/");
  });

  it("서버가 QR 이미지를 주면 이미지로 보인다", async () => {
    mockInvitation.qrImageUrl = "data:image/png;base64,AAAA";
    renderPublicScreen(<InvitationEnrollScreen />);
    const image = await screen.findByAltText("인증 앱 등록용 QR 코드");
    expect(image.getAttribute("src")).toBe("data:image/png;base64,AAAA");
  });

  it("이미지가 아닌 값은 QR로 그리지 않는다", async () => {
    mockInvitation.qrImageUrl = "https://example.invalid/qr.png";
    renderPublicScreen(<InvitationEnrollScreen />);
    await screen.findByLabelText("수동 입력 비밀값");
    expect(screen.queryByAltText("인증 앱 등록용 QR 코드")).toBeNull();
  });

  it("6자리가 아니면 요청하지 않는다", async () => {
    renderPublicScreen(<InvitationEnrollScreen />);
    await screen.findByLabelText("수동 입력 비밀값");
    await userEvent.type(screen.getByLabelText("확인 코드"), "12");
    await userEvent.click(screen.getByRole("button", { name: "등록 완료" }));
    expect(screen.getByText("인증 앱의 6자리 숫자를 입력해 주세요.")).not.toBeNull();
    expect(mockInvitation.acceptAttempts).toBe(0);
  });

  it("코드가 맞으면 운영자 조회 캐시를 채우고 운영 홈으로 이동한다", async () => {
    const { queryClient } = renderPublicScreen(<InvitationEnrollScreen />);
    await screen.findByLabelText("수동 입력 비밀값");
    await userEvent.type(screen.getByLabelText("확인 코드"), MOCK_OTP_CODE);
    await userEvent.click(screen.getByRole("button", { name: "등록 완료" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/ops"));
    expect(queryClient.getQueryData(operatorQueryKey)).toMatchObject({
      name: "김운영",
      roles: ["SUPPORT", "BILLING"],
    });
  });

  it("코드가 틀리면 안내하고 입력을 비운다", async () => {
    renderPublicScreen(<InvitationEnrollScreen />);
    await screen.findByLabelText("수동 입력 비밀값");
    await userEvent.type(screen.getByLabelText("확인 코드"), "000000");
    await userEvent.click(screen.getByRole("button", { name: "등록 완료" }));
    expect((await screen.findByRole("alert")).textContent).toContain("확인 코드가 맞지 않습니다");
    expect((screen.getByLabelText("확인 코드") as HTMLInputElement).value).toBe("");
    expect(replace).not.toHaveBeenCalled();
  });

  it("분당 5회를 넘으면 잠시 뒤 다시 시도하라고 안내한다", async () => {
    mockInvitation.acceptAttempts = 5;
    renderPublicScreen(<InvitationEnrollScreen />);
    await screen.findByLabelText("수동 입력 비밀값");
    await userEvent.type(screen.getByLabelText("확인 코드"), MOCK_OTP_CODE);
    await userEvent.click(screen.getByRole("button", { name: "등록 완료" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("분당 5회");
    expect(alert.textContent).toContain("1분 뒤에 다시");
  });

  it("검증 실패 응답은 서버 문구로 안내한다", async () => {
    server.use(
      http.post("/api/ops/auth/invitations/accept", () =>
        mockErrors.validation([{ field: "otpCode", message: "숫자 6자리만 입력할 수 있습니다." }]),
      ),
    );
    renderPublicScreen(<InvitationEnrollScreen />);
    await screen.findByLabelText("수동 입력 비밀값");
    await userEvent.type(screen.getByLabelText("확인 코드"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "등록 완료" }));
    expect((await screen.findByRole("alert")).textContent).toContain("숫자 6자리만");
  });

  it("비밀값을 다시 발급하면 새 값으로 바꾸고 이전 값이 쓸 수 없다고 안내한다", async () => {
    renderPublicScreen(<InvitationEnrollScreen />);
    await screen.findByLabelText("수동 입력 비밀값");
    expect(mockInvitation.issuedCount).toBe(1);
    await userEvent.type(screen.getByLabelText("확인 코드"), "12");
    await userEvent.click(screen.getByRole("button", { name: "비밀값 다시 발급" }));
    await waitFor(() => expect(mockInvitation.issuedCount).toBe(2));
    expect((screen.getByLabelText("확인 코드") as HTMLInputElement).value).toBe("");
    expect(screen.getByText(/이전 비밀값은 사용할 수 없습니다/)).not.toBeNull();
  });

  it("등록 시간이 지나면 초대 링크부터 다시 시작하라고 안내하고 입력을 막는다", async () => {
    mockInvitation.enrollmentSeconds = -5;
    renderPublicScreen(<InvitationEnrollScreen />);
    expect((await screen.findByRole("alert")).textContent).toContain("초대 링크부터 다시 시작");
    expect((screen.getByLabelText("확인 코드") as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "등록 완료" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
  });

  it("등록 인증 정보가 없으면 초대 링크부터 다시 시작하라고 안내한다", async () => {
    mockInvitation.hasEnrollmentCookie = false;
    renderPublicScreen(<InvitationEnrollScreen />);
    expect(
      await screen.findByRole("heading", { name: "인증 앱 등록 시간이 지났습니다" }),
    ).not.toBeNull();
    expect(screen.getByText(/초대 링크부터 다시 시작해 주세요/)).not.toBeNull();
  });

  it("이미 운영자 계정이 있는 카카오 계정이면 로그인으로 안내한다", async () => {
    mockInvitation.kakaoAlreadyOperator = true;
    renderPublicScreen(<InvitationEnrollScreen />);
    expect(
      await screen.findByRole("heading", { name: "이미 운영자 계정이 있습니다" }),
    ).not.toBeNull();
    expect(screen.getByRole("link", { name: "운영자 로그인으로 이동" }).getAttribute("href")).toBe(
      "/ops/login",
    );
  });

  it("수락 중 초대가 사용할 수 없게 되면 새 초대를 요청하라고 안내한다", async () => {
    server.use(
      http.post("/api/ops/auth/invitations/accept", () =>
        errorResponse(409, "INVITATION_NOT_USABLE", "사용할 수 없는 초대입니다."),
      ),
    );
    renderPublicScreen(<InvitationEnrollScreen />);
    await screen.findByLabelText("수동 입력 비밀값");
    await userEvent.type(screen.getByLabelText("확인 코드"), MOCK_OTP_CODE);
    await userEvent.click(screen.getByRole("button", { name: "등록 완료" }));
    expect(
      await screen.findByRole("heading", { name: "사용할 수 없는 초대입니다" }),
    ).not.toBeNull();
  });

  it("등록 정보 발급이 실패하면 다시 시도할 수 있다", async () => {
    server.use(
      http.post("/api/ops/auth/invitations/mfa-enrollment", () => mockErrors.server(), {
        once: true,
      }),
    );
    renderPublicScreen(<InvitationEnrollScreen />);
    expect((await screen.findByRole("alert")).textContent).toContain("불러오지 못했습니다");
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByLabelText("수동 입력 비밀값")).not.toBeNull();
  });

  it("비밀값을 브라우저 저장소에 남기지 않는다", async () => {
    renderPublicScreen(<InvitationEnrollScreen />);
    await screen.findByLabelText("수동 입력 비밀값");
    const stored = JSON.stringify({ ...window.localStorage, ...window.sessionStorage });
    expect(stored).not.toContain(MOCK_INVITATION_SECRET);
    expect(window.localStorage.length + window.sessionStorage.length).toBe(0);
  });
});
