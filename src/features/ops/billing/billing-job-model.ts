import { formatSeoulDate } from "@/shared/lib/format";
import type { SystemJobRun } from "../system-jobs/system-jobs-model";

export const RECONCILIATION_JOB = "billing-reconciliation";

export const CHARGE_JOB_LABELS: Record<string, string> = {
  "billing-first-charge": "첫 결제",
  "billing-renewal": "정기 결제",
  "billing-retry": "결제 재시도",
};

export function isChargeJob(run: SystemJobRun): boolean {
  return run.jobType === "CHARGE_RETRY" || run.jobName in CHARGE_JOB_LABELS;
}

export function reconciliationRunFor(
  runs: readonly SystemJobRun[],
  businessDate: string,
): SystemJobRun | null {
  return (
    runs.find((run) => {
      if (run.jobName !== RECONCILIATION_JOB || !run.scheduledAt) return false;
      const scheduled = Date.parse(run.scheduledAt);
      return !Number.isNaN(scheduled) && formatSeoulDate(new Date(scheduled - 1)) === businessDate;
    }) ?? null
  );
}
