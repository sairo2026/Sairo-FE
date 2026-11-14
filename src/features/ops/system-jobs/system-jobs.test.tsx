// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { errorResponse, mockErrors } from "@/mocks/error-responses";
import {
  opsSystemMonitorHandlers,
  resetMockOpsSystemMonitor,
} from "@/mocks/handlers/ops-system-monitor";
import { resetMockOpsSession } from "@/mocks/handlers/ops-session";
import { server, startMockServer } from "@/mocks/server";
import { renderOpsScreen } from "../home/testing/render-ops-screen";
import type { OpsRole } from "../model/roles";
import { SystemJobsScreen } from "./system-jobs-screen";
import { RERUN_ROLE_TABLE, rerunBlock } from "./system-jobs-model";
import type { SystemJobRun } from "./system-jobs-model";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/ops/system-jobs",
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
  resetMockOpsSystemMonitor();
  vi.restoreAllMocks();
});
afterAll(() => stopServer());

function registerMonitorMocks() {
  server.use(...opsSystemMonitorHandlers);
}

function renderJobs(roles: OpsRole[] = ["OPS", "BILLING", "PRIVACY", "MIGRATION"]) {
  registerMonitorMocks();
  return renderOpsScreen(<SystemJobsScreen />, roles);
}

function isDisabled(button: HTMLElement): boolean {
  return button.getAttribute("aria-disabled") === "true";
}

function run(patch: Partial<SystemJobRun>): SystemJobRun {
  return {
    runId: 1,
    jobName: "BILLING_RETRY",
    officeId: null,
    officeName: null,
    status: "FAILED",
    scheduledAt: null,
    startedAt: "2026-11-10T09:00:00+09:00",
    finishedAt: null,
    attemptCount: 1,
    errorCode: null,
    nextRunAt: null,
    assignedOperatorId: null,
    assignedOperatorName: null,
    jobType: "CHARGE_RETRY",
    rerunRoles: ["BILLING"],
    ...patch,
  };
}

describe("시스템 작업 모델", () => {
  it("재실행 대상 표는 청구 재시도, 공지 발행, 외부 연동 점검, 보관 기간 정리 네 종류만 둔다", () => {
    expect(RERUN_ROLE_TABLE.map((entry) => entry.targets).join(", ")).toBe(
      "청구 재시도, 공지 발행, 외부 연동 점검, 보관 기간 정리",
    );
    expect(RERUN_ROLE_TABLE.some((entry) => entry.targets.includes("환불"))).toBe(false);
  });

  it("성공과 진행 중인 실행은 역할이 있어도 막는다", () => {
    expect(rerunBlock(run({ status: "SUCCESS" }), ["BILLING"])).toBe("SUCCESS");
    expect(rerunBlock(run({ status: "RUNNING" }), ["BILLING"])).toBe("RUNNING");
  });

  it("실패한 실행은 해당 역할이 있을 때만 허용한다", () => {
    expect(rerunBlock(run({}), ["BILLING"])).toBeNull();
    expect(rerunBlock(run({}), ["OPS"])).toBe("NO_ROLE");
  });

  it("서버가 준 재실행 역할이 있으면 그 역할로 판단하고 빈 목록은 재실행 대상이 아니다", () => {
    expect(
      rerunBlock(run({ jobName: "billing-retry", rerunRoles: ["BILLING"] }), ["BILLING"]),
    ).toBeNull();
    expect(rerunBlock(run({ jobName: "billing-retry", rerunRoles: ["BILLING"] }), ["OPS"])).toBe(
      "NO_ROLE",
    );
    expect(rerunBlock(run({ jobName: "billing-reconciliation", rerunRoles: [] }), ["OPS"])).toBe(
      "NOT_RERUNNABLE",
    );
  });
});

describe("시스템 작업 화면", () => {
  it("로딩 뒤 작업 목록과 담당자 이름과 사무소 이름을 보여준다", async () => {
    renderJobs();
    expect(await screen.findByText("retention-sweep")).toBeTruthy();
    expect(screen.getByText("한빛공인중개사")).toBeTruthy();
    expect(screen.getByText("김이전")).toBeTruthy();
    expect(screen.getByText("MAPPING_TIMEOUT")).toBeTruthy();
    expect(screen.getByText("2회")).toBeTruthy();
  });

  it("새 배치 작업 이름에 설명을 붙이고 재실행 대상이 아니라고 안내한다", async () => {
    const names = [
      "consent-notice-send",
      "marketing-reconfirm-scan",
      "tax-document-pending-scan",
      "guest-intake-deadline-scan",
    ];
    registerMonitorMocks();
    server.use(
      http.get("/api/ops/system-jobs", () =>
        HttpResponse.json({
          items: names.map((jobName, index) => ({
            runId: 900 + index,
            jobName,
            jobType: "OTHER",
            rerunRoles: [],
            officeId: null,
            officeName: null,
            status: "FAILED",
            scheduledAt: null,
            startedAt: "2026-11-10T09:00:00+09:00",
            finishedAt: "2026-11-10T09:01:00+09:00",
            attemptCount: 1,
            errorCode: "GUEST_INTAKE_OVERDUE",
            nextRunAt: null,
            assignedOperatorId: null,
            assignedOperatorName: null,
          })),
          page: 0,
          size: 25,
          totalElements: 4,
        }),
      ),
    );
    renderOpsScreen(<SystemJobsScreen />, ["OPS", "BILLING", "PRIVACY"]);
    await screen.findByText("consent-notice-send");
    expect(screen.getByText("수신 설정 변경 통지 발송")).toBeTruthy();
    expect(screen.getByText("광고성 수신 동의 2년 재확인")).toBeTruthy();
    expect(screen.getByText("세금 증빙 발급 대기 생성")).toBeTruthy();
    expect(screen.getByText("비회원 권리 요청 기한 점검")).toBeTruthy();
    expect(isDisabled(screen.getByRole("button", { name: "실행 900 재실행" }))).toBe(true);
    expect(isDisabled(screen.getByRole("button", { name: "실행 903 재실행" }))).toBe(true);
    expect(screen.getAllByText("재실행 대상이 아닌 작업입니다.")).toHaveLength(4);
  });

  it("역할별 재실행 대상 표를 안내한다", async () => {
    renderJobs();
    await screen.findByText("retention-sweep");
    const table = screen.getByRole("table", { name: "역할별 재실행 대상 작업" });
    expect(within(table).getByText("보관 기간 정리")).toBeTruthy();
    expect(within(table).getByText("청구 재시도")).toBeTruthy();
    expect(within(table).getByText("공지 발행, 외부 연동 점검")).toBeTruthy();
  });

  it("내 역할 중 재실행할 수 있는 종류를 보여준다", async () => {
    renderJobs(["OPS", "BILLING"]);
    await screen.findByText("retention-sweep");
    expect(screen.getByText(/내 역할 중 재실행할 수 있는 종류: 결제담당, 운영담당/)).toBeTruthy();
  });

  it("목록이 비면 안내한다", async () => {
    registerMonitorMocks();
    server.use(
      http.get("/api/ops/system-jobs", () =>
        HttpResponse.json({ items: [], page: 0, size: 25, totalElements: 0 }),
      ),
    );
    renderOpsScreen(<SystemJobsScreen />, ["OPS"]);
    expect(await screen.findByText("조건에 맞는 작업 실행이 없습니다.")).toBeTruthy();
  });

  it("서버 오류가 나면 다시 시도할 수 있다", async () => {
    registerMonitorMocks();
    let calls = 0;
    server.use(
      http.get("/api/ops/system-jobs", () => {
        calls += 1;
        if (calls === 1) return mockErrors.server();
        return HttpResponse.json({ items: [], page: 0, size: 25, totalElements: 0 });
      }),
    );
    renderOpsScreen(<SystemJobsScreen />, ["OPS"]);
    const retry = await screen.findByRole("button", { name: "다시 시도" });
    await userEvent.setup().click(retry);
    expect(await screen.findByText("조건에 맞는 작업 실행이 없습니다.")).toBeTruthy();
  });

  it("목록 조회가 403이면 오류 문구를 보여준다", async () => {
    registerMonitorMocks();
    server.use(http.get("/api/ops/system-jobs", () => mockErrors.forbidden()));
    renderOpsScreen(<SystemJobsScreen />, ["OPS"]);
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("목록 조회가 429이면 기다릴 시간을 안내한다", async () => {
    registerMonitorMocks();
    server.use(http.get("/api/ops/system-jobs", () => mockErrors.rateLimited(30)));
    renderOpsScreen(<SystemJobsScreen />, ["OPS"]);
    expect(
      await screen.findByText(/요청이 너무 많습니다. 30초 뒤에 다시 시도해 주세요./),
    ).toBeTruthy();
  });

  it("결제담당도 실행 이력을 본다", async () => {
    renderJobs(["BILLING"]);
    expect(await screen.findByText("retention-sweep")).toBeTruthy();
  });

  it("작업을 다루는 역할이 없으면 화면 대신 접근 불가 안내를 보인다", () => {
    renderJobs(["SUPPORT"]);
    expect(screen.getByText("이 화면을 볼 수 있는 운영 역할이 아닙니다")).toBeTruthy();
  });

  it("결과 필터를 적용해 서버에 보낸다", async () => {
    renderJobs();
    await screen.findByText("retention-sweep");
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("결과"), "SUCCESS");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByText("retention-sweep")).toBeNull());
    expect(screen.getByText("legal-link-log-purge")).toBeTruthy();
  });

  it("작업 이름 필터를 적용하고 초기화한다", async () => {
    renderJobs();
    await screen.findByText("retention-sweep");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("작업 이름"), "first-charge");
    await user.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(screen.queryByText("retention-sweep")).toBeNull());
    expect(screen.getByText("billing-first-charge")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "초기화" }));
    expect(await screen.findByText("retention-sweep")).toBeTruthy();
  });

  it("성공한 실행의 재실행 버튼은 비활성이고 이유를 안내한다", async () => {
    renderJobs();
    await screen.findByText("legal-link-log-purge");
    expect(isDisabled(screen.getByRole("button", { name: "실행 102 재실행" }))).toBe(true);
    expect(screen.getAllByText("이미 성공한 실행은 다시 실행할 수 없습니다.").length).toBe(2);
  });

  it("진행 중인 실행의 재실행 버튼은 비활성이다", async () => {
    renderJobs();
    await screen.findByText("billing-retry");
    expect(isDisabled(screen.getByRole("button", { name: "실행 103 재실행" }))).toBe(true);
    expect(screen.getByText("진행 중인 실행은 다시 실행할 수 없습니다.")).toBeTruthy();
  });

  it("실패한 실행은 보유 역할에 따라 활성 여부가 달라진다", async () => {
    renderJobs(["OPS", "BILLING"]);
    await screen.findByText("retention-sweep");
    expect(isDisabled(screen.getByRole("button", { name: "실행 101 재실행" }))).toBe(true);
    expect(isDisabled(screen.getByRole("button", { name: "실행 105 재실행" }))).toBe(false);
    expect(isDisabled(screen.getByRole("button", { name: "실행 104 재실행" }))).toBe(false);
    expect(isDisabled(screen.getByRole("button", { name: "실행 106 재실행" }))).toBe(true);
  });

  it("재실행 대상이 아닌 작업에는 안내 문구를 보인다", async () => {
    renderJobs();
    await screen.findAllByText("billing-reconciliation");
    expect(isDisabled(screen.getByRole("button", { name: "실행 106 재실행" }))).toBe(true);
    expect(screen.getByText("재실행 대상이 아닌 작업입니다.")).toBeTruthy();
  });

  it("작업 이름 형식이 아니면 조회하지 않고 안내한다", async () => {
    renderJobs();
    await screen.findByText("retention-sweep");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("작업 이름"), "환불");
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(
      await screen.findByText("작업 이름은 영문 소문자, 숫자, 하이픈으로 입력해 주세요."),
    ).toBeTruthy();
  });

  it("역할이 없는 실행에는 역할 안내 문구를 보인다", async () => {
    renderJobs(["OPS"]);
    await screen.findByText("retention-sweep");
    expect(
      screen.getAllByText("이 작업 종류를 재실행할 수 있는 역할이 아닙니다.").length,
    ).toBeGreaterThan(0);
  });

  it("재실행을 확인하면 새 실행 번호를 안내하고 목록을 새로 불러온다", async () => {
    renderJobs();
    await screen.findByText("retention-sweep");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "실행 105 재실행" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/원래 멱등키로 다시 실행합니다/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "재실행" }));
    expect(await screen.findByText(/새 실행 번호는 110입니다/)).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText("2회")).toHaveLength(2));
  });

  it("재실행 요청 본문에는 runId만 보낸다", async () => {
    let body: unknown = null;
    renderJobs();
    server.use(
      http.post("/api/ops/system-jobs/:jobName/rerun", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            runId: 200,
            jobName: "billing-first-charge",
            status: "RUNNING",
            startedAt: "2026-11-11T09:00:00+09:00",
            attemptCount: 2,
            nextRunAt: null,
          },
          { status: 202 },
        );
      }),
    );
    await screen.findByText("billing-first-charge");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "실행 105 재실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "재실행" }));
    await screen.findByText(/새 실행 번호는 200입니다/);
    expect(body).toEqual({ runId: 105 });
  });

  it("확인 대화상자를 취소하면 요청하지 않는다", async () => {
    const calls = vi.fn();
    renderJobs();
    server.use(
      http.post("/api/ops/system-jobs/:jobName/rerun", () => {
        calls();
        return mockErrors.server();
      }),
    );
    await screen.findByText("billing-first-charge");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "실행 105 재실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(calls).not.toHaveBeenCalled();
  });

  it("서버가 이미 성공한 실행으로 거절하면 409 안내를 보인다", async () => {
    renderJobs();
    server.use(
      http.post("/api/ops/system-jobs/:jobName/rerun", () =>
        errorResponse(409, "INVALID_TRANSITION", "이미 성공했습니다."),
      ),
    );
    await screen.findByText("billing-first-charge");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "실행 105 재실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "재실행" }));
    expect(await screen.findByText(/지금 상태에서는 할 수 없는 처리입니다/)).toBeTruthy();
  });

  it("서버가 실행 ID 불일치로 404를 주면 대상을 찾을 수 없다고 안내한다", async () => {
    renderJobs();
    server.use(http.post("/api/ops/system-jobs/:jobName/rerun", () => mockErrors.notFound()));
    await screen.findByText("billing-first-charge");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "실행 105 재실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "재실행" }));
    expect(await screen.findByText("대상을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("서버가 역할 부족으로 403을 주면 권한 안내를 보인다", async () => {
    renderJobs();
    server.use(http.post("/api/ops/system-jobs/:jobName/rerun", () => mockErrors.forbidden()));
    await screen.findByText("billing-first-charge");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "실행 105 재실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "재실행" }));
    expect(await screen.findByText("이 처리를 할 수 있는 운영 역할이 아닙니다.")).toBeTruthy();
  });

  it("재실행이 429이면 기다릴 시간을 안내한다", async () => {
    renderJobs();
    server.use(http.post("/api/ops/system-jobs/:jobName/rerun", () => mockErrors.rateLimited(10)));
    await screen.findByText("billing-first-charge");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "실행 105 재실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "재실행" }));
    expect(await screen.findByText(/10초 뒤에 다시 시도해 주세요/)).toBeTruthy();
  });

  it("재실행이 서버 오류이면 실패 문구를 보인다", async () => {
    renderJobs();
    server.use(http.post("/api/ops/system-jobs/:jobName/rerun", () => mockErrors.server()));
    await screen.findByText("billing-first-charge");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "실행 105 재실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "재실행" }));
    expect(await screen.findByText(/일시적인 오류가 발생했습니다/)).toBeTruthy();
  });

  it("재실행 요청이 400이면 입력 확인 문구를 보인다", async () => {
    renderJobs();
    server.use(
      http.post("/api/ops/system-jobs/:jobName/rerun", () =>
        mockErrors.validation([{ field: "runId", message: "실행 ID가 올바르지 않습니다." }]),
      ),
    );
    await screen.findByText("billing-first-charge");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "실행 105 재실행" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "재실행" }));
    expect(
      await screen.findByText(/입력값을 확인해 주세요. 실행 ID가 올바르지 않습니다./),
    ).toBeTruthy();
  });
});
