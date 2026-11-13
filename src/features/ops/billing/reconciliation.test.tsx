// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import { resetMockOpsBilling } from "@/mocks/handlers/ops-billing";
import { resetMockOpsSession, setMockOperatorRoles } from "@/mocks/handlers/ops-session";
import { resetMockOpsSystemMonitor } from "@/mocks/handlers/ops-system-monitor";
import { server, startMockServer } from "@/mocks/server";
import { formatSeoulDate } from "@/shared/lib/format";
import { pickOperator } from "../home/testing/pick-operator";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { ReconciliationScreen } from "./reconciliation";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/billing/reconciliation",
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

function renderScreen(roles: OpsRole[] = ["BILLING"]) {
  setMockOperatorRoles(roles);
  return renderOpsScreen(<ReconciliationScreen />, roles);
}

async function openResolve(user: ReturnType<typeof userEvent.setup>, entryId: number) {
  await user.click(await screen.findByRole("button", { name: `항목 ${entryId} 해결 기록` }));
  return screen.getByRole("dialog");
}

describe("대사 결과 목록", () => {
  it("영업일 기본값은 전일이다", async () => {
    renderScreen();
    await screen.findByRole("table", { name: "대사 결과 목록" });
    const expected = formatSeoulDate(new Date(Date.now() - 86_400_000));
    expect((screen.getByLabelText("영업일") as HTMLInputElement).value).toBe(expected);
  });

  it("일치와 금액 불일치와 PG에만 존재와 내부에만 존재와 확인 중을 구분한다", async () => {
    renderScreen();
    const table = await screen.findByRole("table", { name: "대사 결과 목록" });
    await within(table).findAllByText("금액 불일치");
    for (const label of ["일치", "PG에만 존재", "내부에만 존재", "확인 중"]) {
      expect(within(table).getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("결과별 건수를 보인다", async () => {
    renderScreen();
    const counts = await screen.findByRole("list", { name: "대사 결과 건수" });
    await waitFor(() => expect(within(counts).getByText("금액 불일치 2건")).toBeTruthy());
    expect(within(counts).getByText("일치 1건")).toBeTruthy();
    expect(within(counts).getByText("PG에만 존재 1건")).toBeTruthy();
  });

  it("미해결 차이에만 해결 기록 버튼이 있다", async () => {
    renderScreen();
    await screen.findByRole("button", { name: "항목 2 해결 기록" });
    expect(screen.getByRole("button", { name: "항목 3 해결 기록" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "항목 4 해결 기록" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "항목 5 해결 기록" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "항목 1 해결 기록" })).toBeNull();
    expect(screen.queryByRole("button", { name: "항목 6 해결 기록" })).toBeNull();
  });

  it("해결된 항목은 원인과 근거와 담당을 보인다", async () => {
    renderScreen();
    expect(await screen.findByText("PG 수수료 차이")).toBeTruthy();
    expect(screen.getByText("정산서 대조 완료")).toBeTruthy();
  });

  it("카드번호와 결제키 원문을 두지 않는다는 안내를 보인다", async () => {
    renderScreen();
    expect(await screen.findByText(/카드번호, 계좌번호, 결제키 원문은/)).toBeTruthy();
  });

  it("결과 필터로 금액 불일치만 본다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole("button", { name: "항목 3 해결 기록" });
    await user.selectOptions(screen.getByLabelText("대사 결과"), "AMOUNT_MISMATCH");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "항목 3 해결 기록" })).toBeNull(),
    );
    expect(screen.getByRole("button", { name: "항목 2 해결 기록" })).toBeTruthy();
  });

  it("미해결만 보기를 켜면 해결된 항목이 빠진다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText("PG 수수료 차이");
    await user.click(screen.getByLabelText("미해결 차이만"));
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByText("PG 수수료 차이")).toBeNull());
  });

  it("담당 운영자를 골라 걸러낸다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText("PG 수수료 차이");
    await pickOperator(screen.getByLabelText("담당 운영자"), 2);
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "항목 2 해결 기록" })).toBeNull(),
    );
    expect(screen.getByText("PG 수수료 차이")).toBeTruthy();
  });

  it("다른 영업일을 조회한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText("PG 수수료 차이");
    fireEvent.change(screen.getByLabelText("영업일"), { target: { value: "2026-01-01" } });
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByRole("button", { name: "항목 7 해결 기록" })).toBeTruthy();
    expect(screen.queryByText("PG 수수료 차이")).toBeNull();
  });

  it("해당 영업일에 결과가 없으면 빈 안내를 보인다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText("PG 수수료 차이");
    fireEvent.change(screen.getByLabelText("영업일"), { target: { value: "2020-01-01" } });
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(await screen.findByText("해당 영업일의 대사 결과가 없습니다.")).toBeTruthy();
  });

  it("결제담당이 아니면 접근 불가 안내를 보인다", () => {
    renderScreen(["SUPPORT"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
  });

  it("서버 오류는 안내하고 다시 시도하면 불러온다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(
      http.get("/api/ops/billing/reconciliation", () => (fail ? mockErrors.server() : undefined)),
    );
    renderScreen();
    expect(await screen.findByText(/일시적인 오류/)).toBeTruthy();
    fail = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("button", { name: "항목 2 해결 기록" })).toBeTruthy();
  });

  it("403과 429를 안내한다", async () => {
    server.use(http.get("/api/ops/billing/reconciliation", () => mockErrors.forbidden()));
    renderScreen();
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
    cleanup();
    server.use(http.get("/api/ops/billing/reconciliation", () => mockErrors.rateLimited(5)));
    renderScreen();
    expect(await screen.findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });
});

describe("대사 차이 해결", () => {
  it("원인과 근거가 비어 있으면 요청하지 않고 안내한다", async () => {
    const user = userEvent.setup();
    let called = false;
    server.use(
      http.post("/api/ops/billing/reconciliation/2/resolve", () => {
        called = true;
        return mockErrors.server();
      }),
    );
    renderScreen();
    const dialog = await openResolve(user, 2);
    await user.click(within(dialog).getByRole("button", { name: "해결 기록" }));
    expect(within(dialog).getByText("차이 원인을 입력해 주세요.")).toBeTruthy();
    expect(within(dialog).getByText("해결 근거를 입력해 주세요.")).toBeTruthy();
    expect(called).toBe(false);
  });

  it("원인과 근거를 입력해 해결하면 해결됨으로 바뀐다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const dialog = await openResolve(user, 2);
    await user.type(within(dialog).getByLabelText("차이 원인"), "PG 수수료 차이");
    await user.type(within(dialog).getByLabelText("해결 근거"), "정산서 대조 완료");
    await user.click(within(dialog).getByRole("button", { name: "해결 기록" }));
    expect(await screen.findByText("대사 항목 2의 해결 내용을 기록했습니다.")).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "항목 2 해결 기록" })).toBeNull(),
    );
  });

  it("담당자를 지정해 보낸다", async () => {
    const user = userEvent.setup();
    let sent: unknown = null;
    server.use(
      http.post("/api/ops/billing/reconciliation/3/resolve", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({
          entryId: 3,
          status: "MATCHED",
          differenceReason: "a",
          resolutionEvidence: "b",
          assignedOperatorId: 2,
          resolvedAt: new Date().toISOString(),
        });
      }),
    );
    renderScreen();
    const dialog = await openResolve(user, 3);
    await user.type(within(dialog).getByLabelText("차이 원인"), "a");
    await user.type(within(dialog).getByLabelText("해결 근거"), "b");
    await pickOperator(within(dialog).getByLabelText("담당 운영자"), 2);
    await user.click(within(dialog).getByRole("button", { name: "해결 기록" }));
    await screen.findByText("대사 항목 3의 해결 내용을 기록했습니다.");
    expect(sent).toMatchObject({
      differenceReason: "a",
      resolutionEvidence: "b",
      assigneeOperatorId: 2,
    });
  });

  it("활성 결제담당이 아닌 담당자는 409로 안내한다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const dialog = await openResolve(user, 2);
    await user.type(within(dialog).getByLabelText("차이 원인"), "a");
    await user.type(within(dialog).getByLabelText("해결 근거"), "b");
    await pickOperator(within(dialog).getByLabelText("담당 운영자"), 9);
    await user.click(within(dialog).getByRole("button", { name: "해결 기록" }));
    expect(await within(dialog).findByText(/활성 결제담당 운영자만/)).toBeTruthy();
  });

  it("이미 해결된 항목은 409로 안내한다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/billing/reconciliation/2/resolve", () =>
        errorResponse(409, "INVALID_TRANSITION", "이미 해결되었습니다."),
      ),
    );
    renderScreen();
    const dialog = await openResolve(user, 2);
    await user.type(within(dialog).getByLabelText("차이 원인"), "a");
    await user.type(within(dialog).getByLabelText("해결 근거"), "b");
    await user.click(within(dialog).getByRole("button", { name: "해결 기록" }));
    expect(await within(dialog).findByText(/이미 처리되었거나/)).toBeTruthy();
  });

  it("없는 항목은 404로 안내한다", async () => {
    const user = userEvent.setup();
    server.use(http.post("/api/ops/billing/reconciliation/2/resolve", () => mockErrors.notFound()));
    renderScreen();
    const dialog = await openResolve(user, 2);
    await user.type(within(dialog).getByLabelText("차이 원인"), "a");
    await user.type(within(dialog).getByLabelText("해결 근거"), "b");
    await user.click(within(dialog).getByRole("button", { name: "해결 기록" }));
    expect(await within(dialog).findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("서버 검증 오류는 메시지를 보인다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/billing/reconciliation/2/resolve", () =>
        mockErrors.validation([{ field: "resolutionEvidence", message: "근거가 너무 짧습니다." }]),
      ),
    );
    renderScreen();
    const dialog = await openResolve(user, 2);
    await user.type(within(dialog).getByLabelText("차이 원인"), "a");
    await user.type(within(dialog).getByLabelText("해결 근거"), "b");
    await user.click(within(dialog).getByRole("button", { name: "해결 기록" }));
    expect(await within(dialog).findByText("근거가 너무 짧습니다.")).toBeTruthy();
  });

  it("해결 요청이 429이면 요청 한도 안내를 보인다", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/ops/billing/reconciliation/2/resolve", () => mockErrors.rateLimited(20)),
    );
    renderScreen();
    const dialog = await openResolve(user, 2);
    await user.type(within(dialog).getByLabelText("차이 원인"), "a");
    await user.type(within(dialog).getByLabelText("해결 근거"), "b");
    await user.click(within(dialog).getByRole("button", { name: "해결 기록" }));
    expect(await within(dialog).findByText(/요청이 너무 많습니다/)).toBeTruthy();
  });

  it("취소하면 대화상자가 닫히고 기록하지 않는다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const dialog = await openResolve(user, 2);
    await user.click(within(dialog).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "항목 2 해결 기록" })).toBeTruthy();
  });
});

function reconciliationRun(patch: Record<string, unknown>) {
  const today = formatSeoulDate(new Date());
  return {
    runId: 501,
    jobName: "billing-reconciliation",
    jobType: "OTHER",
    rerunRoles: [],
    officeId: null,
    officeName: null,
    status: "FAILED",
    scheduledAt: `${today}T00:00:00+09:00`,
    startedAt: `${today}T00:00:05+09:00`,
    finishedAt: `${today}T00:00:09+09:00`,
    attemptCount: 1,
    errorCode: "PG_UNAVAILABLE",
    nextRunAt: null,
    assignedOperatorId: null,
    assignedOperatorName: null,
    ...patch,
  };
}

function stubRuns(items: unknown[]) {
  server.use(
    http.get("/api/ops/system-jobs", () =>
      HttpResponse.json({ items, page: 0, size: 100, totalElements: items.length }),
    ),
  );
}

describe("대사 실행 현황", () => {
  it("전일 영업일의 대사 실행 결과를 보인다", async () => {
    renderScreen();
    expect(await screen.findByText("대사 실행 현황")).toBeTruthy();
    expect(await screen.findByText("실행 ID")).toBeTruthy();
    expect(screen.getByText("109")).toBeTruthy();
    expect(screen.getByText("성공")).toBeTruthy();
  });

  it("실행 기록이 없는 영업일은 안내를 보인다", async () => {
    stubRuns([]);
    renderScreen();
    expect(await screen.findByText(/대사 실행 기록이 최근 실행 이력에 없습니다/)).toBeTruthy();
  });

  it("다른 영업일의 실행은 이 영업일의 실행으로 보지 않는다", async () => {
    stubRuns([reconciliationRun({ scheduledAt: "2026-01-02T00:00:00+09:00" })]);
    renderScreen();
    expect(await screen.findByText(/대사 실행 기록이 최근 실행 이력에 없습니다/)).toBeTruthy();
  });

  it("실패한 실행이 재실행 대상이 아니면 그 사실을 알린다", async () => {
    stubRuns([reconciliationRun({})]);
    renderScreen();
    expect(
      await screen.findByText("실패한 실행입니다. 재실행 대상이 아닌 작업입니다."),
    ).toBeTruthy();
    expect(screen.getByText("PG_UNAVAILABLE")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "대사 다시 실행" })).toBeNull();
  });

  it("서버가 결제담당 재실행을 허용하면 확인 뒤 다시 실행한다", async () => {
    stubRuns([reconciliationRun({ rerunRoles: ["BILLING"] })]);
    let body: unknown = null;
    server.use(
      http.post("/api/ops/system-jobs/billing-reconciliation/rerun", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            runId: 501,
            jobName: "billing-reconciliation",
            status: "SUCCESS",
            startedAt: "2026-11-13T09:00:00+09:00",
            attemptCount: 2,
            nextRunAt: null,
          },
          { status: 202 },
        );
      }),
    );
    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole("button", { name: "대사 다시 실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "다시 실행" }));
    expect(
      await screen.findByText(/대사를 다시 실행했습니다. 현재 결과는 성공입니다/),
    ).toBeTruthy();
    expect(body).toEqual({ runId: 501 });
  });

  it("실행 이력을 불러오지 못하면 다시 시도할 수 있다", async () => {
    server.use(http.get("/api/ops/system-jobs", () => mockErrors.forbidden()));
    renderScreen();
    expect(await screen.findByRole("button", { name: "실행 이력 다시 시도" })).toBeTruthy();
  });
});
