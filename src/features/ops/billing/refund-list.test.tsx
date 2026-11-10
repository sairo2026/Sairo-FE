// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mockErrors } from "@/mocks/error-responses";
import { resetMockOpsBilling } from "@/mocks/handlers/ops-billing";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { RefundListScreen } from "./refund-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/billing/refunds",
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

async function findRefund(id: number) {
  const links = await screen.findAllByRole("link", { name: String(id) });
  const found = links.find((link) => link.getAttribute("href") === `/ops/billing/refunds/${id}`);
  if (!found) throw new Error(`환불 ${id} 링크가 없습니다.`);
  return found;
}

function queryRefund(id: number) {
  return screen
    .queryAllByRole("link", { name: String(id) })
    .find((link) => link.getAttribute("href") === `/ops/billing/refunds/${id}`);
}

function renderList(roles: OpsRole[] = ["BILLING"]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<RefundListScreen />, roles);
}

describe("환불 신청 목록", () => {
  it("로딩 뒤 권리액과 기환불과 예약액 열을 보인다", async () => {
    renderList();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    await findRefund(2);
    for (const name of ["권리액", "기환불", "예약액", "환불 금액", "사유"]) {
      expect(screen.getByRole("columnheader", { name })).toBeTruthy();
    }
  });

  it("환불 번호는 환불 상세로 연결된다", async () => {
    renderList();
    const link = await findRefund(3);
    expect(link.getAttribute("href")).toBe("/ops/billing/refunds/3");
  });

  it("환불 사유를 한글로 보인다", async () => {
    renderList();
    await findRefund(3);
    expect(screen.getAllByText("정책 외 보상").length).toBeGreaterThan(0);
    expect(screen.getAllByText("해지").length).toBeGreaterThan(0);
  });

  it("상태 필터로 환불 실패 건만 본다", async () => {
    const user = userEvent.setup();
    renderList();
    await findRefund(2);
    await user.selectOptions(screen.getByLabelText("환불 상태"), "FAILED");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await findRefund(7);
    expect(queryRefund(2)).toBeUndefined();
  });

  it("사무소 ID로 걸러내고 결과가 없으면 빈 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderList();
    await findRefund(2);
    await user.type(screen.getByLabelText("사무소 ID"), "999");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("조건에 맞는 환불 신청이 없습니다.")).toBeTruthy();
  });

  it("결제담당이 아니면 접근 불가 안내를 보인다", () => {
    renderList(["EXEC_VIEW"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
  });

  it("서버 오류는 안내하고 다시 시도하면 불러온다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(
      http.get("/api/ops/refund-requests", () => (fail ? mockErrors.server() : undefined)),
    );
    renderList();
    expect(await screen.findByText(/일시적인 오류/)).toBeTruthy();
    fail = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await findRefund(2)).toBeTruthy();
  });

  it("403과 429를 안내한다", async () => {
    server.use(http.get("/api/ops/refund-requests", () => mockErrors.forbidden()));
    renderList();
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
    cleanup();
    server.use(http.get("/api/ops/refund-requests", () => mockErrors.rateLimited(10)));
    renderList();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});
