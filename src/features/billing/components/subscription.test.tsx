// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { billingState, buildSubscription, resetBillingState } from "@/mocks/handlers/billing";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { SubscriptionScreen, trialReminder } from "./subscription-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/billing",
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetBillingState();
});

afterAll(() => stopServer());

function show() {
  return renderOffice(<SubscriptionScreen />, { role: "OWNER" });
}

describe("구독 현황", () => {
  it("불러오는 동안 로딩을 보여준다", () => {
    show();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("조회가 실패하면 오류와 다시 시도 버튼을 보여준다", async () => {
    server.use(http.get("/api/subscriptions/current", () => mockErrors.server()));
    const user = userEvent.setup();
    show();
    expect(await screen.findByText(/일시적인 문제로 요청을 처리하지 못했습니다/)).not.toBeNull();
    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("무료 이용 중")).not.toBeNull();
  });

  it("권한이 없으면(403) 권한 없음 화면을 보여준다", async () => {
    server.use(http.get("/api/subscriptions/current", () => mockErrors.forbidden()));
    show();
    expect(await screen.findByRole("heading", { name: /권한/ })).not.toBeNull();
  });

  it("요청 제한(429)이면 대기 안내를 보여준다", async () => {
    server.use(http.get("/api/subscriptions/current", () => mockErrors.rateLimited(30)));
    show();
    expect(await screen.findByText(/30초 뒤에 다시 시도할 수 있습니다/)).not.toBeNull();
  });

  it("무료 이용 중에는 종료 예정과 결제 준비 상태를 보여주고 청구가 아님을 구분한다", async () => {
    show();
    expect(await screen.findByText("무료 이용 중")).not.toBeNull();
    expect(
      screen.getByText(/무료 종료 예정 2027-01-08 23:59 · 무료 기간 중에는 결제되지 않습니다/),
    ).not.toBeNull();
    expect(screen.getByText(/결제 준비와 실제 청구 시작은 다릅니다/)).not.toBeNull();
    const list = screen.getByRole("list", { name: "결제 준비 상태" });
    expect(within(list).getAllByText("필요")).toHaveLength(2);
    expect(screen.getByText(/30일 뒤 종료됩니다/)).not.toBeNull();
    expect(screen.getByRole("link", { name: "카드 등록" })).not.toBeNull();
  });

  it("준비가 끝나면 필요 표시와 경고를 숨긴다", async () => {
    billingState.subscription = buildSubscription({
      readiness: { hasBillingKey: true, hasValidConsent: true },
      paymentMethod: {
        cardIssuer: "신한카드",
        cardLast4: "1234",
        registeredAt: "2026-11-10T09:00:00+09:00",
      },
    });
    show();
    expect(await screen.findByText("신한카드 끝자리 1234")).not.toBeNull();
    expect(screen.queryByText(/30일 뒤 종료됩니다/)).toBeNull();
    expect(screen.queryAllByText("필요")).toHaveLength(0);
  });

  it("결제 전 상태는 청구가 시작된 것이 아니라고 안내하고 준비가 되면 결제할 수 있다", async () => {
    billingState.subscription = buildSubscription({
      status: "PRE_PAYMENT",
      prePaymentSince: "2027-01-09T00:00:00+09:00",
      readiness: { hasBillingKey: true, hasValidConsent: true },
    });
    const user = userEvent.setup();
    show();
    expect(await screen.findByText(/실제 청구가 시작된 것이 아닙니다/)).not.toBeNull();
    expect(screen.getByText(/결제 전 상태 시작 2027-01-09 00:00/)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "지금 결제" }));
    await waitFor(() => expect(billingState.subscription.status).toBe("ACTIVE"));
    expect(await screen.findByText("결제가 완료됐습니다.")).not.toBeNull();
  });

  it("준비가 안 된 결제 전 상태에서는 결제 버튼을 막는다", async () => {
    billingState.subscription = buildSubscription({ status: "PRE_PAYMENT" });
    show();
    const button = (await screen.findByRole("button", { name: "지금 결제" })) as HTMLButtonElement;
    expect(button.getAttribute("aria-disabled")).toBe("true");
  });

  it("첫 결제가 확정 실패하면 사유를 알리고 결제된 금액이 없다고 안내한다", async () => {
    billingState.subscription = buildSubscription({
      status: "PRE_PAYMENT",
      readiness: { hasBillingKey: true, hasValidConsent: true },
    });
    server.use(
      http.post("/api/subscriptions/first-payment", () =>
        errorResponse(402, "PAYMENT_FAILED", "실패"),
      ),
    );
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByRole("button", { name: "지금 결제" }));
    expect((await screen.findByRole("alert")).textContent).toContain("결제된 금액은 없습니다");
  });

  it("결제 결과를 확인 중이면 중복 결제를 막는다는 안내를 보여준다", async () => {
    billingState.subscription = buildSubscription({
      status: "PAST_DUE_GRACE",
      canRetryPayment: true,
      outstandingAmount: 59900,
      pastDueSince: "2027-02-09T00:00:00+09:00",
      restrictedAt: "2027-02-17T00:00:00+09:00",
      terminationAt: "2027-03-11T00:00:00+09:00",
    });
    server.use(
      http.post("/api/subscriptions/retry-payment", () =>
        errorResponse(409, "PAYMENT_VERIFYING", "확인 중"),
      ),
    );
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByRole("button", { name: "지금 재결제" }));
    expect((await screen.findByRole("alert")).textContent).toContain("중복 결제를 막기 위해");
  });

  it("카드나 동의가 없으면 결제 수단 필요 오류를 보여준다", async () => {
    billingState.subscription = buildSubscription({
      status: "PAST_DUE_GRACE",
      canRetryPayment: true,
    });
    server.use(
      http.post("/api/subscriptions/retry-payment", () =>
        errorResponse(402, "PAYMENT_METHOD_REQUIRED", "필요"),
      ),
    );
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByRole("button", { name: "지금 재결제" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "결제수단 등록과 결제 조건 동의가 먼저 필요합니다",
    );
  });

  it("미납 유예에서는 밀린 금액과 단계별 시각을 보여주고 재결제가 불가하면 버튼을 막는다", async () => {
    billingState.subscription = buildSubscription({
      status: "PAST_DUE_GRACE",
      canRetryPayment: false,
      outstandingAmount: 59900,
      pastDueSince: "2027-02-09T00:00:00+09:00",
      restrictedAt: "2027-02-17T00:00:00+09:00",
      terminationAt: "2027-03-11T00:00:00+09:00",
      latestInvoice: {
        invoiceId: 5,
        status: "FAILED",
        nextRetryAt: "2027-02-09T01:00:00+09:00",
        lastFailureCategory: "CARD_UNUSABLE",
      },
    });
    show();
    expect(await screen.findByText("미납 유예")).not.toBeNull();
    expect(screen.getByText("59,900원")).not.toBeNull();
    expect(screen.getByText("2027-02-17 00:00")).not.toBeNull();
    expect(screen.getByText("2027-03-11 00:00")).not.toBeNull();
    expect(screen.getByText(/다른 카드로 교체해 주세요/)).not.toBeNull();
    expect(screen.getByText(/다음 자동 재시도 2027-02-09 01:00/)).not.toBeNull();
    const button = screen.getByRole("button", { name: "지금 재결제" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
  });

  it("미납 제한 상태는 쓰기 제한과 허용 범위를 안내한다", async () => {
    billingState.subscription = buildSubscription({
      status: "PAST_DUE_RESTRICTED",
      canRetryPayment: true,
    });
    show();
    expect(await screen.findByText(/새 업무 입력이 제한됐습니다/)).not.toBeNull();
  });

  it("인증 중단 상태는 안내로 연결한다", async () => {
    billingState.subscription = buildSubscription({ status: "SUSPENDED" });
    show();
    expect(await screen.findByText("인증 중단")).not.toBeNull();
    expect(screen.getByRole("link", { name: "인증 중단 안내 보기" })).not.toBeNull();
  });

  it("종료 상태에서는 반환 기간 종료일을 보여준다", async () => {
    billingState.subscription = buildSubscription({
      status: "ENDED",
      isInReturnPeriod: true,
      returnPeriodEndsAt: "2027-04-10T00:00:00+09:00",
      canRetryPayment: true,
    });
    show();
    expect(await screen.findByText("2027-04-10까지 자료를 내보낼 수 있습니다.")).not.toBeNull();
    expect(screen.getByRole("button", { name: "지금 재결제" })).not.toBeNull();
  });

  it("해지를 예약하면 종료 시각을 알리고 예약 취소 버튼으로 바뀐다", async () => {
    billingState.subscription = buildSubscription({
      status: "ACTIVE",
      nextChargeAt: "2027-02-09T00:00:00+09:00",
      nextChargeAmount: 59900,
      currentPeriodEnd: "2027-02-09T00:00:00+09:00",
    });
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByRole("button", { name: "해지 예약" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain(
      "2027-02-09 00:00에 구독이 끝나고 그 뒤로는 결제되지 않습니다",
    );
    await user.click(within(dialog).getByRole("button", { name: "해지 예약" }));
    expect(
      await screen.findByText(/해지가 예약됐습니다. 종료 예정 2027-02-09 00:00/),
    ).not.toBeNull();
    expect(await screen.findByRole("button", { name: "해지 예약 취소" })).not.toBeNull();
  });

  it("해지 예약을 취소하면 구독이 계속된다", async () => {
    billingState.subscription = buildSubscription({
      status: "ACTIVE",
      cancellationEffectiveAt: "2027-02-09T00:00:00+09:00",
      currentPeriodEnd: "2027-02-09T00:00:00+09:00",
    });
    const user = userEvent.setup();
    show();
    expect(
      await screen.findByText(/해지가 예약되어 2027-02-09 00:00에 구독이 끝납니다/),
    ).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "해지 예약 취소" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "예약 취소" }));
    expect(await screen.findByText("해지 예약이 취소됐습니다.")).not.toBeNull();
    expect(await screen.findByRole("button", { name: "해지 예약" })).not.toBeNull();
  });

  it("이미 발효된 해지의 취소는 거절 안내를 보여준다", async () => {
    billingState.subscription = buildSubscription({
      status: "ACTIVE",
      cancellationEffectiveAt: "2027-02-09T00:00:00+09:00",
    });
    server.use(
      http.post("/api/subscriptions/cancel/withdraw", () =>
        errorResponse(409, "CANCELLATION_ALREADY_EFFECTIVE", "이미 발효"),
      ),
    );
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByRole("button", { name: "해지 예약 취소" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "예약 취소" }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "이미 종료돼 해지 예약을 취소할 수 없습니다",
    );
  });

  it("이미 예약됐거나 종료된 구독의 해지는 거절 안내를 보여준다", async () => {
    billingState.subscription = buildSubscription({ status: "ACTIVE" });
    server.use(
      http.post("/api/subscriptions/cancel", () =>
        errorResponse(409, "INVALID_TRANSITION", "불가"),
      ),
    );
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByRole("button", { name: "해지 예약" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "해지 예약" }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain("진행할 수 없습니다");
  });
});

describe("무료 종료 안내 시점", () => {
  const trialEnd = "2027-01-08T00:00:00+09:00";
  const base = new Date(trialEnd).getTime();
  const day = 86_400_000;

  it.each([
    [31, null],
    [30, 30],
    [14, 14],
    [7, 7],
    [1, 1],
    [-1, null],
  ])("종료 %i일 전이면 %s을 돌려준다", (daysBefore, expected) => {
    expect(trialReminder(trialEnd, base - daysBefore * day)).toBe(expected);
  });

  it("종료 시각이 없으면 안내하지 않는다", () => {
    expect(trialReminder(null)).toBeNull();
  });
});
