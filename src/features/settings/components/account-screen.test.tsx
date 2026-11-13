// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import {
  MOCK_ME,
  getMockMe,
  resetMockAccountState,
  setMockMe,
  setMockTermsVersion,
} from "@/mocks/handlers/account";
import { resetSettingsState, settingsState } from "@/mocks/handlers/settings";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { AccountScreen } from "./account-screen";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace, back: vi.fn() }),
  usePathname: () => "/account",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockAccountState();
  resetSettingsState();
  replace.mockClear();
});

afterAll(() => stopServer());

const AGREEMENTS = [
  {
    termsCode: "TOS",
    termsName: "이용약관",
    required: true,
    withdrawable: false,
    termsVersion: "1.0",
    agreed: true,
    recordedAt: "2026-10-01T09:00:00+09:00",
  },
  {
    termsCode: "MARKETING",
    termsName: "이메일 공지·혜택 안내 수신 동의",
    required: false,
    withdrawable: true,
    termsVersion: "1.0",
    agreed: true,
    recordedAt: "2026-11-01T09:00:00+09:00",
  },
];

function seedMe(overrides: Partial<typeof MOCK_ME> = {}) {
  setMockMe({
    ...MOCK_ME,
    termsAgreements: AGREEMENTS,
    notificationPreferences: {
      channels: { VISIT_REMINDER: true, MARKETING: true, SECURITY: true },
      mandatoryTypes: [],
    },
    ...overrides,
  });
}

function open(role: "OWNER" | "AGENT" | "DEPUTY" | null = "AGENT", isReadOnly = false) {
  return renderOffice(<AccountScreen />, { role, isReadOnly });
}

describe("내 정보와 연락처", () => {
  it("불러오는 동안 로딩을 보여주고 본인 정보와 연결된 로그인 방식을 보여준다", async () => {
    seedMe();
    open();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(await screen.findByDisplayValue("카카오 사용자")).not.toBeNull();
    expect(screen.getByText("agent@example.com")).not.toBeNull();
    expect(screen.getAllByText("인증됨").length).toBe(2);
    expect(screen.getByText("이메일", { selector: "dd" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "이메일·휴대폰 변경" }).getAttribute("href")).toBe(
      "/settings/contact",
    );
    expect(screen.getByRole("link", { name: "로그인 방식 관리" }).getAttribute("href")).toBe(
      "/settings/login-methods",
    );
    expect(screen.getByText("변경과 연결·해제는 본인 확인을 한 번 더 합니다.")).not.toBeNull();
  });

  it("이메일과 휴대폰이 없으면 등록되지 않음을 보여준다", async () => {
    seedMe({ email: null, phone: null, emailVerified: false, phoneVerified: false });
    open();
    expect((await screen.findAllByText("등록되지 않음")).length).toBe(2);
  });

  it("조회가 실패하면 오류와 다시 시도를 보여준다", async () => {
    server.use(http.get("/api/me", () => mockErrors.server()));
    const user = userEvent.setup();
    open();
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
    server.resetHandlers();
    seedMe();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByDisplayValue("카카오 사용자")).not.toBeNull();
  });

  it("표시 이름이 비어 있거나 너무 길면 저장하지 않는다", async () => {
    seedMe();
    const user = userEvent.setup();
    open();
    const input = await screen.findByLabelText("표시 이름");
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "이름 저장" }));
    expect(screen.getByText("표시 이름을 입력해 주세요.")).not.toBeNull();
    await user.click(input);
    await user.paste("가".repeat(51));
    await user.click(screen.getByRole("button", { name: "이름 저장" }));
    expect(screen.getByText("표시 이름은 50자까지 입력할 수 있습니다.")).not.toBeNull();
    expect(getMockMe().displayName).toBe("카카오 사용자");
  });

  it("표시 이름을 저장한다", async () => {
    seedMe();
    const user = userEvent.setup();
    open();
    const input = await screen.findByLabelText("표시 이름");
    await user.clear(input);
    await user.type(input, "김중개");
    await user.click(screen.getByRole("button", { name: "이름 저장" }));
    expect(await screen.findByText("표시 이름을 저장했습니다.")).not.toBeNull();
    expect(getMockMe().displayName).toBe("김중개");
  });

  it("저장이 거절되면 문구를 보여준다", async () => {
    seedMe();
    server.use(http.patch("/api/me", () => mockErrors.rateLimited(20)));
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("button", { name: "이름 저장" }));
    expect(await screen.findByText(/20초 뒤에 다시 시도/)).not.toBeNull();
  });
});

describe("소속 사무소", () => {
  it("소속공인중개사는 사무소 이름과 역할을 보고 나갈 수 있다", async () => {
    seedMe();
    const user = userEvent.setup();
    open("AGENT");
    expect(await screen.findByText("사이로 공인중개사사무소")).not.toBeNull();
    expect(screen.getByText("소속공인중개사", { selector: "dd" })).not.toBeNull();
    expect(screen.getByText("이용 중")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "사무소 나가기" }));
    expect(screen.getByText(/계정은 그대로 유지됩니다/)).not.toBeNull();
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "사무소 나가기" }),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/home"));
    expect(settingsState.leaveCount).toBe(1);
  });

  it("나가기가 거절되면 문구를 보여준다", async () => {
    seedMe();
    settingsState.isLastOwner = true;
    const user = userEvent.setup();
    open("AGENT");
    await user.click(await screen.findByRole("button", { name: "사무소 나가기" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "사무소 나가기" }),
    );
    expect(await screen.findByText(/유일한 대표는 사무소를 나갈 수 없습니다/)).not.toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("대표는 나가기 대신 대표 이전과 사무소 종료를 안내받는다", async () => {
    seedMe();
    open("OWNER");
    expect(
      await screen.findByText(/유일한 대표는 사무소를 나갈 수 없습니다. 대표를 먼저/),
    ).not.toBeNull();
    expect(screen.getByRole("link", { name: "대표 이전" }).getAttribute("href")).toBe(
      "/members/owner-transfer",
    );
    expect(screen.getByRole("link", { name: "사무소 종료" }).getAttribute("href")).toBe(
      "/office/close",
    );
    expect(screen.queryByRole("button", { name: "사무소 나가기" })).toBeNull();
  });

  it("소속이 없으면 안내만 보여준다", async () => {
    seedMe();
    open(null);
    expect(await screen.findByText("소속된 사무소가 없습니다.")).not.toBeNull();
  });
});

describe("알림 수신 설정", () => {
  it("보안 알림은 끌 수 없고 서비스 필수 알림 안내를 보여준다", async () => {
    seedMe();
    open();
    const security = await screen.findByRole("switch", { name: "로그인·보안 알림" });
    expect(security.getAttribute("aria-checked")).toBe("true");
    expect((security as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("계정 보안을 위해 로그인·보안 알림은 끌 수 없습니다.")).not.toBeNull();
    expect(screen.getByText(/서비스 필수 알림은 끌 수 없고 항상 발송됩니다/)).not.toBeNull();
  });

  it("방문 알림을 끄고 켠다", async () => {
    seedMe();
    const user = userEvent.setup();
    open();
    const toggle = await screen.findByRole("switch", { name: /방문 일정/ });
    await user.click(toggle);
    expect(await screen.findByText("알림 설정을 저장했습니다.")).not.toBeNull();
    await waitFor(() =>
      expect(getMockMe().notificationPreferences.channels.VISIT_REMINDER).toBe(false),
    );
  });

  it("알림 저장이 실패하면 문구를 보여준다", async () => {
    seedMe();
    server.use(http.patch("/api/me/notification-preferences", () => mockErrors.server()));
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("switch", { name: /방문 일정/ }));
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).not.toBeNull();
  });

  it("공지·혜택 수신을 끄면 처리 시각과 14일 이내 통지 안내를 보여준다", async () => {
    seedMe();
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("switch", { name: "이메일로 공지·혜택 안내 받기" }));
    expect(
      await screen.findByText(
        /이메일 공지·혜택 안내 수신을 껐습니다. .+에 처리되었습니다. 처리 결과를 14일 이내에 이메일로도 알려 드립니다/,
      ),
    ).not.toBeNull();
    await waitFor(() => expect(getMockMe().notificationPreferences.channels.MARKETING).toBe(false));
    expect(settingsState.termsHistory[0]?.agreed).toBe(false);
  });

  it("공지·혜택 수신을 켜려면 동의 확인을 거치고 체크하지 않으면 막는다", async () => {
    seedMe({
      termsAgreements: AGREEMENTS.map((item) =>
        item.termsCode === "MARKETING" ? { ...item, agreed: false } : item,
      ),
      notificationPreferences: {
        channels: { VISIT_REMINDER: true, MARKETING: false, SECURITY: true },
        mandatoryTypes: [],
      },
    });
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("switch", { name: "이메일로 공지·혜택 안내 받기" }));
    const panel = screen.getByRole("region", { name: "공지·혜택 안내 수신 동의" });
    await user.click(within(panel).getByRole("button", { name: "동의하고 켜기" }));
    expect(within(panel).getByText("동의에 체크해야 켤 수 있습니다.")).not.toBeNull();
    await user.click(within(panel).getByLabelText("공지·혜택 안내 수신에 동의합니다."));
    await user.click(within(panel).getByRole("button", { name: "동의하고 켜기" }));
    expect(await screen.findByText(/공지·혜택 안내 수신에 동의했습니다. 처리 시각/)).not.toBeNull();
    await waitFor(() => expect(getMockMe().notificationPreferences.channels.MARKETING).toBe(true));
    expect(settingsState.termsHistory[0]).toMatchObject({
      termsCode: "MARKETING",
      agreed: true,
      version: "1.0",
      consentPath: "ACCOUNT_SETTINGS",
    });
  });

  it("전문 보기로 약관 본문을 연다", async () => {
    seedMe({
      notificationPreferences: {
        channels: { VISIT_REMINDER: true, MARKETING: false, SECURITY: true },
        mandatoryTypes: [],
      },
    });
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("switch", { name: "이메일로 공지·혜택 안내 받기" }));
    await user.click(screen.getByRole("button", { name: "전문 보기" }));
    expect(screen.getByRole("dialog")).not.toBeNull();
  });

  it("이메일이 없으면 수신 선택을 막고 안내한다", async () => {
    seedMe({ email: null, emailVerified: false });
    open();
    const toggle = await screen.findByRole("switch", { name: "이메일로 공지·혜택 안내 받기" });
    expect((toggle as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen.getByText("이메일을 연결하면 공지·혜택 안내 수신을 선택할 수 있습니다."),
    ).not.toBeNull();
  });

  it("서버가 이메일 필요로 거절하면 같은 문구를 보여준다", async () => {
    seedMe({
      notificationPreferences: {
        channels: { VISIT_REMINDER: true, MARKETING: false, SECURITY: true },
        mandatoryTypes: [],
      },
    });
    server.use(
      http.post("/api/me/terms-agreements", () =>
        errorResponse(422, "MARKETING_EMAIL_REQUIRED", "이메일 필요"),
      ),
    );
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("switch", { name: "이메일로 공지·혜택 안내 받기" }));
    await user.click(screen.getByLabelText("공지·혜택 안내 수신에 동의합니다."));
    await user.click(screen.getByRole("button", { name: "동의하고 켜기" }));
    expect(
      (await screen.findAllByText("이메일을 연결하면 공지·혜택 안내 수신을 선택할 수 있습니다."))
        .length,
    ).toBeGreaterThan(0);
  });

  it("약관 버전이 바뀌면 재동의 안내를 보이고 새 버전으로 동의한다", async () => {
    setMockTermsVersion("2.0");
    seedMe();
    const user = userEvent.setup();
    open();
    expect(await screen.findByText(/공지·혜택 안내 수신 동의 내용이 바뀌었습니다/)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "바뀐 내용 확인하고 다시 동의" }));
    await user.click(screen.getByLabelText("공지·혜택 안내 수신에 동의합니다."));
    await user.click(screen.getByRole("button", { name: "동의하고 켜기" }));
    expect(await screen.findByText(/공지·혜택 안내 수신에 동의했습니다/)).not.toBeNull();
    await waitFor(() => expect(settingsState.termsHistory[0]?.version).toBe("2.0"));
  });

  it("동의하는 사이 약관이 바뀌면 다시 확인하라고 안내한다", async () => {
    seedMe({
      notificationPreferences: {
        channels: { VISIT_REMINDER: true, MARKETING: false, SECURITY: true },
        mandatoryTypes: [],
      },
    });
    server.use(
      http.post("/api/me/terms-agreements", () =>
        errorResponse(409, "TERMS_VERSION_CHANGED", "버전 변경"),
      ),
    );
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("switch", { name: "이메일로 공지·혜택 안내 받기" }));
    await user.click(screen.getByLabelText("공지·혜택 안내 수신에 동의합니다."));
    await user.click(screen.getByRole("button", { name: "동의하고 켜기" }));
    expect(await screen.findByText(/약관 내용이 바뀌었습니다/)).not.toBeNull();
  });

  it("읽기 전용이면 알림 설정을 막는다", async () => {
    seedMe();
    open("AGENT", true);
    const toggle = await screen.findByRole("switch", { name: /방문 일정/ });
    expect((toggle as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("로그인 이력과 계정 메뉴", () => {
  it("최근 로그인 방식, IP, 브라우저, 시각을 보여준다", async () => {
    seedMe();
    open();
    const table = await screen.findByRole("table", { name: "최근 로그인" });
    expect(await within(table).findByText("203.0.113.10")).not.toBeNull();
    expect(within(table).getByText("카카오")).not.toBeNull();
    expect(within(table).getByText("Chrome 130 / Windows")).not.toBeNull();
    expect(within(table).getByText("2026-11-10 08:00")).not.toBeNull();
  });

  it("기록이 없으면 빈 안내를 보여준다", async () => {
    seedMe();
    settingsState.loginHistory = [];
    open();
    expect(await screen.findByText("로그인 기록이 없습니다.")).not.toBeNull();
  });

  it("기록 조회가 실패해도 다른 영역은 보이고 다시 시도할 수 있다", async () => {
    seedMe();
    server.use(http.get("/api/me/login-history", () => mockErrors.server()));
    open();
    expect(await screen.findByDisplayValue("카카오 사용자")).not.toBeNull();
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "다시 시도" })).not.toBeNull();
  });

  it("동의 내역과 탈퇴 안내로 가는 링크가 있다", async () => {
    seedMe();
    open();
    expect((await screen.findByRole("link", { name: "동의 내역 보기" })).getAttribute("href")).toBe(
      "/account/consents",
    );
    expect(screen.getByRole("link", { name: "회원 탈퇴" }).getAttribute("href")).toBe(
      "/account/withdrawal",
    );
  });

  it("로그아웃하면 로그인 화면으로 이동한다", async () => {
    seedMe();
    server.use(http.post("/api/auth/logout", () => new HttpResponse(null, { status: 204 })));
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("button", { name: "로그아웃" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });
});
