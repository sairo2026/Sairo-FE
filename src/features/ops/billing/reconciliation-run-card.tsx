"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsDetailList } from "../components/common/ops-detail-list";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { describeOpsError } from "../model/ops-errors";
import { useOpsSession } from "../model/ops-session";
import { useRerunSystemJob, useSystemJobs } from "../system-jobs/system-jobs-api";
import { JOB_STATUS, RERUN_BLOCK_MESSAGE, rerunBlock } from "../system-jobs/system-jobs-model";
import { RECONCILIATION_JOB, reconciliationRunFor } from "./billing-job-model";
import { describeBillingError } from "./billing-model";

export function ReconciliationRunCard({
  businessDate,
  onRerunDone,
}: {
  businessDate: string;
  onRerunDone: () => void;
}) {
  const session = useOpsSession();
  const jobs = useSystemJobs({ jobName: RECONCILIATION_JOB, page: 0, size: 100 });
  const rerun = useRerunSystemJob();
  const [isConfirming, setIsConfirming] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const run = reconciliationRunFor(jobs.data?.items ?? [], businessDate);
  const block = run ? rerunBlock(run, session.roles) : null;

  async function confirmRerun() {
    if (!run) return;
    setIsConfirming(false);
    setFeedback(null);
    try {
      const result = await rerun.mutateAsync({ jobName: run.jobName, runId: run.runId });
      onRerunDone();
      setFeedback({
        message: `${businessDate} 대사를 다시 실행했습니다. 현재 결과는 ${JOB_STATUS[result.status]?.label ?? result.status}입니다.`,
        isError: false,
      });
    } catch (caught) {
      setFeedback({
        message: describeBillingError(caught, "대사를 다시 실행하지 못했습니다."),
        isError: true,
      });
    }
  }

  return (
    <Card title="대사 실행 현황">
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink-2">
          대사는 영업일마다 한 번 자동으로 실행됩니다. 실행이 끝나야 아래 대사 결과가 만들어지며
          대사만으로 승인액을 만들거나 다시 청구하지 않습니다.
        </p>
        {jobs.isPending ? (
          <p role="status" className="text-body text-ink-2">
            대사 실행 이력을 불러오는 중입니다.
          </p>
        ) : jobs.isError ? (
          <div className="flex flex-col gap-2">
            <p role="alert" className="text-caption text-danger">
              {describeOpsError(jobs.error, "대사 실행 이력을 불러오지 못했습니다.")}
            </p>
            <div>
              <Button variant="outlined" size="sm" onClick={() => void jobs.refetch()}>
                실행 이력 다시 시도
              </Button>
            </div>
          </div>
        ) : run ? (
          <>
            <OpsDetailList
              items={[
                { label: "대사 영업일", value: businessDate },
                {
                  label: "실행 결과",
                  value: <OpsStatusBadge status={run.status} map={JOB_STATUS} />,
                },
                { label: "실행 ID", value: run.runId },
                { label: "시도 횟수", value: `${run.attemptCount}회` },
                { label: "시작 시각", value: formatSeoulDateTime(run.startedAt) },
                {
                  label: "종료 시각",
                  value: run.finishedAt ? formatSeoulDateTime(run.finishedAt) : null,
                },
                { label: "오류 코드", value: run.errorCode },
                {
                  label: "다음 실행",
                  value: run.nextRunAt ? formatSeoulDateTime(run.nextRunAt) : null,
                },
              ]}
            />
            {run.status !== "FAILED" ? null : block ? (
              <p className="text-caption text-ink-2">
                실패한 실행입니다. {RERUN_BLOCK_MESSAGE[block]}
              </p>
            ) : (
              <div>
                <Button variant="outlined" size="sm" onClick={() => setIsConfirming(true)}>
                  대사 다시 실행
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-body text-ink">
            {businessDate} 영업일의 대사 실행 기록이 최근 실행 이력에 없습니다. 아직 실행 전이거나
            오래된 영업일입니다.
          </p>
        )}
        {feedback ? (
          <p
            role={feedback.isError ? "alert" : "status"}
            className={feedback.isError ? "text-caption text-danger" : "text-caption text-ink"}
          >
            {feedback.message}
          </p>
        ) : null}
      </div>
      <ConfirmDialog
        isOpen={isConfirming}
        title="대사를 다시 실행할까요?"
        message={`${businessDate} 영업일의 대사를 원래 멱등키로 다시 실행합니다. 처리 내용은 감사 로그에 기록됩니다.`}
        confirmLabel="다시 실행"
        isPending={rerun.isPending}
        onConfirm={() => void confirmRerun()}
        onCancel={() => setIsConfirming(false)}
      />
    </Card>
  );
}
