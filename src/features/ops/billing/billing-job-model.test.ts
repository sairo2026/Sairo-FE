import { describe, expect, it } from "vitest";
import type { SystemJobRun } from "../system-jobs/system-jobs-model";
import { isChargeJob, reconciliationRunFor } from "./billing-job-model";

function run(patch: Partial<SystemJobRun>): SystemJobRun {
  return {
    runId: 1,
    jobName: "billing-reconciliation",
    officeId: null,
    officeName: null,
    status: "SUCCESS",
    scheduledAt: "2026-11-10T00:00:00+09:00",
    startedAt: "2026-11-10T00:00:03+09:00",
    finishedAt: "2026-11-10T00:00:08+09:00",
    attemptCount: 1,
    errorCode: null,
    nextRunAt: null,
    assignedOperatorId: null,
    assignedOperatorName: null,
    jobType: "OTHER",
    rerunRoles: [],
    ...patch,
  };
}

describe("결제 작업 구분", () => {
  it("서버가 준 작업 종류나 작업 이름으로 결제 작업을 가린다", () => {
    expect(isChargeJob(run({ jobName: "billing-retry" }))).toBe(true);
    expect(isChargeJob(run({ jobName: "billing-x", jobType: "CHARGE_RETRY" }))).toBe(true);
    expect(isChargeJob(run({ jobName: "billing-reconciliation", jobType: "OTHER" }))).toBe(false);
  });
});

describe("영업일의 대사 실행 찾기", () => {
  it("영업일 다음 날 0시에 예약된 실행을 그 영업일의 실행으로 본다", () => {
    const runs = [run({ runId: 7 }), run({ runId: 8, scheduledAt: "2026-11-11T00:00:00+09:00" })];
    expect(reconciliationRunFor(runs, "2026-11-09")?.runId).toBe(7);
    expect(reconciliationRunFor(runs, "2026-11-10")?.runId).toBe(8);
  });

  it("예약 시각이 없거나 다른 작업이면 찾지 않는다", () => {
    const runs = [run({ scheduledAt: null }), run({ jobName: "billing-retry" })];
    expect(reconciliationRunFor(runs, "2026-11-09")).toBeNull();
  });
});
