// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import {
  billingState,
  buildAgreement,
  buildNotice,
  buildSubscription,
  resetBillingState,
} from "@/mocks/handlers/billing";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { PriceNoticesScreen, StartAgreementScreen } from "./agreement-notices-screens";
import { AuthSuspensionScreen, formatRemaining, ReturnGuideScreen } from "./auth-suspension-screen";
import {
  ArchiveGrantScreen,
  GRANT_PENDING_KEY,
  GrantAuthScreen,
  GrantVerifyScreen,
  ReturnGrantScreen,
} from "./grant-screens";
import { SubscriptionScreen } from "./subscription-screen";
import { TaxRecipientScreen, validateTaxForm } from "./tax-recipient-screen";

const router = { push: vi.fn(), replace: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/billing",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

beforeEach(() => {
  router.push.mockClear();
  router.replace.mockClear();
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetBillingState();
  vi.unstubAllGlobals();
});

afterAll(() => stopServer());

describe("시작 고객 합의", () => {
  it("합의 내용과 협력 조건을 보여주고 확인 시각을 기록한다", async () => {
    billingState.agreement = buildAgreement();
    const user = userEvent.setup();
    renderOffice(<StartAgreementScreen />, { role: "OWNER" });
    expect(await screen.findByText("2027-06-30 23:59")).not.toBeNull();
    expect(screen.getByText(/3명 · 59,900원 \(VAT 포함\)/)).not.toBeNull();
    expect(screen.getByText("주간 사용 확인: 예")).not.toBeNull();
    expect(screen.getByText("사례 공개 선택 동의: 동의하지 않음")).not.toBeNull();
    expect(screen.getByText("확인은 선택이며 자격과 가격에 영향이 없습니다.")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "합의 내용 확인" }));
    expect(await screen.findByText(/2026-11-10 09:00에 확인했습니다/)).not.toBeNull();
  });

  it("합의가 없으면 안내만 보여준다", async () => {
    renderOffice(<StartAgreementScreen />, { role: "OWNER" });
    expect(await screen.findByText("확인할 시작 고객 합의가 없습니다.")).not.toBeNull();
  });

  it("조회 실패와 확인 실패를 구분해 보여준다", async () => {
    billingState.agreement = buildAgreement();
    server.use(
      http.post("/api/subscriptions/start-customer-agreement/acknowledge", () =>
        errorResponse(409, "INVALID_TRANSITION", "불가"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<StartAgreementScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "합의 내용 확인" }));
    expect((await screen.findByRole("alert")).textContent).toContain("진행할 수 없습니다");
  });

  it("서버 오류이면 다시 시도 버튼을 보여준다", async () => {
    server.use(http.get("/api/subscriptions/start-customer-agreement", () => mockErrors.server()));
    renderOffice(<StartAgreementScreen />, { role: "OWNER" });
    expect(await screen.findByRole("button", { name: "다시 시도" })).not.toBeNull();
  });

  it("구독 현황은 시작 고객 합의와 처리할 가격 변경 안내로 가는 링크를 보여준다", async () => {
    billingState.subscription = buildSubscription({
      startCustomer: {
        agreementId: 7,
        priceVersion: "2026-11",
        priceEndsAt: "2028-06-30T23:59:59+09:00",
      },
      pendingPriceChangeNoticeCount: 2,
    });
    renderOffice(<SubscriptionScreen />, { role: "OWNER" });
    expect(await screen.findByRole("link", { name: "합의 내용 확인" })).not.toBeNull();
    expect(screen.getByText(/가격 보장 종료 2028-06-30/)).not.toBeNull();
    expect(screen.getByText("처리할 가격 변경 안내가 2건 있습니다.")).not.toBeNull();
    expect(screen.getByRole("link", { name: "안내 확인하고 응답" }).getAttribute("href")).toBe(
      "/billing/price-changes",
    );
  });

  it("합의와 안내가 없으면 해당 영역을 보여주지 않는다", async () => {
    renderOffice(<SubscriptionScreen />, { role: "OWNER" });
    await screen.findByText("무료 이용 중");
    expect(screen.queryByRole("link", { name: "합의 내용 확인" })).toBeNull();
    expect(screen.queryByText(/처리할 가격 변경 안내/)).toBeNull();
  });
});

describe("가격 변경 안내", () => {
  it("인상 안내는 금액과 기한, 동의·거절 버튼을 보여준다", async () => {
    billingState.notices = [buildNotice()];
    renderOffice(<PriceNoticesScreen />, { role: "OWNER" });
    expect(await screen.findByText("가격 인상 안내")).not.toBeNull();
    expect(screen.getByText("2026-11 → 2027-03")).not.toBeNull();
    expect(screen.getByText("64,900원 (VAT 포함)")).not.toBeNull();
    expect(screen.getByText("2027-03-02 23:59")).not.toBeNull();
    expect(screen.getByText("응답 대기")).not.toBeNull();
    expect(
      screen.getByText(/응답 기한까지 동의하지 않으면 결제되지 않고 구독이 종료됩니다/),
    ).not.toBeNull();
    expect(screen.getByRole("link", { name: "새 금액 확인하고 동의" }).getAttribute("href")).toBe(
      "/billing/consent?noticeId=31",
    );
  });

  it("인하·동일 안내는 할 일이 없다고 알리고 버튼을 보여주지 않는다", async () => {
    billingState.notices = [
      buildNotice({
        changeKind: "NON_INCREASE",
        consentRequired: false,
        decision: "NOT_REQUIRED",
        newAmountInclVat: 49900,
      }),
    ];
    renderOffice(<PriceNoticesScreen />, { role: "OWNER" });
    expect(await screen.findByText("가격 인하·동일 안내")).not.toBeNull();
    expect(screen.getByText("따로 하실 일은 없습니다.")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "거절" })).toBeNull();
  });

  it("거절하면 결정이 바뀌고 동의 버튼이 사라진다", async () => {
    billingState.notices = [buildNotice()];
    const user = userEvent.setup();
    renderOffice(<PriceNoticesScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "거절" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "거절" }),
    );
    expect(await screen.findByText("거절함")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "거절" })).toBeNull();
  });

  it("닫힌 안내이면 안내를 보여주고 목록을 다시 불러온다", async () => {
    billingState.notices = [buildNotice()];
    server.use(
      http.post("/api/subscriptions/price-change-notices/31/decline", () =>
        errorResponse(409, "PRICE_CHANGE_NOTICE_CLOSED", "닫힘"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<PriceNoticesScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "거절" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "거절" }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "응답 기한이 지났거나 이미 처리된",
    );
  });

  it("안내가 없으면 빈 안내를 보여주고 조회 실패 시 다시 시도할 수 있다", async () => {
    renderOffice(<PriceNoticesScreen />, { role: "OWNER" });
    expect(await screen.findByText("처리할 가격 변경 안내가 없습니다.")).not.toBeNull();
    cleanup();
    server.use(http.get("/api/subscriptions/price-change-notices", () => mockErrors.server()));
    renderOffice(<PriceNoticesScreen />, { role: "OWNER" });
    expect(await screen.findByRole("button", { name: "다시 시도" })).not.toBeNull();
  });
});

describe("세금계산서 수신 정보", () => {
  async function fill(user: ReturnType<typeof userEvent.setup>) {
    await user.type(await screen.findByRole("textbox", { name: "사업자등록번호" }), "1234567890");
    await user.type(screen.getByRole("textbox", { name: "상호" }), "예시 공인중개사사무소");
    await user.type(screen.getByRole("textbox", { name: "대표자 이름" }), "김예시");
    await user.type(screen.getByRole("textbox", { name: "수신 이메일" }), "tax@example.com");
  }

  it("초기값 안내와 청구 전 발급 불가 안내를 보여준다", async () => {
    renderOffice(<TaxRecipientScreen />, { role: "OWNER" });
    expect(await screen.findByText(/사무소 정보로 채운 초기값입니다/)).not.toBeNull();
    expect(
      screen.getByText(
        /세금계산서를 받으시려면 사업자등록번호와 수신 이메일을 입력해 주세요. 청구가 시작되기 전에는 세금계산서가 발급되지 않습니다./,
      ),
    ).not.toBeNull();
    expect(screen.getByText(/현금영수증 발급 대상 결제 수단이 없습니다/)).not.toBeNull();
  });

  it("빈 값과 형식 오류를 필드별로 알린다", async () => {
    const user = userEvent.setup();
    renderOffice(<TaxRecipientScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "저장" }));
    expect(
      await screen.findByText(
        "사업자등록번호 형식이 올바르지 않습니다. 숫자 10자리를 입력해 주세요.",
      ),
    ).not.toBeNull();
    expect(screen.getByText("상호를 입력해 주세요.")).not.toBeNull();
    expect(screen.getByText("대표자 이름을 입력해 주세요.")).not.toBeNull();
    expect(screen.getByText("이메일 주소 형식이 올바르지 않습니다.")).not.toBeNull();
    expect(billingState.taxRecipient.registered).toBe(false);
  });

  it("입력을 마치고 저장하면 저장 완료 안내를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<TaxRecipientScreen />, { role: "OWNER" });
    await fill(user);
    await user.click(screen.getByRole("checkbox", { name: "세금계산서 발급을 요청합니다" }));
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("세금계산서 수신 정보를 저장했습니다.")).not.toBeNull();
    expect(billingState.taxRecipient.issueRequested).toBe(true);
    expect(billingState.taxRecipient.businessNumber).toBe("1234567890");
  });

  it("서버가 형식 오류를 돌려주면 안내를 보여준다", async () => {
    server.use(
      http.put("/api/billing/tax-recipient", () =>
        errorResponse(422, "TAX_RECIPIENT_INVALID", "형식", {
          fieldErrors: [{ field: "businessNumber", message: "검증번호가 맞지 않습니다." }],
        }),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<TaxRecipientScreen />, { role: "OWNER" });
    await fill(user);
    await user.click(screen.getByRole("button", { name: "저장" }));
    const alerts = await screen.findAllByRole("alert");
    expect(
      alerts.some((alert) =>
        alert.textContent?.includes("세금계산서 수신 정보 형식을 확인해 주세요."),
      ),
    ).toBe(true);
    expect(screen.getByText("검증번호가 맞지 않습니다.")).not.toBeNull();
  });

  it("저장된 값은 불러와 보여주고 조회 실패 시 오류를 보여준다", async () => {
    billingState.taxRecipient = {
      registered: true,
      recipientId: 5,
      businessNumber: "123-45-67890",
      companyName: "저장된 상호",
      representativeName: "김저장",
      receiverEmail: "saved@example.com",
      taxType: "SIMPLIFIED",
      issueRequested: true,
      registeredAt: "2026-11-10T09:00:00+09:00",
    };
    renderOffice(<TaxRecipientScreen />, { role: "OWNER" });
    expect(await screen.findByDisplayValue("저장된 상호")).not.toBeNull();
    expect(
      (screen.getByRole("textbox", { name: "사업자등록번호" }) as HTMLInputElement).value,
    ).toBe("1234567890");
    cleanup();
    server.use(http.get("/api/billing/tax-recipient", () => mockErrors.server()));
    renderOffice(<TaxRecipientScreen />, { role: "OWNER" });
    expect(await screen.findByRole("button", { name: "다시 시도" })).not.toBeNull();
  });

  it("검증 함수는 올바른 입력을 통과시킨다", () => {
    expect(
      validateTaxForm({
        businessNumber: "1234567890",
        companyName: "a",
        representativeName: "b",
        receiverEmail: "a@b.co",
        taxType: "GENERAL",
        issueRequested: false,
      }),
    ).toEqual({});
  });
});

describe("인증 중단과 반환 안내", () => {
  it("중단되지 않았으면 정상 안내를 보여준다", async () => {
    renderOffice(<AuthSuspensionScreen />, { role: "OWNER" });
    expect(await screen.findByText("인증이 중단되지 않았습니다.")).not.toBeNull();
  });

  it("중단 상태이면 기한 경고와 재개 방법, 보존된 무료 기간을 보여준다", async () => {
    billingState.authSuspension = {
      authSuspended: true,
      suspendedAt: "2026-12-01T09:00:00+09:00",
      reauthDeadlineAt: "2026-12-31T09:00:00+09:00",
      trialRemainingSeconds: 90_000,
    };
    renderOffice(<AuthSuspensionScreen />, { role: "OWNER" });
    expect(await screen.findByText(/자동 청구는 정지되었고/)).not.toBeNull();
    expect(screen.getByText("사무소 인증이 중단되었습니다")).not.toBeNull();
    expect(screen.getByText(/중단 후 30일 안에 재인증과 구매 재개를 마치지 않으면/)).not.toBeNull();
    expect(screen.getByText("2026-12-31 09:00")).not.toBeNull();
    expect(screen.getByText("1일 1시간")).not.toBeNull();
    expect(screen.getByRole("link", { name: "환불 신청 내역" })).not.toBeNull();
  });

  it("고정 종료 방식이라 보존된 기간이 없으면 그 줄을 숨기고 조회 실패 시 다시 시도할 수 있다", async () => {
    billingState.authSuspension = {
      authSuspended: true,
      suspendedAt: "2026-12-01T09:00:00+09:00",
      reauthDeadlineAt: null,
      trialRemainingSeconds: null,
    };
    renderOffice(<AuthSuspensionScreen />, { role: "OWNER" });
    await screen.findByText(/자동 청구는 정지되었고/);
    expect(screen.queryByText("보존된 무료 기간")).toBeNull();
    cleanup();
    server.use(http.get("/api/offices/current/auth-status", () => mockErrors.forbidden()));
    renderOffice(<AuthSuspensionScreen />, { role: "OWNER" });
    expect(await screen.findByRole("heading", { name: /권한/ })).not.toBeNull();
  });

  it.each([
    [90_000, "1일 1시간"],
    [86_400, "1일"],
    [7_500, "2시간 5분"],
    [600, "10분"],
  ])("%i초는 %s로 표시한다", (seconds, text) => {
    expect(formatRemaining(seconds)).toBe(text);
  });

  it("자료 반환 안내는 종료 후 30일과 별도 보관계약을 알린다", () => {
    renderOffice(<ReturnGuideScreen />, { role: "OWNER" });
    expect(screen.getByText(/종료된 때부터 30일 동안 일반 업무 자료를 조회하고/)).not.toBeNull();
    expect(screen.getByText("반환 권한 재인증 안내")).not.toBeNull();
    expect(screen.getByText(/새로 가입해도 반환 권한은 자동으로 연결되지 않습니다/)).not.toBeNull();
    expect(
      screen.getByText(/보관 계약을 맺은 권한자만 보관된 문서를 조회할 수 있습니다/),
    ).not.toBeNull();
    expect(screen.getByText(/별도 보관계약이 필요합니다/)).not.toBeNull();
  });
});

describe("반환·보관 별도 재인증", () => {
  it("권한 링크의 번호가 없으면 다시 접속하라고 안내한다", () => {
    renderOffice(<GrantAuthScreen kind="return" grantId={null} />);
    expect(screen.getByRole("alert").textContent).toContain(
      "권한 안내에 담긴 링크로 다시 접속해 주세요.",
    );
  });

  it("비밀번호를 비우면 검증 오류를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<GrantAuthScreen kind="return" grantId={12} />);
    await user.click(screen.getByRole("button", { name: "이메일 비밀번호로 확인" }));
    expect(await screen.findByText("비밀번호를 입력해 주세요.")).not.toBeNull();
  });

  it("이메일 비밀번호로 확인하면 반환 화면으로 이동하고 세션 안내를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<GrantAuthScreen kind="return" grantId={12} />);
    expect(screen.getByText(/10분 동안 아무 동작이 없거나 30분이 지나면/)).not.toBeNull();
    await user.type(screen.getByLabelText("비밀번호"), "correct-pw");
    await user.click(screen.getByRole("button", { name: "이메일 비밀번호로 확인" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/return"));
  });

  it("보관권한은 보관 화면으로 이동한다", async () => {
    const user = userEvent.setup();
    renderOffice(<GrantAuthScreen kind="archive" grantId={13} />);
    await user.type(screen.getByLabelText("비밀번호"), "correct-pw");
    await user.click(screen.getByRole("button", { name: "이메일 비밀번호로 확인" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/archive"));
  });

  it("비밀번호가 틀리면 원인별 문구를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<GrantAuthScreen kind="return" grantId={12} />);
    await user.type(screen.getByLabelText("비밀번호"), "wrong");
    await user.click(screen.getByRole("button", { name: "이메일 비밀번호로 확인" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "이메일 또는 비밀번호가 맞지 않습니다.",
    );
  });

  it("권한이 만료됐거나 회수됐으면 고객지원 링크를 함께 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<GrantAuthScreen kind="return" grantId={404} />);
    await user.type(screen.getByLabelText("비밀번호"), "correct-pw");
    await user.click(screen.getByRole("button", { name: "이메일 비밀번호로 확인" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "반환 권한이 만료되었습니다. 고객지원으로 문의해 주세요.",
    );
    expect(screen.getByRole("link", { name: "고객지원" })).not.toBeNull();
  });

  it("요청 제한(429)이면 대기 시간을 알린다", async () => {
    server.use(http.post("/api/grant-auth/return", () => mockErrors.rateLimited(120)));
    const user = userEvent.setup();
    renderOffice(<GrantAuthScreen kind="return" grantId={12} />);
    await user.type(screen.getByLabelText("비밀번호"), "x");
    await user.click(screen.getByRole("button", { name: "이메일 비밀번호로 확인" }));
    expect((await screen.findByRole("alert")).textContent).toContain("2분 뒤에 다시 시도해 주세요");
  });

  it("카카오로 확인을 누르면 권한 정보를 저장하고 세션을 만들지 않는 인증 주소로 이동한다", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    const user = userEvent.setup();
    renderOffice(<GrantAuthScreen kind="archive" grantId={13} />);
    await user.click(screen.getByRole("button", { name: "카카오로 확인" }));
    expect(assign).toHaveBeenCalledWith("/api/auth/kakao/start?purpose=GRANT");
    expect(JSON.parse(window.sessionStorage.getItem(GRANT_PENDING_KEY) ?? "{}")).toEqual({
      kind: "archive",
      grantId: 13,
    });
  });

  it("카카오 인증 완료 코드를 받으면 확인하고 이동한다", async () => {
    window.sessionStorage.setItem(
      GRANT_PENDING_KEY,
      JSON.stringify({ kind: "return", grantId: 12 }),
    );
    renderOffice(<GrantVerifyScreen credential="ok-code" />);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/return"));
  });

  it("다른 카카오 계정이면 원인을 알리고 고객지원 링크를 보여준다", async () => {
    window.sessionStorage.setItem(
      GRANT_PENDING_KEY,
      JSON.stringify({ kind: "return", grantId: 12 }),
    );
    renderOffice(<GrantVerifyScreen credential="other-account" />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "인증한 카카오 계정이 권한자와 다릅니다",
    );
    expect(screen.getByRole("link", { name: "고객지원" })).not.toBeNull();
  });

  it("완료 코드나 저장된 권한 정보가 없으면 다시 시도하라고 안내한다", async () => {
    renderOffice(<GrantVerifyScreen credential={null} />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "본인 확인을 완료하지 못했습니다",
    );
  });
});

describe("반환권한 화면", () => {
  it("인증 없이 열면 다시 인증하라고 안내한다", async () => {
    renderOffice(<ReturnGrantScreen />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "본인 확인이 만료됐거나 권한이 없습니다",
    );
    expect(screen.getByRole("link", { name: "고객지원" })).not.toBeNull();
  });

  it("권한 만료일을 보여주고 내보내기를 진행해 완료되면 내려받을 수 있다", async () => {
    billingState.grant.signedIn = true;
    const user = userEvent.setup();
    renderOffice(<ReturnGrantScreen />);
    expect(await screen.findByText("2027-12-31 00:00")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "자료 내보내기" }));
    expect(await screen.findByText(/내보내기를 (준비|만들)고 있습니다/)).not.toBeNull();
    const link = await screen.findByRole("link", { name: "내려받기" }, { timeout: 8000 });
    expect(link.getAttribute("href")).toBe("https://files.example.com/export-77.zip");
    expect(screen.getByText(/다운로드 주소는 10분 동안 유효합니다/)).not.toBeNull();
  }, 20000);

  it("회수된 권한은 안내하고 내보내기 만료와 실패를 알린다", async () => {
    billingState.grant.signedIn = true;
    billingState.grant.revoked = true;
    renderOffice(<ReturnGrantScreen />);
    expect(await screen.findByText("반환 권한이 회수되었습니다.")).not.toBeNull();
  });

  it("내보내기 요청이 만료 오류를 돌려주면 안내한다", async () => {
    billingState.grant.signedIn = true;
    server.use(
      http.post("/api/return-grants/12/export", () =>
        errorResponse(403, "RETURN_GRANT_INVALID", "무효"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<ReturnGrantScreen />);
    await user.click(await screen.findByRole("button", { name: "자료 내보내기" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "반환 권한이 만료되었습니다. 고객지원으로 문의해 주세요.",
    );
  });

  it("내보내기 파일이 만료되면 다시 요청하라고 안내한다", async () => {
    billingState.grant.signedIn = true;
    server.use(
      http.get("/api/return-grants/12/exports/77", () =>
        errorResponse(410, "EXPORT_EXPIRED", "만료"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<ReturnGrantScreen />);
    await user.click(await screen.findByRole("button", { name: "자료 내보내기" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "내보내기 파일이 만료됐습니다",
    );
  });

  it("내보내기가 실패하면 다시 요청할 수 있다", async () => {
    billingState.grant.signedIn = true;
    server.use(
      http.get("/api/return-grants/12/exports/77", () =>
        HttpResponse.json({
          exportId: 77,
          status: "FAILED",
          downloadUrl: null,
          expiresAt: null,
          fileExpiresAt: null,
        }),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<ReturnGrantScreen />);
    await user.click(await screen.findByRole("button", { name: "자료 내보내기" }));
    expect(await screen.findByText("내보내기에 실패했습니다. 다시 요청해 주세요.")).not.toBeNull();
  });

  it("조회가 실패하면 다시 시도 버튼을 보여준다", async () => {
    server.use(http.get("/api/return-grants/current", () => mockErrors.server()));
    renderOffice(<ReturnGrantScreen />);
    expect(await screen.findByRole("button", { name: "다시 시도" })).not.toBeNull();
  });
});

describe("보관권한 화면", () => {
  it("인증 없이 열면 다시 인증하라고 안내한다", async () => {
    renderOffice(<ArchiveGrantScreen />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "본인 확인이 만료됐거나 권한이 없습니다",
    );
  });

  it("계약 기간 동안 유효한 권한은 만료 없음으로 보여준다", async () => {
    billingState.grant.signedIn = true;
    renderOffice(<ArchiveGrantScreen />);
    expect(await screen.findByText("계약 기간 동안")).not.toBeNull();
    expect(screen.getByText(/보관 문서 열람은 고객지원으로 요청해 주세요/)).not.toBeNull();
  });

  it("법정보존문서 내보내기를 진행해 완료되면 내려받을 수 있다", async () => {
    billingState.grant.signedIn = true;
    const user = userEvent.setup();
    renderOffice(<ArchiveGrantScreen />);
    await user.click(await screen.findByRole("button", { name: "자료 내보내기" }));
    const link = await screen.findByRole("link", { name: "내려받기" }, { timeout: 8000 });
    expect(link.getAttribute("href")).toBe("https://files.example.com/archive-901.zip");
  }, 20000);

  it("종료된 권한은 안내한다", async () => {
    billingState.grant.signedIn = true;
    billingState.grant.revoked = true;
    renderOffice(<ArchiveGrantScreen />);
    expect(await screen.findByText("종료된 보관권한입니다.")).not.toBeNull();
  });
});
