// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import {
  buildMockContract,
  resetMockContractState,
  setMockContractState,
} from "@/mocks/handlers/contract";
import {
  buildMockFee,
  buildMockSchedule,
  getMockContractExtraState,
  resetMockContractExtraState,
} from "@/mocks/handlers/contract-extra";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import { FeeScreen } from "./fee-screen";
import { PaymentScreen } from "./payment-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/contracts/9101/fees",
  useSearchParams: () => new URLSearchParams(),
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockContractState();
  resetMockContractExtraState();
});

afterAll(() => stopServer());

type User = ReturnType<typeof userEvent.setup>;

function seedFees(...fees: ReturnType<typeof buildMockFee>[]) {
  getMockContractExtraState().fees = { 9101: fees };
}

function seedSchedules(...items: ReturnType<typeof buildMockSchedule>[]) {
  getMockContractExtraState().schedules = { 9101: items };
}

function setDate(root: HTMLElement, label: string, value: string) {
  fireEvent.change(within(root).getByLabelText(label), { target: { value } });
}

async function fillAmounts(user: User, dialog: HTMLElement, total = "1000000") {
  await user.type(within(dialog).getByLabelText("약정보수(원)"), total);
  await user.type(within(dialog).getByLabelText("공급가액(원)"), "909091");
  await user.type(within(dialog).getByLabelText("세액(원)"), "90909");
  await user.type(within(dialog).getByLabelText("합계(원)"), total);
}

describe("중개보수·수납", () => {
  it("지급의무자별 미수금과 초과수납을 따로 보여주고 상계하지 않는다", async () => {
    seedFees(
      buildMockFee({
        feeId: 1,
        transactions: [
          {
            transactionId: 1,
            transactionType: "RECEIPT",
            amount: 400_000,
            actualDate: "2026-11-11",
            recordedAt: "2026-11-11T09:00:00+09:00",
            isSuperseded: false,
          },
        ],
      }),
      buildMockFee({
        feeId: 2,
        payerType: "BUYER_TENANT",
        payerPartyId: 910102,
        payerName: "최임차",
        transactions: [
          {
            transactionId: 2,
            transactionType: "RECEIPT",
            amount: 1_200_000,
            actualDate: "2026-11-11",
            recordedAt: "2026-11-11T09:00:00+09:00",
            isSuperseded: false,
          },
        ],
      }),
    );
    renderOffice(<FeeScreen contractId={9101} />, { role: "OWNER" });
    const section = await screen.findByRole("heading", { name: "지급의무자별 미수금·초과수납" });
    const list = section.closest("section") as HTMLElement;
    const items = within(list).getAllByRole("listitem");
    expect(items[0]?.textContent).toContain("미수금 600,000원 · 초과수납 0원");
    expect(items[1]?.textContent).toContain("미수금 0원 · 초과수납 200,000원");
  });

  it("조정 이력에서 대체된 사건과 정정 사유를 구분해 표시한다", async () => {
    seedFees(
      buildMockFee({
        feeId: 1,
        revisions: [
          {
            revisionId: 11,
            revisionType: "INITIAL",
            effectiveDate: "2026-11-10",
            totalAmount: 1_000_000,
            reason: null,
            supersedesRevisionId: null,
            isSuperseded: true,
          },
          {
            revisionId: 12,
            revisionType: "CORRECTED",
            effectiveDate: "2026-11-10",
            totalAmount: 900_000,
            reason: "오입력",
            supersedesRevisionId: 11,
            isSuperseded: false,
          },
        ],
      }),
    );
    renderOffice(<FeeScreen contractId={9101} />, { role: "OWNER" });
    const old = await screen.findByText(/최초 청구 2026-11-10 1,000,000원/);
    expect(old.className).toContain("line-through");
    expect(screen.getByText(/오입력 정정 2026-11-10 900,000원 · 오입력/)).not.toBeNull();
  });

  it("청구가 없으면 빈 안내를 보여주고 청구를 등록한다", async () => {
    const user = userEvent.setup();
    renderOffice(<FeeScreen contractId={9101} />, { role: "OWNER" });
    expect(await screen.findByText("등록된 중개보수 청구가 없습니다.")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "+ 청구 등록" }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/지급의무자/), "SELLER_LANDLORD:910101");
    await fillAmounts(user, dialog);
    setDate(dialog, "청구발생일", "2026-11-10");
    await user.click(within(dialog).getByRole("button", { name: "청구 등록" }));
    expect(await screen.findByText(/박임대 \(매도·임대인\) 1,000,000원/)).not.toBeNull();
  });

  it("합계가 공급가액과 세액의 합과 다르면 오류로 표시한다", async () => {
    const user = userEvent.setup();
    renderOffice(<FeeScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "+ 청구 등록" }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/지급의무자/), "SELLER_LANDLORD:910101");
    await fillAmounts(user, dialog, "1000000");
    await user.clear(within(dialog).getByLabelText("합계(원)"));
    await user.type(within(dialog).getByLabelText("합계(원)"), "999999");
    setDate(dialog, "청구발생일", "2026-11-10");
    await user.click(within(dialog).getByRole("button", { name: "청구 등록" }));
    expect(
      await within(dialog).findByText("합계가 공급가액과 세액의 합과 다릅니다."),
    ).not.toBeNull();
  });

  it("필수값이 비어 있으면 항목별 오류를 보인다", async () => {
    const user = userEvent.setup();
    renderOffice(<FeeScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "+ 청구 등록" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "청구 등록" }));
    expect(await within(dialog).findByText("지급의무자를 선택해 주세요.")).not.toBeNull();
    expect(within(dialog).getByText("청구발생일을 입력해 주세요.")).not.toBeNull();
    expect(within(dialog).getByText("약정보수는 0보다 큰 숫자로 입력해 주세요.")).not.toBeNull();
  });

  it("초안 계약에서는 청구 등록 버튼이 막힌다", async () => {
    setMockContractState({
      contracts: [
        buildMockContract({
          contractId: 9101,
          contractStatus: "DRAFT",
          leasePeriodStatus: null,
          settlementStatus: "UNDECIDED",
          currentRevisionId: null,
        }),
      ],
    });
    renderOffice(<FeeScreen contractId={9101} />, { role: "OWNER" });
    expect(await screen.findByText(/초안 계약에는 청구를 등록할 수 없습니다/)).not.toBeNull();
    expect(
      (screen.getByRole("button", { name: "+ 청구 등록" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("수납을 기록하면 순수납액이 늘고 환급이 순수납액을 넘으면 막는다", async () => {
    seedFees(buildMockFee({ feeId: 1 }));
    const user = userEvent.setup();
    renderOffice(<FeeScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "박임대 수납·환급 기록" }));
    let dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/금액\(원\)/), "300000");
    setDate(dialog, "실제 수납·환급일", "2026-11-12");
    await user.click(within(dialog).getByRole("button", { name: "기록" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect((await screen.findAllByText(/순수납 300,000원/)).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "박임대 수납·환급 기록" }));
    dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/구분/), "REFUND");
    await user.type(within(dialog).getByLabelText(/금액\(원\)/), "500000");
    setDate(dialog, "실제 수납·환급일", "2026-11-13");
    await user.click(within(dialog).getByRole("button", { name: "기록" }));
    expect(await within(dialog).findByText("환급액이 순수납액을 넘을 수 없습니다.")).not.toBeNull();
  });

  it("오입력 정정은 대체할 거래와 사유가 필요하고 기존 거래는 취소선으로 남는다", async () => {
    seedFees(
      buildMockFee({
        feeId: 1,
        transactions: [
          {
            transactionId: 5,
            transactionType: "RECEIPT",
            amount: 100_000,
            actualDate: "2026-11-11",
            recordedAt: "2026-11-11T09:00:00+09:00",
            isSuperseded: false,
          },
        ],
      }),
    );
    const user = userEvent.setup();
    renderOffice(<FeeScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "박임대 수납·환급 기록" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/금액\(원\)/), "150000");
    setDate(dialog, "실제 수납·환급일", "2026-11-11");
    await user.selectOptions(within(dialog).getByLabelText(/대체할 기존 거래/), "5");
    await user.click(within(dialog).getByRole("button", { name: "기록" }));
    expect(await within(dialog).findByText("사유를 입력해 주세요.")).not.toBeNull();
    await user.type(within(dialog).getByLabelText("정정 사유"), "금액 오입력");
    await user.click(within(dialog).getByRole("button", { name: "기록" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const old = await screen.findByText(/수납 2026-11-11 100,000원$/);
    expect(old.className).toContain("line-through");
    expect(screen.getByText(/정정: 금액 오입력/)).not.toBeNull();
  });

  it("보수 정정은 대체할 기존 사건을 골라야 한다", async () => {
    seedFees(buildMockFee({ feeId: 1 }));
    const user = userEvent.setup();
    renderOffice(<FeeScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "박임대 보수 조정" }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/조정 종류/), "CORRECTED");
    setDate(dialog, "효력일", "2026-11-10");
    await fillAmounts(user, dialog, "900000");
    await user.clear(within(dialog).getByLabelText("공급가액(원)"));
    await user.type(within(dialog).getByLabelText("공급가액(원)"), "818182");
    await user.clear(within(dialog).getByLabelText("세액(원)"));
    await user.type(within(dialog).getByLabelText("세액(원)"), "81818");
    await user.type(within(dialog).getByLabelText(/^사유/), "정정");
    await user.click(within(dialog).getByRole("button", { name: "조정 기록" }));
    expect(
      await within(dialog).findByText("대체할 기존 조정 사건을 선택해 주세요."),
    ).not.toBeNull();
    await user.selectOptions(within(dialog).getByLabelText(/대체할 기존 조정 사건/), "11");
    await user.click(within(dialog).getByRole("button", { name: "조정 기록" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findByText(/오입력 정정 2026-11-10 900,000원/)).not.toBeNull();
  });

  it("버전 충돌, 청구 당사자 오류, 429를 안내한다", async () => {
    seedFees(buildMockFee({ feeId: 1 }));
    server.use(http.post("/api/contract-fees/1/transactions", () => mockErrors.versionConflict(4)));
    const user = userEvent.setup();
    renderOffice(<FeeScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "박임대 수납·환급 기록" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/금액\(원\)/), "1000");
    setDate(dialog, "실제 수납·환급일", "2026-11-12");
    await user.click(within(dialog).getByRole("button", { name: "기록" }));
    expect(await within(dialog).findByText(/다른 사용자가 먼저 수정했습니다/)).not.toBeNull();
    server.use(http.post("/api/contract-fees/1/transactions", () => mockErrors.rateLimited(10)));
    await user.click(within(dialog).getByRole("button", { name: "기록" }));
    expect(await within(dialog).findByText(/요청이 너무 많습니다/)).not.toBeNull();
  });

  it("서버가 청구 당사자를 거절하면 안내한다", async () => {
    server.use(
      http.post("/api/contracts/9101/fees", () =>
        errorResponse(400, "INVALID_CONTRACT_PARTY", "당사자 오류"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<FeeScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "+ 청구 등록" }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/지급의무자/), "SELLER_LANDLORD:910101");
    await fillAmounts(user, dialog);
    setDate(dialog, "청구발생일", "2026-11-10");
    await user.click(within(dialog).getByRole("button", { name: "청구 등록" }));
    expect(await within(dialog).findByText(/중복으로 보낸 당사자가 있습니다/)).not.toBeNull();
  });

  it("중개보조원은 접근 권한 화면을 보고 서버 403과 404도 처리한다", async () => {
    const first = renderOffice(<FeeScreen contractId={9101} />, { role: "DEPUTY" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
    first.unmount();
    server.use(http.get("/api/contracts/9101/fees", () => mockErrors.forbidden()));
    const second = renderOffice(<FeeScreen contractId={9101} />, { role: "AGENT" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
    second.unmount();
    renderOffice(<FeeScreen contractId={1} />, { role: "OWNER" });
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });

  it("조회 오류는 다시 시도 버튼을 보여준다", async () => {
    server.use(http.get("/api/contracts/9101/fees", () => mockErrors.server()));
    renderOffice(<FeeScreen contractId={9101} />, { role: "OWNER" });
    expect(await screen.findByText("문제가 발생했습니다")).not.toBeNull();
    expect(screen.getByRole("button", { name: "다시 시도" })).not.toBeNull();
  });
});

describe("계약 대금·분할 지급", () => {
  it("예정이 없으면 빈 안내를 보여준다", async () => {
    renderOffice(<PaymentScreen contractId={9101} />, { role: "OWNER" });
    expect(await screen.findByText("등록된 대금 예정이 없습니다.")).not.toBeNull();
    expect(screen.getByText(/중개보수와 별도로 관리/)).not.toBeNull();
  });

  it("예정 합계가 보증금과 다르면 경고와 사유를 표시한다", async () => {
    seedSchedules(buildMockSchedule({ scheduleId: 1, scheduledAmount: 30_000_000 }));
    getMockContractExtraState().amountMismatchReason = { 9101: "잔금은 추후 협의" };
    renderOffice(<PaymentScreen contractId={9101} />, { role: "OWNER" });
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("예정 합계가 매매가·보증금과 다릅니다");
    expect(alert.textContent).toContain("잔금은 추후 협의");
    expect(screen.getByRole("region", { name: "예정 합계 대조" }).textContent).toContain(
      "예정 합계 30,000,000원",
    );
  });

  it("같은 종류와 순번은 중복 등록할 수 없다", async () => {
    seedSchedules(buildMockSchedule({ scheduleId: 1 }));
    const user = userEvent.setup();
    renderOffice(<PaymentScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "+ 대금 예정 등록" }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/대금 종류/), "DEPOSIT");
    setDate(dialog, "예정일", "2026-11-25");
    await user.type(within(dialog).getByLabelText(/예정액/), "1000");
    await user.click(within(dialog).getByRole("button", { name: "등록" }));
    expect(
      await within(dialog).findByText("같은 대금 종류와 순번이 이미 있습니다."),
    ).not.toBeNull();
  });

  it("예정액이 0 이하이거나 사유가 공백뿐이면 막는다", async () => {
    const user = userEvent.setup();
    renderOffice(<PaymentScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "+ 대금 예정 등록" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/예정액/), "0");
    await user.type(within(dialog).getByLabelText(/합계가 매매가/), "   ");
    await user.click(within(dialog).getByRole("button", { name: "등록" }));
    expect(
      await within(dialog).findByText("예정액은 0보다 큰 숫자로 입력해 주세요."),
    ).not.toBeNull();
    expect(within(dialog).getByText("공백만 있는 사유는 입력할 수 없습니다.")).not.toBeNull();
    expect(within(dialog).getByText("대금 종류를 선택해 주세요.")).not.toBeNull();
    expect(within(dialog).getByText("예정일을 입력해 주세요.")).not.toBeNull();
  });

  it("대금 예정을 등록하고 일부만 지급하면 일부 지급, 나머지를 지급하면 완료가 된다", async () => {
    const user = userEvent.setup();
    renderOffice(<PaymentScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "+ 대금 예정 등록" }));
    let dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/대금 종류/), "BALANCE");
    setDate(dialog, "예정일", "2026-12-01");
    await user.type(within(dialog).getByLabelText(/예정액/), "270000000");
    await user.click(within(dialog).getByRole("button", { name: "등록" }));
    expect(await screen.findByText("잔금 1회")).not.toBeNull();
    expect(screen.getByText("미지급")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "잔금 1회 실지급 기록" }));
    dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/실지급 금액/), "100000000");
    setDate(dialog, "실제 지급일", "2026-12-01");
    await user.click(within(dialog).getByRole("button", { name: "기록" }));
    expect(await screen.findByText("일부 지급")).not.toBeNull();
    expect(screen.getByText(/확인 이중개/)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "잔금 1회 실지급 기록" }));
    dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/실지급 금액/), "170000000");
    setDate(dialog, "실제 지급일", "2026-12-02");
    await user.click(within(dialog).getByRole("button", { name: "기록" }));
    expect(await screen.findByText("지급 완료")).not.toBeNull();
  });

  it("실지급 정정은 기존 지급을 취소선으로 남기고 사유가 필요하다", async () => {
    seedSchedules(
      buildMockSchedule({
        scheduleId: 1,
        actualPaidTotal: 1000,
        paymentStatus: "PARTIAL",
        transactions: [
          {
            transactionId: 9,
            actualAmount: 1000,
            actualDate: "2026-11-20",
            confirmedByMembershipId: 2,
            confirmedByMemberName: "이중개",
            confirmedAt: "2026-11-20T09:00:00+09:00",
            isSuperseded: false,
          },
        ],
      }),
    );
    const user = userEvent.setup();
    renderOffice(<PaymentScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "계약금 1회 실지급 기록" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/실지급 금액/), "2000");
    setDate(dialog, "실제 지급일", "2026-11-20");
    await user.selectOptions(within(dialog).getByLabelText(/대체할 기존 실지급/), "9");
    await user.click(within(dialog).getByRole("button", { name: "기록" }));
    expect(await within(dialog).findByText("사유를 입력해 주세요.")).not.toBeNull();
    await user.type(within(dialog).getByLabelText("정정 사유"), "금액 정정");
    await user.click(within(dialog).getByRole("button", { name: "기록" }));
    const old = await screen.findByText(/1,000원 · 확인 이중개.*정정으로 대체됨/);
    expect(old.className).toContain("line-through");
  });

  it("초안 계약에서는 등록 버튼이 막히고 서버 오류와 429, 403을 안내한다", async () => {
    setMockContractState({
      contracts: [
        buildMockContract({
          contractId: 9101,
          contractStatus: "DRAFT",
          leasePeriodStatus: null,
          settlementStatus: "UNDECIDED",
          currentRevisionId: null,
        }),
      ],
    });
    const first = renderOffice(<PaymentScreen contractId={9101} />, { role: "OWNER" });
    expect(await screen.findByText(/초안 계약에는 대금 예정을 등록할 수 없습니다/)).not.toBeNull();
    expect(
      (screen.getByRole("button", { name: "+ 대금 예정 등록" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    first.unmount();
    resetMockContractState();
    server.use(http.get("/api/contracts/9101/payment-schedules", () => mockErrors.rateLimited(10)));
    const second = renderOffice(<PaymentScreen contractId={9101} />, { role: "OWNER" });
    expect(await screen.findByText("요청이 너무 많습니다")).not.toBeNull();
    second.unmount();
    server.use(http.get("/api/contracts/9101/payment-schedules", () => mockErrors.forbidden()));
    renderOffice(<PaymentScreen contractId={9101} />, { role: "OWNER" });
    expect(await screen.findByText("접근 권한이 없습니다")).not.toBeNull();
  });

  it("서버가 중복 예정을 거절하면 안내한다", async () => {
    server.use(
      http.post("/api/contracts/9101/payment-schedules", () =>
        errorResponse(409, "CONTRACT_ACTION_NOT_ALLOWED", "중복"),
      ),
    );
    const user = userEvent.setup();
    renderOffice(<PaymentScreen contractId={9101} />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "+ 대금 예정 등록" }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/대금 종류/), "INTERIM");
    setDate(dialog, "예정일", "2026-11-25");
    await user.type(within(dialog).getByLabelText(/예정액/), "1000");
    await user.click(within(dialog).getByRole("button", { name: "등록" }));
    expect(
      await within(dialog).findByText(/지금 계약 상태에서는 할 수 없는 작업입니다/),
    ).not.toBeNull();
  });
});
