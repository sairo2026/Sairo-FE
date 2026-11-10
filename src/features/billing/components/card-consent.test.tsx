// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { billingState, buildSubscription, resetBillingState } from "@/mocks/handlers/billing";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import type { BillingAuthLauncher } from "../lib/payment-widget";
import { PaymentWidgetUnavailableError, tossBillingAuthLauncher } from "../lib/payment-widget";
import { CardGuideScreen, CARD_GUIDE_SKIP_KEY } from "./card-guide-screen";
import { CardResultScreen, CardScreen } from "./card-screen";
import { ConsentScreen } from "./consent-screen";

const router = { push: vi.fn(), replace: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/billing/card",
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
});

afterAll(() => stopServer());

function fakeLauncher(overrides: Partial<BillingAuthLauncher> = {}): BillingAuthLauncher {
  return {
    isConfigured: () => true,
    requestBillingAuth: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("카드 등록", () => {
  it("불러오는 동안 로딩을 보여준다", () => {
    renderOffice(<CardScreen launcher={fakeLauncher()} />, { role: "OWNER" });
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("등록 전에는 결제되지 않는다는 안내와 첫 결제 예정일을 보여주고 안내 확인 전에는 등록할 수 없다", async () => {
    renderOffice(<CardScreen launcher={fakeLauncher()} />, { role: "OWNER" });
    expect(
      await screen.findByText(
        /결제수단을 등록해도 지금 결제되지 않습니다. 첫 결제 예정일은 2027-01-09이며/,
      ),
    ).not.toBeNull();
    const button = screen.getByRole("button", { name: "카드 등록" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
  });

  it("안내를 확인하면 세션을 발급받아 등록창을 연다", async () => {
    const launcher = fakeLauncher();
    const user = userEvent.setup();
    renderOffice(<CardScreen launcher={launcher} />, { role: "OWNER" });
    await user.click(
      await screen.findByRole("checkbox", { name: "카드 등록 안내를 확인했습니다" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "카드 등록" }).getAttribute("aria-disabled"),
      ).toBeNull(),
    );
    await user.click(screen.getByRole("button", { name: "카드 등록" }));
    await waitFor(() => expect(launcher.requestBillingAuth).toHaveBeenCalledTimes(1));
    const request = (launcher.requestBillingAuth as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(request.customerKey).toBe("customer-key-0001");
    expect(request.successUrl).toContain("/billing/card/result?v=1.0");
    expect(request.failUrl).toContain("/billing/card/result");
    expect(billingState.sessionIssued).toBe(true);
  });

  it("테스트 키가 없으면 등록창을 열지 않고 준비 중 안내를 보여준다", async () => {
    const launcher = fakeLauncher({ isConfigured: () => false });
    const user = userEvent.setup();
    renderOffice(<CardScreen launcher={launcher} />, { role: "OWNER" });
    await user.click(await screen.findByRole("checkbox"));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "카드 등록" }).getAttribute("aria-disabled"),
      ).toBeNull(),
    );
    await user.click(screen.getByRole("button", { name: "카드 등록" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "카드 등록 기능을 준비하고 있습니다",
    );
    expect(launcher.requestBillingAuth).not.toHaveBeenCalled();
  });

  it("세션 발급이 실패하면 결제된 금액이 없다고 안내한다", async () => {
    server.use(http.post("/api/subscriptions/billing-key/session", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<CardScreen launcher={fakeLauncher()} />, { role: "OWNER" });
    await user.click(await screen.findByRole("checkbox"));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "카드 등록" }).getAttribute("aria-disabled"),
      ).toBeNull(),
    );
    await user.click(screen.getByRole("button", { name: "카드 등록" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "일시적인 오류가 발생했습니다",
    );
  });

  it("등록창 호출이 실패하면 오류를 보여준다", async () => {
    const launcher = fakeLauncher({
      requestBillingAuth: vi.fn().mockRejectedValue(new PaymentWidgetUnavailableError()),
    });
    const user = userEvent.setup();
    renderOffice(<CardScreen launcher={launcher} />, { role: "OWNER" });
    await user.click(await screen.findByRole("checkbox"));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "카드 등록" }).getAttribute("aria-disabled"),
      ).toBeNull(),
    );
    await user.click(screen.getByRole("button", { name: "카드 등록" }));
    expect((await screen.findByRole("alert")).textContent).toContain("준비하고 있습니다");
  });

  it("등록된 카드를 카드사와 끝 4자리로 보여주고 해제할 수 있다", async () => {
    billingState.subscription = buildSubscription({
      paymentMethod: {
        cardIssuer: "신한카드",
        cardLast4: "1234",
        registeredAt: "2026-11-10T09:00:00+09:00",
      },
      readiness: { hasBillingKey: true, hasValidConsent: false },
    });
    const user = userEvent.setup();
    renderOffice(<CardScreen launcher={fakeLauncher()} />, { role: "OWNER" });
    expect(await screen.findByText("신한카드 끝자리 1234")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "카드 해제" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "해제" }),
    );
    expect(await screen.findByText("등록된 카드를 해제했습니다.")).not.toBeNull();
    expect(await screen.findByText("등록된 카드가 없습니다.")).not.toBeNull();
  });

  it("처리 중인 청구가 있으면 카드 교체가 결과 확인 뒤 완료된다고 안내한다", async () => {
    billingState.subscription = buildSubscription({
      paymentMethod: {
        cardIssuer: "신한카드",
        cardLast4: "1234",
        registeredAt: "2026-11-10T09:00:00+09:00",
      },
      latestInvoice: {
        invoiceId: 1,
        status: "VERIFYING",
        nextRetryAt: null,
        lastFailureCategory: null,
      },
    });
    renderOffice(<CardScreen launcher={fakeLauncher()} />, { role: "OWNER" });
    expect(await screen.findByText(/결과 확인 뒤 완료됩니다/)).not.toBeNull();
  });

  it("해제가 실패하면 오류를 보여준다", async () => {
    billingState.subscription = buildSubscription({
      paymentMethod: {
        cardIssuer: "신한카드",
        cardLast4: "1234",
        registeredAt: "2026-11-10T09:00:00+09:00",
      },
    });
    server.use(http.delete("/api/subscriptions/billing-key", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<CardScreen launcher={fakeLauncher()} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "카드 해제" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "해제" }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain("일시적인 오류");
  });

  it("조회 실패(500)와 권한 없음(403)을 구분해 보여준다", async () => {
    server.use(http.get("/api/subscriptions/current", () => mockErrors.forbidden()));
    renderOffice(<CardScreen launcher={fakeLauncher()} />, { role: "OWNER" });
    expect(await screen.findByRole("heading", { name: /권한/ })).not.toBeNull();
  });
});

describe("카드 등록 결과", () => {
  it("성공하면 결제된 금액이 없고 첫 결제 예정일이 있다고 알린다", async () => {
    renderOffice(
      <CardResultScreen authKey="auth-ok" customerKey="customer-key-0001" version="1.0" />,
      { role: "OWNER" },
    );
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(
      await screen.findByText(
        /이번 등록으로 결제된 금액은 없습니다. 첫 결제 예정일은 2027-01-09입니다/,
      ),
    ).not.toBeNull();
    expect(billingState.subscription.readiness.hasBillingKey).toBe(true);
  });

  it("카드사가 승인하지 않으면 결제된 금액이 없다고 안내한다", async () => {
    renderOffice(
      <CardResultScreen authKey="bad-auth" customerKey="customer-key-0001" version="1.0" />,
      { role: "OWNER" },
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "카드사에서 결제수단 등록을 승인하지 않았습니다",
    );
  });

  it("고객 키가 맞지 않으면 처음부터 다시 시도하라고 안내한다", async () => {
    renderOffice(
      <CardResultScreen authKey="auth-ok" customerKey="other-key" version="1.0" />,
      { role: "OWNER" },
    );
    expect((await screen.findByRole("alert")).textContent).toContain("처음부터 다시 시도해 주세요");
  });

  it("안내 버전이 바뀌었으면 다시 확인하라고 안내한다", async () => {
    server.use(
      http.post("/api/subscriptions/billing-key", () =>
        errorResponse(409, "TERMS_VERSION_CHANGED", "바뀜"),
      ),
    );
    renderOffice(
      <CardResultScreen authKey="auth-ok" customerKey="customer-key-0001" version="old" />,
      { role: "OWNER" },
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "결제 조건 안내가 새로 바뀌었습니다",
    );
  });

  it("등록창을 닫고 돌아오면 완료되지 않았다고 안내한다", () => {
    renderOffice(<CardResultScreen failCode="PAY_PROCESS_CANCELED" />, { role: "OWNER" });
    expect(screen.getByRole("alert").textContent).toContain("카드 등록이 완료되지 않았습니다");
  });

  it("등록 실패로 돌아오면 결제된 금액이 없다고 안내한다", () => {
    renderOffice(<CardResultScreen failCode="INVALID_CARD" />, { role: "OWNER" });
    expect(screen.getByRole("alert").textContent).toContain("결제된 금액은 없습니다");
  });

  it("요청 제한(429)이면 대기 시간을 안내한다", async () => {
    server.use(http.post("/api/subscriptions/billing-key", () => mockErrors.rateLimited(60)));
    renderOffice(
      <CardResultScreen authKey="auth-ok" customerKey="customer-key-0001" version="1.0" />,
      { role: "OWNER" },
    );
    expect((await screen.findByRole("alert")).textContent).toContain("1분 뒤에 다시 시도해 주세요");
  });
});

describe("결제 대행 SDK 래퍼", () => {
  it("테스트 키 환경변수가 없으면 설정되지 않은 것으로 본다", async () => {
    expect(tossBillingAuthLauncher.isConfigured()).toBe(false);
    await expect(
      tossBillingAuthLauncher.requestBillingAuth({
        customerKey: "k",
        successUrl: "s",
        failUrl: "f",
      }),
    ).rejects.toBeInstanceOf(PaymentWidgetUnavailableError);
  });
});

describe("로그인 직후 카드 등록 안내", () => {
  it("카드가 없으면 안내를 보여주고 청구가 아니라고 알린다", async () => {
    const user = userEvent.setup();
    renderOffice(<CardGuideScreen />, { role: "OWNER" });
    expect(await screen.findByRole("heading", { name: "카드를 등록해 두세요" })).not.toBeNull();
    expect(screen.getByText(/카드 등록은 결제 준비이며 청구가 아닙니다/)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "카드 등록하기" }));
    expect(router.push).toHaveBeenCalledWith("/billing/card");
  });

  it("나중에 하기를 누르면 이번 접속 동안 다시 묻지 않는다", async () => {
    const user = userEvent.setup();
    const view = renderOffice(<CardGuideScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "나중에 하기" }));
    expect(router.replace).toHaveBeenCalledWith("/");
    expect(window.sessionStorage.getItem(CARD_GUIDE_SKIP_KEY)).toBe("1");
    view.unmount();
    router.replace.mockClear();
    renderOffice(<CardGuideScreen />, { role: "OWNER" });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
  });

  it("이미 카드가 있으면 바로 홈으로 보낸다", async () => {
    billingState.subscription = buildSubscription({
      readiness: { hasBillingKey: true, hasValidConsent: true },
    });
    renderOffice(<CardGuideScreen />, { role: "OWNER" });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
  });

  it("조회가 실패해도 로그인 흐름을 막지 않고 홈으로 보낸다", async () => {
    server.use(http.get("/api/subscriptions/current", () => mockErrors.server()));
    renderOffice(<CardGuideScreen />, { role: "OWNER" });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
  });
});

describe("구독 구매 동의", () => {
  it("불러오는 동안 로딩을 보여주고 조건 요약을 서버 값 그대로 보여준다", async () => {
    renderOffice(<ConsentScreen />, { role: "OWNER" });
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(await screen.findByText("59,900원 (VAT 포함, 부가세 5,445원)")).not.toBeNull();
    expect(screen.getByText("사이로 월 구독 (다인)")).not.toBeNull();
    expect(screen.getByText("3명")).not.toBeNull();
    expect(screen.getByText("2027-01-09 ~ 2027-02-09")).not.toBeNull();
    expect(screen.getByText("2027-01-09 00:00")).not.toBeNull();
    expect(screen.getByText(/동의만으로는 결제되지 않습니다/)).not.toBeNull();
    expect(screen.getByText(/자동으로 결제하지 않고 다시 동의를 요청합니다/)).not.toBeNull();
  });

  it("두 항목을 체크하기 전에는 제출할 수 없다", async () => {
    const user = userEvent.setup();
    renderOffice(<ConsentScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "동의하고 확인 완료" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "두 필수 항목에 모두 동의해야",
    );
    expect(billingState.subscription.readiness.hasValidConsent).toBe(false);
  });

  it("체크를 마치고 제출하면 동의가 기록되고 청구되지 않는다고 알린다", async () => {
    const user = userEvent.setup();
    renderOffice(<ConsentScreen />, { role: "OWNER" });
    const boxes = await screen.findAllByRole("checkbox");
    expect(boxes.every((box) => !(box as HTMLInputElement).checked)).toBe(true);
    for (const box of boxes) await user.click(box);
    await user.click(screen.getByRole("button", { name: "동의하고 확인 완료" }));
    expect(
      await screen.findByText(/구독 조건 확인이 기록됐습니다. 동의만으로는 결제되지 않습니다/),
    ).not.toBeNull();
    expect(billingState.subscription.readiness.hasValidConsent).toBe(true);
  });

  it("서버 재계산값과 다르면 미리보기를 다시 받아 재확인을 받는다", async () => {
    server.use(
      http.post(
        "/api/subscriptions/purchase-consent",
        () => errorResponse(409, "CONSENT_TERMS_MISMATCH", "불일치"),
        { once: true },
      ),
    );
    const user = userEvent.setup();
    renderOffice(<ConsentScreen />, { role: "OWNER" });
    for (const box of await screen.findAllByRole("checkbox")) await user.click(box);
    await user.click(screen.getByRole("button", { name: "동의하고 확인 완료" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "이용 인원 또는 금액이 바뀌었습니다",
    );
    await waitFor(() => {
      const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
      expect(boxes.every((box) => !box.checked)).toBe(true);
    });
  });

  it("약관 버전이 바뀌면 새 조건을 확인하라고 안내한다", async () => {
    server.use(
      http.post(
        "/api/subscriptions/purchase-consent",
        () => errorResponse(409, "TERMS_VERSION_CHANGED", "버전"),
        {
          once: true,
        },
      ),
    );
    const user = userEvent.setup();
    renderOffice(<ConsentScreen />, { role: "OWNER" });
    for (const box of await screen.findAllByRole("checkbox")) await user.click(box);
    await user.click(screen.getByRole("button", { name: "동의하고 확인 완료" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "결제 조건 안내가 새로 바뀌었습니다",
    );
  });

  it("가격 변경 안내에서 넘어오면 새 가격 버전과 금액을 보여주고 안내 번호를 보낸다", async () => {
    let sent: Record<string, unknown> = {};
    server.use(
      http.post("/api/subscriptions/purchase-consent", async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return Response.json({
          termsVersion: "1.0",
          totalAmountInclVat: 64900,
          vatAmount: 5900,
          amountLimit: 64900,
          agreedAt: "2026-11-10T09:00:00+09:00",
        });
      }),
    );
    const user = userEvent.setup();
    renderOffice(<ConsentScreen noticeId={31} />, { role: "OWNER" });
    expect(await screen.findByText("64,900원 (VAT 포함, 부가세 5,900원)")).not.toBeNull();
    expect(screen.getByText("2027-03")).not.toBeNull();
    expect(screen.getByText(/가격 변경 안내에 대한 동의입니다/)).not.toBeNull();
    for (const box of screen.getAllByRole("checkbox")) await user.click(box);
    await user.click(screen.getByRole("button", { name: "동의하고 확인 완료" }));
    await screen.findByText(/구독 조건 확인이 기록됐습니다/);
    expect(sent.priceChangeNoticeId).toBe(31);
    expect(sent.agreed).toBe(true);
    expect(sent.amountLimit).toBe(64900);
  });

  it("닫힌 가격 변경 안내이면 응답 기한 안내를 보여준다", async () => {
    server.use(
      http.post("/api/subscriptions/purchase-consent", () =>
        errorResponse(409, "PRICE_CHANGE_NOTICE_CLOSED", "닫힘"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<ConsentScreen noticeId={31} />, { role: "OWNER" });
    for (const box of await screen.findAllByRole("checkbox")) await user.click(box);
    await user.click(screen.getByRole("button", { name: "동의하고 확인 완료" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "응답 기한이 지났거나 이미 처리된",
    );
  });

  it("미리보기 조회가 실패하면 오류와 다시 시도 버튼을 보여준다", async () => {
    server.use(http.get("/api/subscriptions/purchase-consent/preview", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<ConsentScreen />, { role: "OWNER" });
    expect(await screen.findByRole("button", { name: "다시 시도" })).not.toBeNull();
    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("사이로 월 구독 (다인)")).not.toBeNull();
  });

  it("권한이 없으면(403) 권한 없음 화면을 보여준다", async () => {
    server.use(http.post("/api/subscriptions/purchase-consent", () => mockErrors.forbidden()));
    const user = userEvent.setup();
    renderOffice(<ConsentScreen />, { role: "OWNER" });
    for (const box of await screen.findAllByRole("checkbox")) await user.click(box);
    await user.click(screen.getByRole("button", { name: "동의하고 확인 완료" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "이 작업을 할 권한이 없습니다",
    );
  });
});
