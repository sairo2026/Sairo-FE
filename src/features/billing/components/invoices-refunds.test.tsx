// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { billingState, buildInvoiceItem, resetBillingState } from "@/mocks/handlers/billing";
import { server, startMockServer } from "@/mocks/server";
import { estimateMonthly } from "../model/pricing";
import { renderOffice } from "@/shared/testing/office-render";
import { BillingPlansScreen } from "./billing-plans-screen";
import { InvoiceDetailScreen } from "./invoice-detail-screen";
import { InvoicesScreen } from "./invoices-screen";
import { RefundDetailScreen, RefundsScreen } from "./refunds-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/billing/invoices",
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

describe("결제 내역", () => {
  it("불러오는 동안 로딩을 보여주고 청구서 행을 보여준다", async () => {
    renderOffice(<InvoicesScreen />, { role: "OWNER" });
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    const link = await screen.findByRole("link", { name: "2026-09-26 ~ 2026-10-26" });
    const row = link.closest("tr") as HTMLElement;
    expect(within(row).getByText("3명")).not.toBeNull();
    expect(within(row).getByText("성공")).not.toBeNull();
    expect(within(row).getAllByText("59,900원").length).toBeGreaterThan(0);
  });

  it("결제 내역이 없으면 빈 안내를 보여준다", async () => {
    billingState.invoices = [];
    renderOffice(<InvoicesScreen />, { role: "OWNER" });
    expect(await screen.findByText("아직 결제 내역이 없습니다.")).not.toBeNull();
  });

  it("조회가 실패하면 목록 안에 오류와 다시 시도 버튼을 보여준다", async () => {
    server.use(http.get("/api/billing/invoices", () => mockErrors.server()));
    const user = userEvent.setup();
    renderOffice(<InvoicesScreen />, { role: "OWNER" });
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).not.toBeNull();
    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("link", { name: "2026-09-26 ~ 2026-10-26" })).not.toBeNull();
  });

  it.each([
    ["UNBILLED", "미청구"],
    ["PROCESSING", "처리 중"],
    ["VERIFYING", "확인 중"],
    ["FAILED", "실패"],
    ["PARTIALLY_REFUNDED", "일부 환불"],
    ["FULLY_REFUNDED", "전액 환불"],
    ["CANCELLED", "취소"],
  ])("%s 상태를 %s로 표시한다", async (status, label) => {
    billingState.invoices = [buildInvoiceItem({ status })];
    renderOffice(<InvoicesScreen />, { role: "OWNER" });
    expect(await screen.findByText(label)).not.toBeNull();
  });

  it("429이면 대기 안내를 보여준다", async () => {
    server.use(http.get("/api/billing/invoices", () => mockErrors.rateLimited(30)));
    renderOffice(<InvoicesScreen />, { role: "OWNER" });
    expect(await screen.findByText(/30초 뒤에 다시 시도해 주세요/)).not.toBeNull();
  });
});

describe("청구서 상세와 환불 신청", () => {
  it("공급가액과 세액, 환불 가능 금액, 결제 시도, 증빙 상태를 보여준다", async () => {
    renderOffice(<InvoiceDetailScreen invoiceId={501} />, { role: "OWNER" });
    expect(await screen.findByText("59,900원 (VAT 포함)")).not.toBeNull();
    expect(screen.getByText("54,455원")).not.toBeNull();
    expect(screen.getByText("5,445원")).not.toBeNull();
    expect(screen.getByText(/주문 order-501-1 · 성공/)).not.toBeNull();
    expect(
      screen.getByText(/세금계산서 발급 대상이 아니거나 아직 발급되지 않았습니다/),
    ).not.toBeNull();
    expect(screen.getByText(/공급자 사이로\(SAIRO\)/)).not.toBeNull();
    expect(
      screen.getByText(/청구 금액 59,900원\(부가세 5,445원 포함\)\. 공급가액 54,455원\./),
    ).not.toBeNull();
  });

  it("없는 청구서는 찾을 수 없음 화면을 보여준다", async () => {
    renderOffice(<InvoiceDetailScreen invoiceId={999} />, { role: "OWNER" });
    expect(await screen.findByRole("heading", { name: /찾을 수 없/ })).not.toBeNull();
  });

  it("실패한 결제는 실패 분류와 다음 재시도 시각을 보여준다", async () => {
    billingState.invoices = [buildInvoiceItem({ status: "FAILED", refundableAmount: 0 })];
    server.use(
      http.get("/api/billing/invoices/501", () =>
        HttpResponse.json({
          ...buildInvoiceItem({ status: "FAILED", refundableAmount: 0 }),
          nextRetryAt: "2026-10-27T10:00:00+09:00",
          attempts: [
            {
              pgOrderId: "order-501-1",
              pgTransactionId: null,
              result: "FAILED",
              failureCategory: "CARD_UNUSABLE",
              attemptedAt: "2026-09-26T09:00:00+09:00",
            },
          ],
          supplier: null,
          taxDocuments: [],
        }),
      ),
    );
    renderOffice(<InvoiceDetailScreen invoiceId={501} />, { role: "OWNER" });
    expect(await screen.findByText(/다음 자동 재시도/)).not.toBeNull();
    expect(screen.getByText(/카드 정지·만료/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "환불 신청" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
  });

  it("증빙 발급 실패와 발급 대상 아님을 백엔드 상태 값으로 표시한다", async () => {
    server.use(
      http.get("/api/billing/invoices/501", () =>
        HttpResponse.json({
          ...buildInvoiceItem({}),
          nextRetryAt: null,
          attempts: [],
          supplier: null,
          taxDocuments: [
            {
              documentKind: "TAX_INVOICE",
              status: "ISSUE_FAILED",
              issuedOn: null,
              maskedReceiverEmail: null,
              supplyAmount: null,
              vatAmount: null,
            },
            {
              documentKind: "CASH_RECEIPT",
              status: "NOT_REQUIRED",
              issuedOn: null,
              maskedReceiverEmail: null,
              supplyAmount: null,
              vatAmount: null,
            },
          ],
        }),
      ),
    );
    renderOffice(<InvoiceDetailScreen invoiceId={501} />, { role: "OWNER" });
    expect(await screen.findByText(/^발급 실패 · 수신/)).not.toBeNull();
    expect(screen.getByText(/^발급 대상 아님 · 수신/)).not.toBeNull();
  });

  it("사유를 고르지 않으면 검증 오류를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<InvoiceDetailScreen invoiceId={501} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "환불 신청" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("접수 후 3영업일 안에 검토 결과를 알려드립니다");
    expect(dialog.textContent).toContain("무료 이용 기간은 금액으로 환불되지 않습니다");
    await user.click(within(dialog).getByRole("button", { name: "환불 신청" }));
    expect(await within(dialog).findByText("환불 사유를 선택해 주세요.")).not.toBeNull();
    expect(billingState.refunds).toHaveLength(0);
  });

  it("청구서와 사유만 보내 접수하고 접수 안내를 보여준다", async () => {
    let sent: Record<string, unknown> = {};
    server.use(
      http.post("/api/refund-requests", async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ refundId: 901, status: "RECEIVED" }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderOffice(<InvoiceDetailScreen invoiceId={501} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "환불 신청" }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByRole("combobox"), "DUPLICATE_CHARGE");
    await user.click(within(dialog).getByRole("button", { name: "환불 신청" }));
    expect(
      await within(dialog).findByText(
        "환불 신청이 접수되었습니다. 접수일로부터 3영업일 안에 검토 결과를 알려 드립니다.",
      ),
    ).not.toBeNull();
    expect(sent).toEqual({ invoiceId: 501, reasonCode: "DUPLICATE_CHARGE" });
  });

  it("이미 처리 중인 같은 신청이 있으면 기존 신청 안내를 보여준다", async () => {
    server.use(
      http.post("/api/refund-requests", () =>
        HttpResponse.json({ refundId: 901, status: "REVIEWING" }),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<InvoiceDetailScreen invoiceId={501} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "환불 신청" }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByRole("combobox"), "DUPLICATE_CHARGE");
    await user.click(within(dialog).getByRole("button", { name: "환불 신청" }));
    expect(
      await within(dialog).findByText(
        "이미 접수된 환불 신청이 있어 기존 신청 상태를 보여드립니다.",
      ),
    ).not.toBeNull();
  });

  it("환불할 수 없는 청구서이면 안내를 보여준다", async () => {
    server.use(
      http.post("/api/refund-requests", () => errorResponse(409, "INVALID_TRANSITION", "불가")),
    );
    const user = userEvent.setup();
    renderOffice(<InvoiceDetailScreen invoiceId={501} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "환불 신청" }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByRole("combobox"), "CANCELLATION");
    await user.click(within(dialog).getByRole("button", { name: "환불 신청" }));
    expect((await within(dialog).findByRole("alert")).textContent).toContain("진행할 수 없습니다");
  });

  it("서버 오류와 요청 제한을 구분해 안내한다", async () => {
    server.use(http.post("/api/refund-requests", () => mockErrors.rateLimited(45)));
    const user = userEvent.setup();
    renderOffice(<InvoiceDetailScreen invoiceId={501} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "환불 신청" }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByRole("combobox"), "CANCELLATION");
    await user.click(within(dialog).getByRole("button", { name: "환불 신청" }));
    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "45초 뒤에 다시 시도해 주세요",
    );
  });
});

describe("환불 신청 내역", () => {
  const received = {
    refundId: 901,
    invoiceId: 501,
    status: "RECEIVED",
    reasonCode: "DUPLICATE_CHARGE",
    refundAmount: null,
    createdAt: "2026-11-10T09:00:00+09:00",
  };

  it("접수한 환불을 상태와 함께 보여준다", async () => {
    billingState.refunds = [received];
    renderOffice(<RefundsScreen />, { role: "OWNER" });
    const link = await screen.findByRole("link", { name: "환불 901" });
    const row = link.closest("tr") as HTMLElement;
    expect(within(row).getByText("중복 결제")).not.toBeNull();
    expect(within(row).getByText("접수")).not.toBeNull();
    expect(within(row).getByText("산정 전")).not.toBeNull();
  });

  it("환불 신청이 없으면 빈 안내를 보여준다", async () => {
    renderOffice(<RefundsScreen />, { role: "OWNER" });
    expect(await screen.findByText("접수한 환불 신청이 없습니다.")).not.toBeNull();
  });

  it("조회가 실패하면 오류와 다시 시도 버튼을 보여준다", async () => {
    server.use(http.get("/api/refund-requests", () => mockErrors.server()));
    renderOffice(<RefundsScreen />, { role: "OWNER" });
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "다시 시도" })).not.toBeNull();
  });

  it.each([
    ["REJECTED", /환불 요청이 승인되지 않았습니다. 사유: 환불 대상 기간이 아닙니다./],
    ["FAILED", /환불 처리에 실패했습니다. 사유: 결제사 취소 요청이 실패했습니다./],
    ["VERIFYING", /결제사에 확인하고 있습니다/],
    ["COMPLETED", /환불이 완료됐습니다/],
    ["RECEIVED", /3영업일 안에 검토 결과를 알려 드립니다/],
  ])("%s 상태의 처리 안내와 계산 근거를 보여준다", async (status, text) => {
    billingState.refunds = [
      { ...received, status, refundAmount: status === "COMPLETED" ? 29950 : null },
    ];
    renderOffice(<RefundDetailScreen refundId={901} />, { role: "OWNER" });
    expect(await screen.findByText(text)).not.toBeNull();
    expect(screen.getByText("원승인액")).not.toBeNull();
    expect(screen.getByText("쿠폰 제외분")).not.toBeNull();
    expect(screen.getByText("기보상액")).not.toBeNull();
  });

  it("없는 환불은 찾을 수 없음 화면을 보여준다", async () => {
    renderOffice(<RefundDetailScreen refundId={1} />, { role: "OWNER" });
    expect(await screen.findByRole("heading", { name: /찾을 수 없/ })).not.toBeNull();
  });
});

describe("요금제 안내", () => {
  it("구간 요금과 현재 인원 기준 예상 금액을 보여주고 인원을 바꿔 계산한다", async () => {
    const user = userEvent.setup();
    renderOffice(<BillingPlansScreen />, { role: "OWNER" });
    expect(await screen.findByText("표준 가격")).not.toBeNull();
    expect(screen.getByText(/현재 과금 인원 3명 기준 59,900원\(VAT 포함\)/)).not.toBeNull();
    expect(screen.getByText("별도 견적으로 안내합니다.")).not.toBeNull();
    const input = screen.getByRole("textbox", { name: "인원 수로 계산해 보기" });
    await user.clear(input);
    await user.type(input, "6");
    expect(screen.getByText("6명: 85,900원 / 월")).not.toBeNull();
    await user.clear(input);
    expect(screen.getByText("1명 이상의 인원을 입력해 주세요.")).not.toBeNull();
  });

  it("조회가 실패하면 오류를 보여준다", async () => {
    server.use(http.get("/api/billing/plans", () => mockErrors.server()));
    renderOffice(<BillingPlansScreen />, { role: "OWNER" });
    await waitFor(() => expect(screen.getByRole("button", { name: "다시 시도" })).not.toBeNull());
  });
});

describe("요금 계산", () => {
  const plans = [
    {
      planCode: "SOLO",
      tiers: [
        { minMembers: 1, maxMembers: 1, basePrice: 39900, includedMembers: 1, perSeatPrice: null },
      ],
    },
    {
      planCode: "TEAM",
      tiers: [
        { minMembers: 2, maxMembers: 4, basePrice: 39900, includedMembers: 1, perSeatPrice: 10000 },
        {
          minMembers: 5,
          maxMembers: null,
          basePrice: 69900,
          includedMembers: 4,
          perSeatPrice: 8000,
        },
      ],
    },
  ];

  it.each([
    [1, 39900],
    [2, 49900],
    [4, 69900],
    [5, 77900],
    [10, 117900],
  ])("%i명은 %i원이다", (members, expected) => {
    expect(estimateMonthly(plans, members)).toBe(expected);
  });

  it("잘못된 인원은 계산하지 않는다", () => {
    expect(estimateMonthly(plans, 0)).toBeNull();
    expect(estimateMonthly(plans, 1.5)).toBeNull();
  });
});
