// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { migrationState, resetMigrationState } from "@/mocks/handlers/migration";
import {
  buildMockSupportRequest,
  resetSupportState,
  supportState,
} from "@/mocks/handlers/migration-support";
import { server, startMockServer } from "@/mocks/server";
import { renderOffice } from "@/shared/testing/office-render";
import type { PaymentLauncher } from "../lib/payment-launcher";
import { SupportPaymentResultScreen } from "./support-payment-result-screen";
import { SupportRequestDetailScreen } from "./support-request-detail-screen";
import { SupportRequestsScreen } from "./support-requests-screen";

const push = vi.fn();
let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/import/support",
  useSearchParams: () => new URLSearchParams(search),
}));

let stopServer: () => void;

beforeAll(() => {
  stopServer = startMockServer();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMigrationState();
  resetSupportState();
  push.mockClear();
  search = "";
  window.sessionStorage.clear();
});

afterAll(() => stopServer());

function launcher(
  isConfigured = true,
): PaymentLauncher & { requestPayment: ReturnType<typeof vi.fn> } {
  return { isConfigured: () => isConfigured, requestPayment: vi.fn().mockResolvedValue(undefined) };
}

function seed(overrides: Parameters<typeof buildMockSupportRequest>[0]) {
  const item = buildMockSupportRequest(overrides);
  supportState.requests = [item];
  const batch = migrationState.batches.find((entry) => entry.detail.batchId === item.importBatchId);
  if (batch) {
    batch.supportRequestId = item.requestId;
    batch.supportRequestStatus = item.status;
  }
  return item;
}

describe("이전 지원 신청 목록과 신청", () => {
  it("신청 가능한 파일만 고르게 하고 안내 문구를 보여준다", async () => {
    renderOffice(<SupportRequestsScreen />, { role: "OWNER" });
    const select = (await screen.findByLabelText("신청할 이전 파일")) as HTMLSelectElement;
    expect(within(select).getByRole("option", { name: "매물목록.csv (매물)" })).not.toBeNull();
    expect(within(select).queryByRole("option", { name: /고객목록.xlsx/ })).toBeNull();
    expect(screen.getByText("유료 이전 지원 신청 안내")).not.toBeNull();
    expect(screen.getByText("접수한 이전 지원 신청이 없습니다.")).not.toBeNull();
  });

  it("주소의 파일 번호를 미리 선택한다", async () => {
    search = "batchId=302";
    renderOffice(<SupportRequestsScreen />, { role: "OWNER" });
    const select = (await screen.findByLabelText("신청할 이전 파일")) as HTMLSelectElement;
    expect(select.value).toBe("302");
  });

  it("신청할 파일이 없으면 먼저 올리라고 안내한다", async () => {
    migrationState.batches = [];
    renderOffice(<SupportRequestsScreen />, { role: "OWNER" });
    expect(
      await screen.findByText("신청할 수 있는 이전 파일이 없습니다. 먼저 이전 파일을 올려 주세요."),
    ).not.toBeNull();
  });

  it("입력이 비어 있으면 항목별 오류를 보여준다", async () => {
    const user = userEvent.setup();
    renderOffice(<SupportRequestsScreen />, { role: "OWNER" });
    await user.click(await screen.findByRole("button", { name: "신청하기" }));
    expect(screen.getByText("신청할 이전 파일을 선택해 주세요.")).not.toBeNull();
    expect(screen.getByText("원본 시스템 이름을 입력해 주세요.")).not.toBeNull();
    expect(screen.getByText("예상 레코드 수를 1 이상의 숫자로 입력해 주세요.")).not.toBeNull();
  });

  it("신청하면 신청 화면으로 이동하고 파일은 직접 작업 불가가 된다", async () => {
    const user = userEvent.setup();
    renderOffice(<SupportRequestsScreen />, { role: "OWNER" });
    await user.selectOptions(await screen.findByLabelText("신청할 이전 파일"), "302");
    await user.type(screen.getByLabelText(/원본 시스템 이름/), "양셀-2026");
    await user.type(screen.getByLabelText(/예상 레코드 수/), "60000");
    await user.click(screen.getByRole("button", { name: "신청하기" }));
    expect(screen.getByText("확인 문구를 모두 선택해 주세요.")).not.toBeNull();
    for (const checkbox of screen.getAllByRole("checkbox")) await user.click(checkbox);
    await user.click(screen.getByRole("button", { name: "신청하기" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/import/support/500"));
    expect(migrationState.batches[1]?.supportRequestStatus).toBe("REQUESTED");
  });

  it("이미 연결된 파일 신청이 거절되면 사유를 보여준다", async () => {
    server.use(
      http.post("/api/import-support-requests", () =>
        errorResponse(409, "IMPORT_BATCH_ALREADY_LINKED", "연결됨"),
      ),
    );
    const user = userEvent.setup();
    search = "batchId=302";
    renderOffice(<SupportRequestsScreen />, { role: "OWNER" });
    await user.type(await screen.findByLabelText(/원본 시스템 이름/), "양셀");
    await user.type(screen.getByLabelText(/예상 레코드 수/), "10");
    for (const checkbox of screen.getAllByRole("checkbox")) await user.click(checkbox);
    await user.click(screen.getByRole("button", { name: "신청하기" }));
    expect(await screen.findByText("이미 다른 이전 지원 신청에 연결된 파일입니다.")).not.toBeNull();
  });

  it("목록의 상태를 라벨로 보여주고 상태로 거른다", async () => {
    supportState.requests = [
      buildMockSupportRequest({
        requestId: 1,
        status: "QUOTED",
        quoteAmount: 220000,
        sourceSystem: "가나",
      }),
      buildMockSupportRequest({ requestId: 2, status: "CANCELLED", sourceSystem: "다라" }),
    ];
    const user = userEvent.setup();
    renderOffice(<SupportRequestsScreen />, { role: "OWNER" });
    expect(await screen.findByRole("link", { name: "가나" })).not.toBeNull();
    expect(screen.getByText("220,000원")).not.toBeNull();
    await user.selectOptions(screen.getByLabelText("상태"), "CANCELLED");
    await waitFor(() => expect(screen.queryByRole("link", { name: "가나" })).toBeNull());
    expect(screen.getByRole("link", { name: "다라" })).not.toBeNull();
  });

  it("목록 조회가 실패하면 다시 시도할 수 있다", async () => {
    server.use(http.get("/api/import-support-requests", () => mockErrors.server()));
    renderOffice(<SupportRequestsScreen />, { role: "OWNER" });
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "다시 시도" })).not.toBeNull();
  });

  it("대표가 아니면 권한 없음을 보여준다", () => {
    renderOffice(<SupportRequestsScreen />, { role: "AGENT" });
    expect(screen.getByText("접근 권한이 없습니다")).not.toBeNull();
  });
});

describe("이전 지원 진행 화면", () => {
  function open(pay = launcher(), options: Parameters<typeof renderOffice>[1] = { role: "OWNER" }) {
    renderOffice(<SupportRequestDetailScreen requestId={401} launcher={pay} />, options);
    return pay;
  }

  it("없는 신청은 찾을 수 없음을 보여준다", async () => {
    open();
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).not.toBeNull();
  });

  it("신청 상태에서는 견적 대기 안내와 취소를 보여준다", async () => {
    seed({ status: "REQUESTED" });
    open();
    expect(await screen.findByText(/운영팀이 견적을 준비하고 있습니다/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "신청 취소" })).not.toBeNull();
    const current = screen.getByRole("listitem", { current: "step" });
    expect(current.textContent).toContain("신청");
    expect(screen.getByText("직접 작업 불가")).not.toBeNull();
  });

  it("견적 상태에서는 금액과 표준 범위, 범위 비고를 보여주고 수락한다", async () => {
    seed({ status: "QUOTED", quoteAmount: 220000, scopeNote: "원본 2종으로 조정" });
    const user = userEvent.setup();
    open();
    expect(await screen.findByText("220,000원", { selector: "p" })).not.toBeNull();
    expect(screen.getByText(/결제 후 5영업일 납품 목표/)).not.toBeNull();
    expect(screen.getByText("범위 비고: 원본 2종으로 조정")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "견적 수락하고 결제" }));
    expect(await screen.findByText(/견적을 수락했습니다. 결제를 마치면/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "결제하기" })).not.toBeNull();
  });

  it("결제하기를 누르면 보관한 주문 정보로 결제창을 연다", async () => {
    seed({ status: "ACCEPTED", quoteAmount: 220000 });
    window.sessionStorage.setItem(
      "import-support-payment-401",
      JSON.stringify({ orderId: "IMPORT-401-1", amount: 220000 }),
    );
    const user = userEvent.setup();
    const pay = open();
    await user.click(await screen.findByRole("button", { name: "결제하기" }));
    await waitFor(() => expect(pay.requestPayment).toHaveBeenCalledTimes(1));
    expect(pay.requestPayment.mock.calls[0]?.[0]).toMatchObject({
      orderId: "IMPORT-401-1",
      amount: 220000,
    });
  });

  it("주문 정보가 없으면 견적 수락으로 다시 받아 결제창을 연다", async () => {
    seed({ status: "ACCEPTED", quoteAmount: 220000 });
    const user = userEvent.setup();
    const pay = open();
    await user.click(await screen.findByRole("button", { name: "결제하기" }));
    await waitFor(() => expect(pay.requestPayment).toHaveBeenCalledTimes(1));
    expect(pay.requestPayment.mock.calls[0]?.[0]).toMatchObject({ orderId: "IMPORT-401-1" });
  });

  it("결제 기능이 준비되지 않았으면 준비 중 안내를 보여준다", async () => {
    seed({ status: "ACCEPTED", quoteAmount: 220000 });
    const user = userEvent.setup();
    open(launcher(false));
    await user.click(await screen.findByRole("button", { name: "결제하기" }));
    expect(await screen.findByText(/결제 기능을 준비하고 있습니다/)).not.toBeNull();
  });

  it("결제 후에는 취소할 수 없다는 안내를 보여준다", async () => {
    seed({ status: "PAID", quoteAmount: 220000 });
    open();
    expect(await screen.findByText(/결제가 확인되었습니다/)).not.toBeNull();
    expect(screen.queryByRole("button", { name: "신청 취소" })).toBeNull();
    expect(
      screen.getAllByText(/결제 후에는 대표가 신청을 취소할 수 없습니다/).length,
    ).toBeGreaterThan(0);
  });

  it("처리 중에는 담당자와 수정 요청 내용을 보여준다", async () => {
    seed({
      status: "PROCESSING",
      assignedOperatorName: "이전담당",
      changeRequestCount: 1,
      changeRequestReason: "전화번호 열 확인",
    });
    open();
    expect(
      await screen.findByText(/이전담당 담당이 자료를 정리하고 매핑하고 있습니다/),
    ).not.toBeNull();
    expect(screen.getByText(/요청 사유: 전화번호 열 확인/)).not.toBeNull();
  });

  const review = {
    status: "REVIEW" as const,
    submittedMapping: {
      versionNo: 2,
      sourceSystem: "양셀",
      targetType: "CUSTOMER",
      confirmedByType: "OPERATOR",
      createdAt: "2026-11-10T09:00:00+09:00",
      items: [{ sourceColumn: "성명", targetField: "customerName", confidence: 0.93 }],
    },
    previewSummary: {
      rowCount: 3000,
      warningCount: 12,
      duplicateCount: 4,
      relationMatchCount: 120,
    },
  };

  it("검수 단계에서 열 대응과 요약을 보여주고 승인한다", async () => {
    seed(review);
    const user = userEvent.setup();
    open();
    expect(await screen.findByText("93%")).not.toBeNull();
    expect(screen.getByText("3000건")).not.toBeNull();
    expect(screen.getByRole("link", { name: "행 단위 미리보기 보기" }).getAttribute("href")).toBe(
      "/import/302",
    );
    await user.click(screen.getByRole("button", { name: "승인" }));
    expect(
      screen.getByText(/매핑 버전 2을 승인합니다. 승인한 뒤에는 매핑을 바꿀 수 없고/),
    ).not.toBeNull();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText(/매핑 버전 2을 승인했습니다/)).not.toBeNull();
  });

  it("수정 요청은 사유가 있어야 하고 1회만 가능하다", async () => {
    seed(review);
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("button", { name: "수정 요청" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "수정 요청" }));
    expect(within(dialog).getByText("수정을 요청하는 내용을 입력해 주세요.")).not.toBeNull();
    await user.type(
      within(dialog).getByLabelText("수정을 요청하는 내용"),
      "전화번호 열을 다시 확인해 주세요",
    );
    await user.click(within(dialog).getByRole("button", { name: "수정 요청" }));
    expect(await screen.findByText(/요청하신 수정 내용을 반영하고 있습니다/)).not.toBeNull();
  });

  it("수정 요청을 이미 썼으면 버튼을 막는다", async () => {
    seed({ ...review, changeRequestCount: 1 });
    open();
    expect(
      await screen.findByText("표준 범위의 수정 요청 1회를 이미 사용했습니다."),
    ).not.toBeNull();
    expect(screen.getByRole("button", { name: "수정 요청" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
  });

  it("승인이 버전 충돌로 거절되면 새로 고침을 안내한다", async () => {
    seed(review);
    server.use(
      http.post("/api/import-support-requests/:requestId/approve", () =>
        mockErrors.versionConflict(9),
      ),
    );
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("button", { name: "승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText(/다른 곳에서 먼저 바뀌었습니다/)).not.toBeNull();
  });

  it("승인 뒤에는 변경 불가 안내와 실행 결과를 보여준다", async () => {
    seed({
      status: "APPROVED",
      approvedMappingVersionNo: 2,
      executionResult: { succeeded: 2980, failed: 20, unprocessed: 0 },
    });
    open();
    expect(
      await screen.findByText(/매핑 버전 2을 승인했습니다. 승인한 뒤에는 매핑을 바꿀 수 없습니다/),
    ).not.toBeNull();
    expect(screen.getByText("2980건")).not.toBeNull();
  });

  it("납품 완료를 안내한다", async () => {
    seed({ status: "DELIVERED" });
    open();
    expect(await screen.findByText("이전이 완료되어 납품되었습니다.")).not.toBeNull();
  });

  it("결제 전 취소는 사유를 적을 수 있고 직접 작업이 복구된다", async () => {
    seed({ status: "QUOTED", quoteAmount: 220000 });
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("button", { name: "신청 취소" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("취소 사유 (선택)"), "직접 하겠습니다");
    await user.click(within(dialog).getByRole("button", { name: "신청 취소" }));
    expect(await screen.findByText(/신청이 취소되었습니다. 이 파일은 다시 직접/)).not.toBeNull();
    expect(screen.getByText("직접 작업 가능")).not.toBeNull();
    expect(migrationState.batches[1]?.supportRequestStatus).toBe("CANCELLED");
  });

  it("결제 후 취소 시도가 거절되면 문구를 보여준다", async () => {
    seed({ status: "QUOTED", quoteAmount: 220000 });
    server.use(
      http.post("/api/import-support-requests/:requestId/cancel", () =>
        errorResponse(409, "INVALID_TRANSITION", "취소 불가"),
      ),
    );
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("button", { name: "신청 취소" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "신청 취소" }));
    expect(await screen.findByText(/현재 상태에서는 이 작업을 할 수 없습니다/)).not.toBeNull();
  });

  it("거절된 신청은 사유와 직접 작업 복구를 안내한다", async () => {
    seed({ status: "REJECTED", rejectReason: "범위 초과", directWorkAllowed: true });
    open();
    expect(
      await screen.findByText(/사유: 범위 초과 이 파일은 다시 직접 매핑하고 실행할 수 있습니다/),
    ).not.toBeNull();
  });

  it("읽기 전용이면 수락과 취소를 막는다", async () => {
    seed({ status: "QUOTED", quoteAmount: 220000 });
    open(launcher(), { role: "OWNER", isReadOnly: true });
    expect(
      (await screen.findByRole("button", { name: "견적 수락하고 결제" })).getAttribute(
        "aria-disabled",
      ),
    ).toBe("true");
    expect(screen.getByRole("button", { name: "신청 취소" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
  });

  it("대표가 아니면 권한 없음을 보여준다", () => {
    open(launcher(), { role: "AGENT" });
    expect(screen.getByText("접근 권한이 없습니다")).not.toBeNull();
  });
});

describe("결제 확인", () => {
  function result(params: {
    paymentKey?: string | null;
    orderId?: string | null;
    amount?: string | null;
    failCode?: string | null;
  }) {
    renderOffice(
      <SupportPaymentResultScreen
        requestId={401}
        paymentKey={params.paymentKey ?? null}
        orderId={params.orderId ?? null}
        amount={params.amount ?? null}
        failCode={params.failCode ?? null}
      />,
      { role: "OWNER" },
    );
  }

  it("결제 승인 정보를 서버에 확정하고 완료를 안내한다", async () => {
    seed({ status: "ACCEPTED", quoteAmount: 220000 });
    result({ paymentKey: "pk", orderId: "IMPORT-401-1", amount: "220000" });
    expect(
      await screen.findByText(/결제가 확인되었습니다. 이전담당이 처리를 시작합니다/),
    ).not.toBeNull();
    expect(supportState.requests[0]?.status).toBe("PAID");
  });

  it("승인 실패는 결제된 금액이 없다는 안내를 보여준다", async () => {
    seed({ status: "ACCEPTED", quoteAmount: 220000 });
    result({ paymentKey: "FAIL", orderId: "IMPORT-401-1", amount: "220000" });
    expect(
      await screen.findByText(/결제가 승인되지 않았습니다. 결제된 금액은 없습니다/),
    ).not.toBeNull();
  });

  it("확인 중이면 같은 결제를 다시 하지 말라고 안내한다", async () => {
    seed({ status: "ACCEPTED", quoteAmount: 220000 });
    result({ paymentKey: "VERIFYING", orderId: "IMPORT-401-1", amount: "220000" });
    expect(await screen.findByText(/직전 결제 결과를 확인하고 있습니다/)).not.toBeNull();
  });

  it("결제창에서 취소하고 돌아오면 서버를 호출하지 않는다", async () => {
    seed({ status: "ACCEPTED", quoteAmount: 220000 });
    result({ failCode: "PAYMENT_CANCELED" });
    expect(await screen.findByText(/결제가 취소되었거나 완료되지 않았습니다/)).not.toBeNull();
    expect(supportState.requests[0]?.status).toBe("ACCEPTED");
  });

  it("필요한 정보가 없으면 안내한다", () => {
    result({});
    expect(screen.getByText(/결제 확인에 필요한 정보가 없습니다/)).not.toBeNull();
  });
});
