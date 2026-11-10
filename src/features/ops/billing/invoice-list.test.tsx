// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { resetMockOpsBilling } from "@/mocks/handlers/ops-billing";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { InvoiceListScreen } from "./invoice-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/billing",
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

function renderList(roles: OpsRole[] = ["BILLING"]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<InvoiceListScreen />, roles);
}

describe("청구서 목록", () => {
  it("로딩 뒤 청구서와 상태를 보인다", async () => {
    renderList();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    await screen.findByRole("link", { name: "1" });
    expect(screen.getAllByText("결제 완료").length).toBeGreaterThan(0);
    expect(screen.getAllByText("결제 확인 중").length).toBeGreaterThan(0);
    expect(screen.getByRole("columnheader", { name: "VAT 포함 금액" })).toBeTruthy();
  });

  it("청구서 번호는 상세 화면으로 연결된다", async () => {
    renderList();
    const link = await screen.findByRole("link", { name: "2" });
    expect(link.getAttribute("href")).toBe("/ops/billing/invoices/2");
  });

  it("환불과 대사와 증빙 화면으로 이동하는 탭이 있다", async () => {
    renderList();
    await screen.findByRole("link", { name: "1" });
    const nav = screen.getByRole("navigation", { name: "결제 화면 이동" });
    expect(within(nav).getByRole("link", { name: "환불" }).getAttribute("href")).toBe(
      "/ops/billing/refunds",
    );
    expect(within(nav).getByRole("link", { name: "대사" }).getAttribute("href")).toBe(
      "/ops/billing/reconciliation",
    );
    expect(within(nav).getByRole("link", { name: "증빙 발급" }).getAttribute("href")).toBe(
      "/ops/billing/tax-documents",
    );
    expect(within(nav).getByRole("link", { name: "청구서" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("카드번호와 계좌번호와 결제키 원문을 두지 않는다는 안내를 보인다", async () => {
    renderList();
    expect(await screen.findByText(/카드번호, 계좌번호, 결제키 원문은/)).toBeTruthy();
  });

  it("상태 필터로 결제 확인 중인 청구서만 본다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "1" });
    await user.selectOptions(screen.getByLabelText("청구 상태"), "VERIFYING");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await screen.findByRole("link", { name: "2" });
    expect(screen.queryByRole("link", { name: "1" })).toBeNull();
  });

  it("사무소 ID로 걸러낸다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "1" });
    await user.type(screen.getByLabelText("사무소 ID"), "8");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await screen.findByRole("link", { name: "4" });
    expect(screen.queryByRole("link", { name: "1" })).toBeNull();
  });

  it("조건에 맞는 청구서가 없으면 빈 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "1" });
    await user.type(screen.getByLabelText("사무소 ID"), "999");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("조건에 맞는 청구서가 없습니다.")).toBeTruthy();
  });

  it("초기화하면 전체 목록으로 돌아간다", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "1" });
    await user.type(screen.getByLabelText("사무소 ID"), "999");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await screen.findByText("조건에 맞는 청구서가 없습니다.");
    await user.click(screen.getByRole("button", { name: "초기화" }));
    expect(await screen.findByRole("link", { name: "1" })).toBeTruthy();
  });

  it("결제담당이 아니면 접근 불가 안내를 보인다", () => {
    renderList(["OPS"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("서버 오류는 안내하고 다시 시도하면 불러온다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(
      http.get("/api/ops/billing/invoices", () => (fail ? mockErrors.server() : undefined)),
    );
    renderList();
    expect(await screen.findByText(/일시적인 오류/)).toBeTruthy();
    fail = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("link", { name: "1" })).toBeTruthy();
  });

  it("403은 권한 안내를 보인다", async () => {
    server.use(http.get("/api/ops/billing/invoices", () => mockErrors.forbidden()));
    renderList();
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("429는 요청 한도 안내를 보인다", async () => {
    server.use(http.get("/api/ops/billing/invoices", () => mockErrors.rateLimited(10)));
    renderList();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});
