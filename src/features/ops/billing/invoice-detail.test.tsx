// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { resetMockOpsBilling } from "@/mocks/handlers/ops-billing";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { resetMockOpsSystemMonitor } from "@/mocks/handlers/ops-system-monitor";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { InvoiceDetailScreen } from "./invoice-detail";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/billing/invoices/1",
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
  resetMockOpsSystemMonitor();
});
afterAll(() => stopServer());

function renderDetail(invoiceId: number, roles: OpsRole[] = ["BILLING"]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<InvoiceDetailScreen invoiceId={invoiceId} />, roles);
}

describe("청구서 상세", () => {
  it("로딩 뒤 청구 스냅샷을 보인다", async () => {
    renderDetail(1);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(await screen.findByText("청구 스냅샷")).toBeTruthy();
    expect(screen.getByText("과금 인원")).toBeTruthy();
    expect(screen.getByText("3명")).toBeTruthy();
    expect(screen.getByText("가격표 버전")).toBeTruthy();
    expect(screen.getAllByText("33,000원").length).toBeGreaterThan(0);
  });

  it("동의 문안 버전과 한도와 구매 동의 사건을 보인다", async () => {
    renderDetail(1);
    expect(await screen.findByText("동의 근거")).toBeTruthy();
    expect(screen.getByText("동의 문안 버전")).toBeTruthy();
    expect(screen.getByText("동의 금액 한도")).toBeTruthy();
    expect(screen.getByText("구매 동의 사건 ID")).toBeTruthy();
  });

  it("결제 시도별 PG 주문 ID와 결과를 보인다", async () => {
    renderDetail(2);
    expect(await screen.findByText("inv2-att1-b2c4")).toBeTruthy();
    expect(screen.getByText("inv2-att2-c9d1")).toBeTruthy();
    expect(screen.getByText("한도 초과")).toBeTruthy();
    expect(screen.getAllByText("PG 확인 중").length).toBeGreaterThan(0);
  });

  it("PG 확인 중인 청구서는 재청구와 환불을 하지 말라고 안내한다", async () => {
    renderDetail(2);
    expect(await screen.findByText(/결제대행사에서 결과를 확인하는 중입니다/)).toBeTruthy();
  });

  it("결제 완료 청구서에는 PG 확인 안내가 없다", async () => {
    renderDetail(1);
    await screen.findByText("청구 스냅샷");
    expect(screen.queryByText(/결제대행사에서 결과를 확인하는 중입니다/)).toBeNull();
  });

  it("연결된 환불 사건에서 환불 상세로 이동한다", async () => {
    renderDetail(1);
    const table = await screen.findByRole("table", { name: "연결된 환불 사건 목록" });
    const link = within(table).getAllByRole("link")[0];
    expect(link?.getAttribute("href")).toMatch(/^\/ops\/billing\/refunds\/\d+$/);
  });

  it("연결된 환불이 없으면 빈 안내를 보인다", async () => {
    renderDetail(4);
    expect(await screen.findByText("연결된 환불 사건이 없습니다.")).toBeTruthy();
    expect(screen.getByText("결제 시도 기록이 없습니다.")).toBeTruthy();
  });

  it("카드번호와 결제키 원문을 보이지 않는다", async () => {
    renderDetail(1);
    await screen.findByText("청구 스냅샷");
    expect(document.body.textContent).not.toMatch(/billingKey|paymentKey|cardNumber/i);
    expect(screen.getByText(/카드번호, 계좌번호, 결제키 원문은/)).toBeTruthy();
  });

  it("없는 청구서는 찾을 수 없음 화면을 보인다", async () => {
    renderDetail(999);
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).toBeTruthy();
  });

  it("결제담당이 아니면 접근 불가 안내를 보인다", () => {
    renderDetail(1, ["SUPPORT"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
  });

  it("429는 요청 한도 안내를 보인다", async () => {
    server.use(http.get("/api/ops/billing/invoices/1", () => mockErrors.rateLimited(5)));
    renderDetail(1);
    expect(await screen.findByText("요청이 너무 많습니다")).toBeTruthy();
  });

  it("확인 중인 청구서는 확인 중인 주문 ID와 사무소의 결제 작업 실행 이력을 보인다", async () => {
    renderDetail(2);
    expect(await screen.findByText("PG 결과 확인")).toBeTruthy();
    expect(screen.getByText(/^확인 중인 주문 ID: inv2-att\d/)).toBeTruthy();
    const table = await screen.findByRole("table", { name: "이 사무소의 결제 작업 실행 이력" });
    expect(await within(table).findByText("정기 결제")).toBeTruthy();
    expect(within(table).getByText("PG_TIMEOUT")).toBeTruthy();
    expect(within(table).getByRole("button", { name: "실행 108 다시 실행" })).toBeTruthy();
  });

  it("결제 완료 청구서에는 PG 결과 확인 영역이 없다", async () => {
    renderDetail(1);
    await screen.findByText("청구 스냅샷");
    expect(screen.queryByText("PG 결과 확인")).toBeNull();
  });

  it("최신 결과 불러오기는 청구서를 다시 조회한다", async () => {
    let calls = 0;
    server.use(
      http.get("/api/ops/billing/invoices/2", () => {
        calls += 1;
      }),
    );
    const user = userEvent.setup();
    renderDetail(2);
    await user.click(await screen.findByRole("button", { name: "최신 결과 불러오기" }));
    await waitFor(() => expect(calls).toBe(2));
  });

  it("실패한 결제 작업을 확인 뒤 원래 주문으로 다시 실행한다", async () => {
    const user = userEvent.setup();
    renderDetail(2);
    await user.click(await screen.findByRole("button", { name: "실행 108 다시 실행" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/이미 성공한 결제는 다시 청구하지 않습니다/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "다시 실행" }));
    expect(await screen.findByText(/실행 108를 원래 주문으로 다시 실행했습니다/)).toBeTruthy();
  });

  it("다시 실행이 거절되면 사유를 알린다", async () => {
    server.use(http.post("/api/ops/system-jobs/:jobName/rerun", () => mockErrors.forbidden()));
    const user = userEvent.setup();
    renderDetail(2);
    await user.click(await screen.findByRole("button", { name: "실행 108 다시 실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "다시 실행" }));
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });
});
