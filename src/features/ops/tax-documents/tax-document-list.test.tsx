// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockOpsBilling } from "@/mocks/handlers/ops-billing";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { TaxDocumentListScreen } from "./tax-document-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/billing/tax-documents",
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
  resetMockOpsBilling();
});
afterAll(() => stopServer());

function renderScreen(roles: OpsRole[] = ["BILLING"]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<TaxDocumentListScreen />, roles);
}

async function openRecord(user: ReturnType<typeof userEvent.setup>, documentId: number) {
  await user.click(await screen.findByRole("button", { name: `기록 ${documentId} 열기` }));
  const dialog = screen.getByRole("dialog");
  await within(dialog).findByText(/사무소 \d+ · 총액/);
  return dialog;
}

function pickDate(dialog: HTMLElement, value: string) {
  fireEvent.change(within(dialog).getByLabelText("발급일"), { target: { value } });
}

describe("증빙 발급 목록", () => {
  it("청구서별 증빙 상태와 종류와 발급 기한 힌트를 보인다", async () => {
    renderScreen();
    const table = await screen.findByRole("table", { name: "청구서별 증빙 발급 상태" });
    await within(table).findAllByText("발급 대기");
    expect(within(table).getAllByText("발급됨").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("발급 실패").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("발급 대상 아님").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("2027-08-10").length).toBeGreaterThan(0);
    expect(within(table).getByText("현금영수증")).toBeTruthy();
    expect(within(table).getByText("20270805-0001")).toBeTruthy();
  });

  it("수신 정보 등록 여부를 보인다", async () => {
    renderScreen();
    const table = await screen.findByRole("table", { name: "청구서별 증빙 발급 상태" });
    await within(table).findAllByText("등록됨");
    expect(within(table).getByText("등록 안 됨")).toBeTruthy();
  });

  it("변호사 검토 전 초안 안내와 발급 기한 힌트 가정을 보인다", async () => {
    renderScreen();
    expect(await screen.findByText(/변호사와 세무사 검토 전 초안/)).toBeTruthy();
    expect(screen.getByText(/세무사 확인 전 가정/)).toBeTruthy();
  });

  it("수정 발급과 취소 처리는 발급됨 기록에만 있다", async () => {
    renderScreen();
    await screen.findByRole("button", { name: "기록 62 수정 발급" });
    expect(screen.getByRole("button", { name: "기록 62 취소 처리" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "기록 61 수정 발급" })).toBeNull();
    expect(screen.queryByRole("button", { name: "기록 63 취소 처리" })).toBeNull();
  });

  it("상태 필터로 발급 실패만 본다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole("button", { name: "기록 61 열기" });
    await user.selectOptions(screen.getByLabelText("발급 상태"), "ISSUE_FAILED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "기록 61 열기" })).toBeNull());
    expect(screen.getByRole("button", { name: "기록 63 열기" })).toBeTruthy();
  });

  it("사무소 ID와 발급 기한 범위로 걸러낸다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole("button", { name: "기록 61 열기" });
    await user.type(screen.getByLabelText("사무소 ID"), "9");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "기록 61 열기" })).toBeNull());
    expect(screen.getByRole("button", { name: "기록 63 열기" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "초기화" }));
    await screen.findByRole("button", { name: "기록 61 열기" });
    fireEvent.change(screen.getByLabelText("발급 기한 시작"), { target: { value: "2027-09-01" } });
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("조건에 맞는 증빙 발급 기록이 없습니다.")).toBeTruthy();
  });

  it("청구서 번호는 청구서 상세로 연결된다", async () => {
    renderScreen();
    const table = await screen.findByRole("table", { name: "청구서별 증빙 발급 상태" });
    await within(table).findAllByRole("link");
    expect(
      within(table)
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/ops/billing/invoices/3"),
    ).toBe(true);
  });

  it("결제담당이 아니면 접근 불가 안내를 보인다", () => {
    renderScreen(["OPS"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
  });

  it("서버 오류는 안내하고 다시 시도하면 불러온다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(
      http.get("/api/ops/billing/tax-documents", () => (fail ? mockErrors.server() : undefined)),
    );
    renderScreen();
    expect(await screen.findByText(/일시적인 오류/)).toBeTruthy();
    fail = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("button", { name: "기록 61 열기" })).toBeTruthy();
  });

  it("403과 429를 안내한다", async () => {
    server.use(http.get("/api/ops/billing/tax-documents", () => mockErrors.forbidden()));
    renderScreen();
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
    cleanup();
    server.use(http.get("/api/ops/billing/tax-documents", () => mockErrors.rateLimited(5)));
    renderScreen();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});

describe("발급 결과 기록", () => {
  it("청구서 요약과 수신 정보와 기록 이력을 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const dialog = await openRecord(user, 61);
    expect(within(dialog).getByText(/수신 정보: 등록됨/)).toBeTruthy();
    expect(within(dialog).getByText(/#61 세금계산서 발급 대기/)).toBeTruthy();
    expect(within(dialog).getByText(/변호사와 세무사 검토 전 초안/)).toBeTruthy();
  });

  it("발급됨은 승인번호와 발급일과 금액이 필요하다", async () => {
    const user = userEvent.setup();
    let called = false;
    server.use(
      http.post("/api/ops/billing/invoices/1/tax-documents", () => {
        called = true;
        return mockErrors.server();
      }),
    );
    renderScreen();
    const dialog = await openRecord(user, 61);
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(within(dialog).getByText("승인번호를 40자 이내로 입력해 주세요.")).toBeTruthy();
    expect(within(dialog).getByText("발급일을 입력해 주세요.")).toBeTruthy();
    expect(within(dialog).getByText("공급가액을 정수로 입력해 주세요.")).toBeTruthy();
    expect(within(dialog).getByText("세액을 정수로 입력해 주세요.")).toBeTruthy();
    expect(called).toBe(false);
  });

  it("공급가액과 세액의 합이 청구서 총액과 다르면 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const dialog = await openRecord(user, 61);
    await user.type(within(dialog).getByLabelText("승인번호"), "A-1");
    pickDate(dialog, "2027-08-05");
    await user.type(within(dialog).getByLabelText("공급가액"), "30000");
    await user.type(within(dialog).getByLabelText("세액"), "2000");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(within(dialog).getByText(/청구서 총액 33,000원과 같아야 합니다/)).toBeTruthy();
  });

  it("제안값을 채워 발급됨으로 기록하면 목록이 바뀐다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const dialog = await openRecord(user, 61);
    await user.click(within(dialog).getByRole("button", { name: "제안값 채우기" }));
    expect((within(dialog).getByLabelText("공급가액") as HTMLInputElement).value).toBe("30000");
    expect((within(dialog).getByLabelText("세액") as HTMLInputElement).value).toBe("3000");
    await user.type(within(dialog).getByLabelText("승인번호"), "20270805-0009");
    pickDate(dialog, "2027-08-05");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await screen.findByText("발급 기록을 저장했습니다.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await screen.findByText("20270805-0009")).toBeTruthy();
  });

  it("발급 실패는 사유가 있어야 기록된다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const dialog = await openRecord(user, 61);
    await user.selectOptions(within(dialog).getByLabelText("발급 상태"), "ISSUE_FAILED");
    expect(within(dialog).queryByLabelText("승인번호")).toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(within(dialog).getByText("발급 실패 사유를 입력해 주세요.")).toBeTruthy();
    await user.type(within(dialog).getByLabelText("발급 실패 사유"), "수신 정보 오류");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await screen.findByText("발급 기록을 저장했습니다.")).toBeTruthy();
  });

  it("발급 대상 아님은 금액 없이 기록된다", async () => {
    const user = userEvent.setup();
    let sent: unknown = null;
    server.use(
      http.post("/api/ops/billing/invoices/1/tax-documents", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(
          {
            documentId: 80,
            invoiceId: 1,
            documentKind: "TAX_INVOICE",
            isElectronic: true,
            status: "NOT_REQUIRED",
            approvalNumber: null,
            issuedOn: null,
            supplyAmount: null,
            vatAmount: null,
            originalDocumentId: null,
            operatorNote: null,
            recordedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1,
          },
          { status: 201 },
        );
      }),
    );
    renderScreen();
    const dialog = await openRecord(user, 61);
    await user.selectOptions(within(dialog).getByLabelText("발급 상태"), "NOT_REQUIRED");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await screen.findByText("발급 기록을 저장했습니다.")).toBeTruthy();
    expect(sent).toMatchObject({
      status: "NOT_REQUIRED",
      approvalNumber: null,
      supplyAmount: null,
    });
  });

  it("현금영수증과 면세 계산서는 종류를 골라 기록만 한다", async () => {
    const user = userEvent.setup();
    let sent: unknown = null;
    server.use(
      http.post("/api/ops/billing/invoices/1/tax-documents", async ({ request }) => {
        sent = await request.json();
        return mockErrors.server();
      }),
    );
    renderScreen();
    const dialog = await openRecord(user, 61);
    const kinds = within(dialog)
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(kinds).toEqual(expect.arrayContaining(["세금계산서", "현금영수증", "면세 계산서"]));
    await user.selectOptions(within(dialog).getByLabelText("증빙 종류"), "EXEMPT_INVOICE");
    await user.selectOptions(within(dialog).getByLabelText("발급 상태"), "NOT_REQUIRED");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    await waitFor(() => expect(sent).toMatchObject({ documentKind: "EXEMPT_INVOICE" }));
  });

  it("같은 종류의 발급됨 기록이 있으면 409로 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const dialog = await openRecord(user, 62);
    await user.click(within(dialog).getByRole("button", { name: "제안값 채우기" }));
    await user.type(within(dialog).getByLabelText("승인번호"), "A-2");
    pickDate(dialog, "2027-08-06");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText("이미 발급 기록이 있는 청구서입니다.")).toBeTruthy();
  });

  it("결제 전 청구서는 기록할 수 없다는 409를 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole("button", { name: "기록 61 열기" });
    await user.type(screen.getByLabelText("청구서 번호로 기록"), "4");
    await user.click(screen.getByRole("button", { name: "기록 열기" }));
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByText(/결제 완료나 환불 상태의 청구서만/);
    await user.click(within(dialog).getByRole("button", { name: "제안값 채우기" }));
    await user.type(within(dialog).getByLabelText("승인번호"), "A-3");
    pickDate(dialog, "2027-08-06");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText("증빙을 발급할 수 없는 청구서입니다.")).toBeTruthy();
  });

  it("청구서 번호가 숫자가 아니면 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole("button", { name: "기록 61 열기" });
    await user.click(screen.getByRole("button", { name: "기록 열기" }));
    expect(screen.getByText("청구서 번호를 숫자로 입력해 주세요.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("없는 청구서는 불러오지 못했다고 안내하고 저장을 막는다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole("button", { name: "기록 61 열기" });
    await user.type(screen.getByLabelText("청구서 번호로 기록"), "999");
    await user.click(screen.getByRole("button", { name: "기록 열기" }));
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText(/청구서를 불러오지 못했습니다/)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "저장" }).hasAttribute("disabled")).toBe(
      true,
    );
  });

  it("서버 400 오류는 서버 메시지를 보인다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/billing/invoices/1/tax-documents", () =>
        mockErrors.validation([{ field: "approvalNumber", message: "승인번호 형식이 달라요." }]),
      ),
    );
    renderScreen();
    const dialog = await openRecord(user, 61);
    await user.click(within(dialog).getByRole("button", { name: "제안값 채우기" }));
    await user.type(within(dialog).getByLabelText("승인번호"), "A-4");
    pickDate(dialog, "2027-08-06");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText("승인번호 형식이 달라요.")).toBeTruthy();
  });

  it("기록 요청이 403이나 429이면 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/billing/invoices/1/tax-documents", () => mockErrors.rateLimited(30)),
    );
    renderScreen();
    const dialog = await openRecord(user, 61);
    await user.click(within(dialog).getByRole("button", { name: "제안값 채우기" }));
    await user.type(within(dialog).getByLabelText("승인번호"), "A-5");
    pickDate(dialog, "2027-08-06");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText(/요청이 너무 많습니다/)).toBeTruthy();
    server.use(
      http.post("/api/ops/billing/invoices/1/tax-documents", () => mockErrors.forbidden()),
    );
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(
      await within(dialog).findByText("이 처리를 할 수 있는 운영 역할이 아닙니다."),
    ).toBeTruthy();
  });

  it("닫기를 누르면 대화상자가 닫힌다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const dialog = await openRecord(user, 61);
    await user.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("수정 발급과 취소 처리", () => {
  it("수정 발급은 원본이 선택되고 음수 금액으로 기록된다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole("button", { name: "기록 62 수정 발급" }));
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByText(/사무소 \d+ · 총액/);
    expect((within(dialog).getByLabelText("원본 발급 기록") as HTMLSelectElement).value).toBe("62");
    await user.type(within(dialog).getByLabelText("승인번호"), "20270902-0001");
    pickDate(dialog, "2027-09-02");
    await user.type(within(dialog).getByLabelText("공급가액"), "-9091");
    await user.type(within(dialog).getByLabelText("세액"), "-909");
    await user.type(within(dialog).getByLabelText("사유"), "일부 환불");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await screen.findByText("수정 발급을 기록했습니다.")).toBeTruthy();
    expect(await screen.findByText("수정 발급", { selector: "span" })).toBeTruthy();
  });

  it("취소 처리는 원본 금액을 음수로 채워 준다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole("button", { name: "기록 62 취소 처리" }));
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByText(/사무소 \d+ · 총액/);
    expect((within(dialog).getByLabelText("공급가액") as HTMLInputElement).value).toBe("-30000");
    expect((within(dialog).getByLabelText("세액") as HTMLInputElement).value).toBe("-3000");
    await user.type(within(dialog).getByLabelText("승인번호"), "20270902-0002");
    pickDate(dialog, "2027-09-02");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await screen.findByText("취소 처리를 기록했습니다.")).toBeTruthy();
  });

  it("수정 발급은 사유가 필요하다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole("button", { name: "기록 62 수정 발급" }));
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByText(/사무소 \d+ · 총액/);
    await user.type(within(dialog).getByLabelText("승인번호"), "A-9");
    pickDate(dialog, "2027-09-02");
    await user.type(within(dialog).getByLabelText("공급가액"), "-1");
    await user.type(within(dialog).getByLabelText("세액"), "-1");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(within(dialog).getByText("사유를 입력해 주세요.")).toBeTruthy();
  });

  it("발급됨 원본이 없으면 수정 발급할 원본을 고르라고 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const dialog = await openRecord(user, 61);
    await user.click(within(dialog).getByRole("radio", { name: "수정 발급" }));
    await user.type(within(dialog).getByLabelText("승인번호"), "A-9");
    pickDate(dialog, "2027-09-02");
    await user.type(within(dialog).getByLabelText("공급가액"), "-1");
    await user.type(within(dialog).getByLabelText("세액"), "-1");
    await user.type(within(dialog).getByLabelText("사유"), "사유");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(within(dialog).getByText("수정할 원본 발급 기록을 선택해 주세요.")).toBeTruthy();
  });

  it("발급됨이 아닌 기록의 수정 발급은 409로 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/billing/tax-documents/62/amend", () =>
        errorResponse(409, "TAX_INVOICE_NOT_ELIGIBLE", "수정 발급할 수 없습니다."),
      ),
    );
    renderScreen();
    await user.click(await screen.findByRole("button", { name: "기록 62 수정 발급" }));
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByText(/사무소 \d+ · 총액/);
    await user.type(within(dialog).getByLabelText("승인번호"), "A-9");
    pickDate(dialog, "2027-09-02");
    await user.type(within(dialog).getByLabelText("공급가액"), "-1");
    await user.type(within(dialog).getByLabelText("세액"), "-1");
    await user.type(within(dialog).getByLabelText("사유"), "사유");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText("증빙을 발급할 수 없는 청구서입니다.")).toBeTruthy();
  });

  it("수정 발급 요청이 404이면 대상을 찾을 수 없다고 안내한다", async () => {
    const user = userEvent.setup();
    server.use(http.post("/api/ops/billing/tax-documents/62/amend", () => mockErrors.notFound()));
    renderScreen();
    await user.click(await screen.findByRole("button", { name: "기록 62 취소 처리" }));
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByText(/사무소 \d+ · 총액/);
    await user.type(within(dialog).getByLabelText("승인번호"), "A-9");
    pickDate(dialog, "2027-09-02");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });
});
