// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockOpsBilling } from "@/mocks/handlers/ops-billing";
import {
  markMockStepUp,
  resetMockOpsSession,
  setMockOperatorRoles,
} from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { RefundDetailScreen } from "./refund-detail";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/billing/refunds/2",
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

function renderDetail(refundId: number, roles: OpsRole[] = ["BILLING"]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<RefundDetailScreen refundId={refundId} />, roles);
}

function isBlocked(element: HTMLElement) {
  return element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
}

describe("환불 상세 표시", () => {
  it("권리액과 기환불과 예약액과 사건 정보를 보인다", async () => {
    renderDetail(2);
    expect(await screen.findByText("사건별 환불 권리액")).toBeTruthy();
    expect(screen.getByText("기환불 누계")).toBeTruthy();
    expect(screen.getByText("처리 중 예약액")).toBeTruthy();
    expect(screen.getByText("INVOICE")).toBeTruthy();
    expect(screen.getByText("att-77")).toBeTruthy();
    expect(screen.getByText("중복 결제")).toBeTruthy();
  });

  it("PG 환불 참조 번호는 마스킹된 값만 보인다", async () => {
    renderDetail(6);
    expect(await screen.findByText("ab12********")).toBeTruthy();
    expect(screen.getByText("환불 완료", { selector: "span" })).toBeTruthy();
  });

  it("청구서 번호로 청구서 상세에 연결된다", async () => {
    renderDetail(2);
    await screen.findByText("사건별 환불 권리액");
    const link = screen.getByRole("link", { name: "1" });
    expect(link.getAttribute("href")).toBe("/ops/billing/invoices/1");
  });

  it("환불 신청과 대사와 청구서 탭으로 이동할 수 있다", async () => {
    renderDetail(2);
    await screen.findByText("사건별 환불 권리액");
    const nav = screen.getByRole("navigation", { name: "결제 화면 이동" });
    expect(within(nav).getByRole("link", { name: "대사" })).toBeTruthy();
    expect(within(nav).getByRole("link", { name: "환불" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("이미 완료된 환불에는 처리 버튼이 없다", async () => {
    renderDetail(6);
    await screen.findByText("사건별 환불 권리액");
    expect(screen.queryByRole("button", { name: "승인" })).toBeNull();
    expect(screen.queryByRole("button", { name: "환불 실행" })).toBeNull();
    expect(screen.getByText("더 처리할 수 있는 작업이 없습니다.")).toBeTruthy();
  });

  it("PG 확인 중인 환불은 대사 화면 확인을 안내한다", async () => {
    renderDetail(8);
    expect(await screen.findByText(/PG 결과를 확인하는 중입니다/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "환불 실행" })).toBeNull();
  });

  it("거절된 환불은 거절 사유를 보인다", async () => {
    renderDetail(9);
    expect(await screen.findByText("환불 대상 기간이 아닙니다.")).toBeTruthy();
  });

  it("없는 환불은 찾을 수 없음 화면을 보인다", async () => {
    renderDetail(999);
    expect(await screen.findByText("페이지를 찾을 수 없습니다")).toBeTruthy();
  });

  it("결제담당이 아니면 접근 불가 안내를 보인다", () => {
    renderDetail(2, ["SUPPORT"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
  });

  it("429는 요청 한도 안내를 보인다", async () => {
    server.use(http.get("/api/ops/refund-requests/2", () => mockErrors.rateLimited(5)));
    renderDetail(2);
    expect(await screen.findByText("요청이 너무 많습니다")).toBeTruthy();
  });
});

describe("환불 검토", () => {
  it("검토 중인 환불을 승인하면 실행 단계로 넘어간다", async () => {
    const user = userEvent.setup();
    renderDetail(2);
    await screen.findByText("사건별 환불 권리액");
    await user.click(screen.getByRole("button", { name: "승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText("환불 검토를 승인했습니다.")).toBeTruthy();
    expect(await screen.findByRole("button", { name: "환불 실행" })).toBeTruthy();
  });

  it("사건 ID 없이 접수된 환불은 사건 ID를 채워야 승인할 수 있다", async () => {
    const user = userEvent.setup();
    renderDetail(1);
    await screen.findByText("사건별 환불 권리액");
    expect(screen.getByText(/사건 ID가 비어 있습니다/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "승인" }));
    const dialog = screen.getByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "승인" });
    expect(isBlocked(confirm)).toBe(true);
    await user.type(within(dialog).getByLabelText(/환불 사유 사건 ID/), "sub-cancel-3");
    expect(isBlocked(confirm)).toBe(false);
    await user.click(confirm);
    expect(await screen.findByText("환불 검토를 승인했습니다.")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("sub-cancel-3")).toBeTruthy());
  });

  it("사건 ID가 있는 환불은 사건 ID 입력 없이 승인한다", async () => {
    const user = userEvent.setup();
    renderDetail(2);
    await screen.findByText("사건별 환불 권리액");
    await user.click(screen.getByRole("button", { name: "승인" }));
    expect(within(screen.getByRole("dialog")).queryByLabelText(/환불 사유 사건 ID/)).toBeNull();
  });

  it("검토 메모를 함께 보낸다", async () => {
    const user = userEvent.setup();
    let sent: unknown = null;
    server.use(
      http.post("/api/ops/refund-requests/2/review", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({
          refundId: 2,
          status: "APPROVED",
          reviewedAt: new Date().toISOString(),
          rejectionReason: null,
          refundAmount: 33000,
          entitlementAmount: 33000,
          previousRefundAmount: 0,
          reservedAmount: 33000,
        });
      }),
    );
    renderDetail(2);
    await screen.findByText("사건별 환불 권리액");
    await user.click(screen.getByRole("button", { name: "승인" }));
    await user.type(screen.getByLabelText("검토 메모(선택)"), "이중청구 확인됨");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    await screen.findByText("환불 검토를 승인했습니다.");
    expect(sent).toMatchObject({ decision: "APPROVE", note: "이중청구 확인됨" });
  });

  it("거절은 사유가 있어야 하고 거절하면 거절됨으로 바뀐다", async () => {
    const user = userEvent.setup();
    renderDetail(2);
    await screen.findByText("사건별 환불 권리액");
    await user.click(screen.getByRole("button", { name: "거절" }));
    const dialog = screen.getByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "거절" });
    expect(isBlocked(confirm)).toBe(true);
    await user.type(within(dialog).getByLabelText("거절 사유"), "환불 대상이 아닙니다.");
    await user.click(confirm);
    expect(await screen.findByText("환불 검토를 거절했습니다.")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByText("더 처리할 수 있는 작업이 없습니다.")).toBeTruthy(),
    );
  });

  it("이미 검토가 끝난 환불의 검토는 409로 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/refund-requests/2/review", () =>
        errorResponse(409, "INVALID_TRANSITION", "허용되지 않는 전이입니다."),
      ),
    );
    renderDetail(2);
    await screen.findByText("사건별 환불 권리액");
    await user.click(screen.getByRole("button", { name: "승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText(/이미 처리되었거나/)).toBeTruthy();
  });

  it("검토 요청의 400 오류는 서버 메시지를 보인다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/refund-requests/2/review", () =>
        mockErrors.validation([{ field: "reasonEventId", message: "사건 ID를 확인해 주세요." }]),
      ),
    );
    renderDetail(2);
    await screen.findByText("사건별 환불 권리액");
    await user.click(screen.getByRole("button", { name: "승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText("사건 ID를 확인해 주세요.")).toBeTruthy();
  });

  it("검토 요청이 403이면 권한 안내를 보인다", async () => {
    const user = userEvent.setup();
    server.use(http.post("/api/ops/refund-requests/2/review", () => mockErrors.forbidden()));
    renderDetail(2);
    await screen.findByText("사건별 환불 권리액");
    await user.click(screen.getByRole("button", { name: "승인" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }));
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("정책 외 보상은 승인한 운영자가 실행할 수 없다는 안내를 검토 단계에서 보인다", async () => {
    server.use(
      http.get("/api/ops/refund-requests/2", () =>
        HttpResponse.json({
          refundId: 2,
          officeId: 42,
          invoiceId: 1,
          reasonCode: "POLICY_COMPENSATION",
          reasonEventType: "POLICY_COMPENSATION",
          reasonEventId: "case-1",
          requestedAt: "2026-11-01T09:00:00+09:00",
          status: "REVIEWING",
          entitlementAmount: 10000,
          previousRefundAmount: 0,
          reservedAmount: 0,
          refundAmount: 10000,
          reviewedByOperatorId: null,
          reviewedByOperatorName: null,
          reviewedAt: null,
          rejectionReason: null,
          pgRefundId: null,
          resolvedAt: null,
        }),
      ),
    );
    renderDetail(2);
    expect(await screen.findByText(/승인한 운영자는 이 건을 실행할 수 없습니다/)).toBeTruthy();
  });
});

describe("환불 실행", () => {
  it("실행 전 5분 재인증 안내와 되돌릴 수 없다는 안내를 보인다", async () => {
    renderDetail(4);
    expect(await screen.findByText(/5분 이내 재인증이 필요합니다/)).toBeTruthy();
    expect(screen.getByText(/되돌릴 수 없고/)).toBeTruthy();
  });

  it("다른 운영자가 승인한 정책 외 보상은 실행해 완료한다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    renderDetail(4);
    await screen.findByText("사건별 환불 권리액");
    await user.click(screen.getByRole("button", { name: "환불 실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "환불 실행" }));
    expect(await screen.findByText("환불을 완료했습니다.")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("ef56********")).toBeTruthy());
  });

  it("내가 승인한 정책 외 보상은 실행 버튼이 꺼지고 안내한다", async () => {
    renderDetail(3);
    await screen.findByText("사건별 환불 권리액");
    expect(isBlocked(screen.getByRole("button", { name: "환불 실행" }))).toBe(true);
    expect(screen.getByText(/직접 실행할 수 없습니다/)).toBeTruthy();
  });

  it("내가 승인했어도 정책 외 보상이 아니면 실행할 수 있다", async () => {
    renderDetail(5);
    await screen.findByText("사건별 환불 권리액");
    expect(isBlocked(screen.getByRole("button", { name: "환불 실행" }))).toBe(false);
    expect(screen.queryByText(/직접 실행할 수 없습니다/)).toBeNull();
  });

  it("서버가 자기 실행을 막으면 안내한다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    server.use(
      http.post("/api/ops/refund-requests/4/execute", () =>
        errorResponse(403, "SELF_APPROVAL_FORBIDDEN", "본인 승인 건입니다."),
      ),
    );
    renderDetail(4);
    await screen.findByText("사건별 환불 권리액");
    await user.click(screen.getByRole("button", { name: "환불 실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "환불 실행" }));
    expect(await screen.findByText(/직접 실행할 수 없습니다/)).toBeTruthy();
  });

  it("재인증 없이 실행하면 재인증 필요 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderDetail(4);
    await screen.findByText("사건별 환불 권리액");
    await user.click(screen.getByRole("button", { name: "환불 실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "환불 실행" }));
    expect(await screen.findByText("본인 확인이 필요합니다.")).toBeTruthy();
  });

  it("PG 결과가 불확실하면 확인 중으로 안내한다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    server.use(
      http.post("/api/ops/refund-requests/4/execute", () =>
        HttpResponse.json({ refundId: 4, status: "VERIFYING", failureReason: null }),
      ),
    );
    renderDetail(4);
    await screen.findByText("사건별 환불 권리액");
    await user.click(screen.getByRole("button", { name: "환불 실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "환불 실행" }));
    expect(await screen.findByText(/PG 결과를 확인하는 중입니다. 대사 화면/)).toBeTruthy();
  });

  it("환불이 실패하면 실패 사유를 보인다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    server.use(
      http.post("/api/ops/refund-requests/4/execute", () =>
        HttpResponse.json({ refundId: 4, status: "FAILED", failureReason: "취소 가능 기간 초과" }),
      ),
    );
    renderDetail(4);
    await screen.findByText("사건별 환불 권리액");
    await user.click(screen.getByRole("button", { name: "환불 실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "환불 실행" }));
    expect(await screen.findByText(/환불이 실패했습니다. 사유: 취소 가능 기간 초과/)).toBeTruthy();
  });

  it("실행 요청의 409는 새로 고침 안내를 보인다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    server.use(
      http.post("/api/ops/refund-requests/4/execute", () =>
        errorResponse(409, "INVALID_TRANSITION", "허용되지 않는 전이입니다."),
      ),
    );
    renderDetail(4);
    await screen.findByText("사건별 환불 권리액");
    await user.click(screen.getByRole("button", { name: "환불 실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "환불 실행" }));
    expect(await screen.findByText(/이미 처리되었거나/)).toBeTruthy();
  });

  it("실행 요청의 429는 요청 한도 안내를 보인다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    server.use(http.post("/api/ops/refund-requests/4/execute", () => mockErrors.rateLimited(30)));
    renderDetail(4);
    await screen.findByText("사건별 환불 권리액");
    await user.click(screen.getByRole("button", { name: "환불 실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "환불 실행" }));
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("실행 대화상자를 취소하면 요청하지 않는다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    let called = false;
    server.use(
      http.post("/api/ops/refund-requests/4/execute", () => {
        called = true;
        return mockErrors.server();
      }),
    );
    renderDetail(4);
    await screen.findByText("사건별 환불 권리액");
    await user.click(screen.getByRole("button", { name: "환불 실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(called).toBe(false);
  });
});
