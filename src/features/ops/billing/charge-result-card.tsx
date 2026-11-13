"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DataTable } from "@/shared/components/ui/data-table";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { opsKeys } from "../api/ops-api";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { describeOpsError } from "../model/ops-errors";
import { useOpsSession } from "../model/ops-session";
import { useRerunSystemJob, useSystemJobs } from "../system-jobs/system-jobs-api";
import { JOB_STATUS, RERUN_BLOCK_MESSAGE, rerunBlock } from "../system-jobs/system-jobs-model";
import type { SystemJobRun } from "../system-jobs/system-jobs-model";
import { CHARGE_JOB_LABELS, isChargeJob } from "./billing-job-model";
import { describeBillingError } from "./billing-model";

const NO_PAGING = {
  page: 1,
  pageSize: 100 as const,
  onPageChange: () => undefined,
  onPageSizeChange: () => undefined,
};

export function ChargeResultCard({
  officeId,
  verifyingOrderIds,
  isRefreshing,
  refreshedAt,
  onRefresh,
}: {
  officeId: number;
  verifyingOrderIds: readonly string[];
  isRefreshing: boolean;
  refreshedAt: number;
  onRefresh: () => void;
}) {
  const session = useOpsSession();
  const client = useQueryClient();
  const jobs = useSystemJobs({ officeId, page: 0, size: 100 });
  const rerun = useRerunSystemJob();
  const [target, setTarget] = useState<SystemJobRun | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const runs = (jobs.data?.items ?? []).filter(isChargeJob);

  async function confirmRerun() {
    if (!target) return;
    const current = target;
    setTarget(null);
    setFeedback(null);
    try {
      const result = await rerun.mutateAsync({ jobName: current.jobName, runId: current.runId });
      await client.invalidateQueries({ queryKey: opsKeys.scope("billing") });
      setFeedback({
        message: `실행 ${current.runId}를 원래 주문으로 다시 실행했습니다. 현재 결과는 ${JOB_STATUS[result.status]?.label ?? result.status}입니다.`,
        isError: false,
      });
    } catch (caught) {
      setFeedback({
        message: describeBillingError(caught, "다시 실행하지 못했습니다."),
        isError: true,
      });
    }
  }

  return (
    <Card title="PG 결과 확인">
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink-2">
          확인 중인 결제는 같은 주문 ID로 결제대행사 결과를 자동으로 다시 조회합니다. 다시 조회해도
          새로 청구하지 않으며 결과가 확정되면 이 청구서와 결제 시도의 상태가 바뀝니다.
        </p>
        <p className="text-body text-ink">
          {verifyingOrderIds.length > 0
            ? `확인 중인 주문 ID: ${verifyingOrderIds.join(", ")}`
            : "확인 중인 결제 시도가 없습니다."}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outlined" size="sm" isLoading={isRefreshing} onClick={onRefresh}>
            최신 결과 불러오기
          </Button>
          <span className="text-caption text-ink-2">
            마지막 조회 {formatSeoulDateTime(new Date(refreshedAt))}
          </span>
        </div>
        {feedback ? (
          <p
            role={feedback.isError ? "alert" : "status"}
            className={feedback.isError ? "text-caption text-danger" : "text-caption text-ink"}
          >
            {feedback.message}
          </p>
        ) : null}
        <DataTable
          caption="이 사무소의 결제 작업 실행 이력"
          rows={runs}
          getRowId={(row) => String(row.runId)}
          totalCount={runs.length}
          {...NO_PAGING}
          isLoading={jobs.isPending}
          errorMessage={
            jobs.isError
              ? describeOpsError(jobs.error, "결제 작업 실행 이력을 불러오지 못했습니다.")
              : undefined
          }
          onRetry={() => void jobs.refetch()}
          emptyMessage="이 사무소의 결제 작업 실행 이력이 없습니다."
          columns={[
            { key: "run", header: "실행", render: (row) => row.runId },
            {
              key: "job",
              header: "작업",
              render: (row) => CHARGE_JOB_LABELS[row.jobName] ?? row.jobName,
            },
            {
              key: "status",
              header: "결과",
              render: (row) => <OpsStatusBadge status={row.status} map={JOB_STATUS} />,
            },
            { key: "attempt", header: "시도 횟수", render: (row) => `${row.attemptCount}회` },
            { key: "error", header: "오류 코드", render: (row) => row.errorCode ?? "-" },
            {
              key: "started",
              header: "시작 시각",
              render: (row) => formatSeoulDateTime(row.startedAt),
            },
            {
              key: "finished",
              header: "종료 시각",
              render: (row) => (row.finishedAt ? formatSeoulDateTime(row.finishedAt) : "-"),
            },
            {
              key: "rerun",
              header: "다시 실행",
              render: (row) => {
                const block = rerunBlock(row, session.roles);
                if (block) {
                  return (
                    <span className="text-caption text-ink-2">{RERUN_BLOCK_MESSAGE[block]}</span>
                  );
                }
                return (
                  <Button
                    variant="outlined"
                    size="sm"
                    aria-label={`실행 ${row.runId} 다시 실행`}
                    onClick={() => setTarget(row)}
                  >
                    다시 실행
                  </Button>
                );
              },
            },
          ]}
        />
      </div>
      <ConfirmDialog
        isOpen={target !== null}
        title="실패한 결제 작업을 다시 실행할까요?"
        message={
          target
            ? `실행 ${target.runId}를 원래 멱등키로 다시 실행합니다. 서버가 현재 상태를 다시 검사해 이미 성공한 결제는 다시 청구하지 않습니다. 처리 내용은 감사 로그에 기록됩니다.`
            : ""
        }
        confirmLabel="다시 실행"
        isPending={rerun.isPending}
        onConfirm={() => void confirmRerun()}
        onCancel={() => setTarget(null)}
      />
    </Card>
  );
}
