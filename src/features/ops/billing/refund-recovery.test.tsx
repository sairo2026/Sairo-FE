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
import { expectNoAxeViolations } from "@/shared/testing/route-a11y";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import { RefundDetailScreen } from "./refund-detail";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/billing/refunds/7",
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

type User = ReturnType<typeof userEvent.setup>;

function renderDetail(refundId: number) {
  setMockOperatorRoles(["BILLING"]);
  return renderOpsScreen(<RefundDetailScreen refundId={refundId} />, ["BILLING"]);
}

function isBlocked(element: HTMLElement) {
  return element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
}

async function openDialog(user: User, button: string) {
  await user.click(screen.getByRole("button", { name: button }));
  return screen.getByRole("dialog");
}

async function fillReopen(user: User, dialog: HTMLElement, reason = "PG 콘솔 확인") {
  await user.type(within(dialog).getByLabelText(/다시 여는 사유/), reason);
  await user.click(within(dialog).getByRole("checkbox"));
}

async function fillResolve(user: User, dialog: HTMLElement) {
  await user.type(within(dialog).getByLabelText(/PG 취소 근거/), " TOSS-CANCEL-1 ");
  await user.type(within(dialog).getByLabelText(/직접 처리한 사유/), "관리자 화면에서 취소");
  await user.click(within(dialog).getByRole("checkbox"));
}

describe("실패한 환불 상세", () => {
  it("승인 지연 사유와 실패 사유와 재처리 버튼과 고지를 보인다", async () => {
    renderDetail(10);
    expect(await screen.findByText("승인 지연")).toBeTruthy();
    expect(screen.getByText("실패 사유")).toBeTruthy();
    expect(screen.getByText("결제대행사가 취소를 처리하지 못했습니다.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "다시 열기" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "수동 완료" })).toBeTruthy();
    expect(screen.getByText(/새 멱등키로 PG에 나갑니다/)).toBeTruthy();
    expect(screen.getByText(/5분 이내 재인증이 필요합니다/)).toBeTruthy();
    expect(screen.queryByText("더 처리할 수 있는 작업이 없습니다.")).toBeNull();
  });

  it("실패가 아닌 환불에는 재처리 버튼이 없다", async () => {
    renderDetail(6);
    await screen.findByText("사건별 환불 권리액");
    expect(screen.queryByRole("button", { name: "다시 열기" })).toBeNull();
    expect(screen.queryByRole("button", { name: "수동 완료" })).toBeNull();
  });

  it("실행이 실패로 끝나면 같은 화면에서 재처리 버튼이 나온다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    renderDetail(4);
    await screen.findByText("사건별 환불 권리액");
    server.use(
      http.post("/api/ops/refund-requests/4/execute", () =>
        HttpResponse.json({ refundId: 4, status: "FAILED", failureReason: "취소 거절" }),
      ),
      http.get("/api/ops/refund-requests/4", () =>
        HttpResponse.json({
          refundId: 4,
          officeId: 7,
          invoiceId: 2,
          reasonCode: "SERVICE_FAILURE",
          reasonEventType: "SERVICE_INCIDENT",
          reasonEventId: "inc-4",
          requestedAt: "2026-11-01T09:00:00+09:00",
          status: "FAILED",
          entitlementAmount: 11000,
          previousRefundAmount: 0,
          reservedAmount: 11000,
          refundAmount: 11000,
          reviewedByOperatorId: 2,
          reviewedByOperatorName: "박지원",
          reviewedAt: "2026-11-02T09:00:00+09:00",
          rejectionReason: null,
          pgRefundId: null,
          resolvedAt: null,
          failureReason: "취소 거절",
        }),
      ),
    );
    await user.click(screen.getByRole("button", { name: "환불 실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "환불 실행" }));
    expect(await screen.findByRole("button", { name: "다시 열기" })).toBeTruthy();
  });
});

describe("실패한 환불 접근성", () => {
  it("상세 화면과 두 대화상자에 접근성 위반이 없고 대화상자 이름이 붙어 있다", async () => {
    const user = userEvent.setup();
    const { container } = renderDetail(7);
    await screen.findByText("사건별 환불 권리액");
    await expectNoAxeViolations(container);
    for (const [button, title] of [
      ["다시 열기", "실패한 환불 다시 열기"],
      ["수동 완료", "실패한 환불 수동 완료"],
    ] as const) {
      await user.click(screen.getByRole("button", { name: button }));
      const dialog = screen.getByRole("dialog", { name: title });
      await expectNoAxeViolations(dialog);
      await user.click(within(dialog).getByRole("button", { name: "취소" }));
    }
  });
});

describe("실패한 환불 다시 열기", () => {
  it("사유와 PG 미취소 확인이 모두 있어야 눌린다", async () => {
    const user = userEvent.setup();
    renderDetail(7);
    await screen.findByText("사건별 환불 권리액");
    const dialog = await openDialog(user, "다시 열기");
    const submit = within(dialog).getByRole("button", { name: "다시 열기" });
    expect(isBlocked(submit)).toBe(true);
    expect(within(dialog).getByText(/같은 금액이 두 번 환불될 수 있습니다/)).toBeTruthy();
    expect(within(dialog).getByText(/감사 로그에 남고/)).toBeTruthy();
    await user.type(within(dialog).getByLabelText(/다시 여는 사유/), "PG 콘솔 확인");
    expect(isBlocked(submit)).toBe(true);
    const check = within(dialog).getByRole("checkbox", {
      name: /PG에서 취소되지 않은 것을 확인했습니다/,
    });
    await user.click(check);
    expect(isBlocked(submit)).toBe(false);
    await user.click(check);
    expect(isBlocked(submit)).toBe(true);
  });

  it("다시 열면 요청 본문이 맞고 승인 상태로 돌아가 환불 실행 버튼이 나온다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    renderDetail(7);
    await screen.findByText("사건별 환불 권리액");
    let body: unknown = null;
    server.use(
      http.post("/api/ops/refund-requests/7/reopen", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ refundId: 7, status: "APPROVED" });
      }),
    );
    const dialog = await openDialog(user, "다시 열기");
    await fillReopen(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: "다시 열기" }));
    expect(await screen.findByText(/환불을 승인 상태로 되돌렸습니다/)).toBeTruthy();
    expect(body).toEqual({ reason: "PG 콘솔 확인", pgStateConfirmed: true });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("모의 서버에서 다시 열면 실패 사유가 사라지고 환불 실행이 열린다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    renderDetail(7);
    await screen.findByText("사건별 환불 권리액");
    const dialog = await openDialog(user, "다시 열기");
    await fillReopen(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: "다시 열기" }));
    expect(await screen.findByRole("button", { name: "환불 실행" })).toBeTruthy();
    expect(screen.queryByText(/ALREADY_CANCELED_PAYMENT/)).toBeNull();
    expect(screen.queryByRole("button", { name: "수동 완료" })).toBeNull();
  });

  it("재인증 없이 다시 열면 재인증 필요 안내를 대화상자에 보인다", async () => {
    const user = userEvent.setup();
    renderDetail(7);
    await screen.findByText("사건별 환불 권리액");
    const dialog = await openDialog(user, "다시 열기");
    await fillReopen(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: "다시 열기" }));
    const alert = await within(screen.getByRole("dialog")).findByRole("alert");
    expect(alert.textContent).toMatch(/본인 확인이 필요합니다/);
  });

  it("409는 새로 고침 안내를, 403은 권한 안내를 대화상자에 남긴다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    server.use(
      http.post("/api/ops/refund-requests/7/reopen", () =>
        errorResponse(409, "INVALID_TRANSITION", "허용되지 않는 전이입니다."),
      ),
    );
    renderDetail(7);
    await screen.findByText("사건별 환불 권리액");
    const dialog = await openDialog(user, "다시 열기");
    await fillReopen(user, dialog, "확인");
    await user.click(within(dialog).getByRole("button", { name: "다시 열기" }));
    expect(await within(dialog).findByText(/지금 상태에서는 할 수 없는 처리입니다/)).toBeTruthy();

    server.use(http.post("/api/ops/refund-requests/7/reopen", () => mockErrors.forbidden()));
    await user.click(within(dialog).getByRole("button", { name: "다시 열기" }));
    expect(
      await within(dialog).findByText("이 처리를 할 수 있는 운영 역할이 아닙니다."),
    ).toBeTruthy();
  });

  it("취소하면 요청하지 않고 다시 열면 입력이 비어 있다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    let called = false;
    server.use(
      http.post("/api/ops/refund-requests/7/reopen", () => {
        called = true;
        return mockErrors.server();
      }),
    );
    renderDetail(7);
    await screen.findByText("사건별 환불 권리액");
    const dialog = await openDialog(user, "다시 열기");
    await fillReopen(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(called).toBe(false);
    const again = await openDialog(user, "다시 열기");
    expect((within(again).getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
    expect((within(again).getByLabelText(/다시 여는 사유/) as HTMLTextAreaElement).value).toBe("");
  });
});

describe("실패한 환불 수동 완료", () => {
  it("근거와 사유와 PG 직접 취소 확인이 모두 있어야 눌린다", async () => {
    const user = userEvent.setup();
    renderDetail(7);
    await screen.findByText("사건별 환불 권리액");
    const dialog = await openDialog(user, "수동 완료");
    const submit = within(dialog).getByRole("button", { name: "수동 완료" });
    expect(isBlocked(submit)).toBe(true);
    await user.type(within(dialog).getByLabelText(/PG 취소 근거/), "TOSS-CANCEL-1");
    await user.type(within(dialog).getByLabelText(/직접 처리한 사유/), "관리자 화면에서 취소");
    expect(isBlocked(submit)).toBe(true);
    await user.click(
      within(dialog).getByRole("checkbox", { name: /PG 콘솔에서 직접 취소한 것을 확인했습니다/ }),
    );
    expect(isBlocked(submit)).toBe(false);
  });

  it("완료하면 요청 본문이 맞고 재처리 버튼이 사라진다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    renderDetail(7);
    await screen.findByText("사건별 환불 권리액");
    let body: unknown = null;
    server.use(
      http.post("/api/ops/refund-requests/7/resolve-manually", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ refundId: 7, status: "COMPLETED" });
      }),
    );
    const dialog = await openDialog(user, "수동 완료");
    await fillResolve(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: "수동 완료" }));
    expect(await screen.findByText("수동 처리로 환불을 완료했습니다.")).toBeTruthy();
    expect(body).toEqual({
      reference: "TOSS-CANCEL-1",
      reason: "관리자 화면에서 취소",
      pgCancelConfirmed: true,
    });
  });

  it("모의 서버에서 완료하면 환불 완료 상태가 되고 버튼이 사라진다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    renderDetail(7);
    await screen.findByText("사건별 환불 권리액");
    const dialog = await openDialog(user, "수동 완료");
    await fillResolve(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: "수동 완료" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "수동 완료" })).toBeNull());
    expect(screen.getByText("환불 완료", { selector: "span" })).toBeTruthy();
  });

  it("내가 승인한 정책 외 보상은 수동 완료가 꺼지고 다시 열기는 열린다", async () => {
    renderDetail(11);
    await screen.findByText("사건별 환불 권리액");
    expect(isBlocked(screen.getByRole("button", { name: "수동 완료" }))).toBe(true);
    expect(screen.getByText(/수동 완료할 수 없습니다/)).toBeTruthy();
    expect(isBlocked(screen.getByRole("button", { name: "다시 열기" }))).toBe(false);
  });

  it("서버가 자기 승인 수동 완료를 막으면 안내한다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    server.use(
      http.post("/api/ops/refund-requests/7/resolve-manually", () =>
        errorResponse(403, "SELF_APPROVAL_FORBIDDEN", "본인 승인 건입니다."),
      ),
    );
    renderDetail(7);
    await screen.findByText("사건별 환불 권리액");
    const dialog = await openDialog(user, "수동 완료");
    await fillResolve(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: "수동 완료" }));
    expect(await within(dialog).findByText(/직접 승인할 수 없습니다/)).toBeTruthy();
  });

  it("409는 새로 고침 안내를 보인다", async () => {
    const user = userEvent.setup();
    markMockStepUp();
    server.use(
      http.post("/api/ops/refund-requests/7/resolve-manually", () =>
        errorResponse(409, "INVALID_TRANSITION", "허용되지 않는 전이입니다."),
      ),
    );
    renderDetail(7);
    await screen.findByText("사건별 환불 권리액");
    const dialog = await openDialog(user, "수동 완료");
    await fillResolve(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: "수동 완료" }));
    expect(await within(dialog).findByText(/지금 상태에서는 할 수 없는 처리입니다/)).toBeTruthy();
  });
});
