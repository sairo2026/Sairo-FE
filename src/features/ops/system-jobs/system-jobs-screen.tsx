"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { OPS_ROLE_LABELS } from "../model/roles";
import { useOpsSession } from "../model/ops-session";
import { FormMessage } from "../system-common/system-fields";
import { describeSystemError } from "../system-common/system-form";
import { useRerunSystemJob, useSystemJobs } from "./system-jobs-api";
import {
  JOB_NAME_PATTERN,
  JOB_STATUS,
  JOB_STATUS_OPTIONS,
  RERUN_BLOCK_MESSAGE,
  RERUN_ROLE_TABLE,
  rerunBlock,
} from "./system-jobs-model";
import type { SystemJobRun } from "./system-jobs-model";

type Filters = { jobName: string; status: string; officeId: string };
const EMPTY_FILTERS: Filters = { jobName: "", status: "", officeId: "" };

function RoleTable() {
  const session = useOpsSession();
  const owned = RERUN_ROLE_TABLE.filter((entry) => session.roles.includes(entry.role));
  return (
    <Card title="역할별 재실행 대상" tone="flat">
      <table className="w-full text-left text-body">
        <caption className="sr-only">역할별 재실행 대상 작업</caption>
        <thead>
          <tr className="text-caption text-ink-2">
            <th scope="col" className="py-2">
              운영 역할
            </th>
            <th scope="col" className="py-2">
              재실행할 수 있는 작업 종류
            </th>
          </tr>
        </thead>
        <tbody>
          {RERUN_ROLE_TABLE.map((entry) => (
            <tr key={entry.role} className="border-t border-line">
              <td className="py-2">{entry.label}</td>
              <td className="py-2">{entry.targets}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-caption text-ink-2">
        내 역할 중 재실행할 수 있는 종류:{" "}
        {owned.length > 0 ? owned.map((entry) => OPS_ROLE_LABELS[entry.role]).join(", ") : "없음"}
      </p>
    </Card>
  );
}

function JobTable({ onFeedback }: { onFeedback: (message: string, isError: boolean) => void }) {
  const session = useOpsSession();
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [target, setTarget] = useState<SystemJobRun | null>(null);
  const [nameError, setNameError] = useState<string>();
  const paging = useOpsPaging();
  const query = useSystemJobs({
    jobName: applied.jobName.trim(),
    status: applied.status,
    officeId: applied.officeId,
    page: paging.page,
    size: paging.size,
  });
  const rerun = useRerunSystemJob();

  async function confirmRerun() {
    if (!target) return;
    const current = target;
    setTarget(null);
    try {
      const result = await rerun.mutateAsync({ jobName: current.jobName, runId: current.runId });
      onFeedback(
        `실행 ${current.runId}를 다시 실행했습니다. 새 실행 번호는 ${result.runId}입니다.`,
        false,
      );
    } catch (caught) {
      onFeedback(describeSystemError(caught, "재실행하지 못했습니다."), true);
    }
  }

  return (
    <>
      <OpsFilterBar
        label="시스템 작업 조회"
        onApply={() => {
          // 백엔드는 소문자·숫자·하이픈 작업 이름만 받는다(형식이 다르면 400).
          const jobName = draft.jobName.trim().toLowerCase();
          if (jobName !== "" && !JOB_NAME_PATTERN.test(jobName)) {
            setNameError("작업 이름은 영문 소문자, 숫자, 하이픈으로 입력해 주세요.");
            return;
          }
          setNameError(undefined);
          setApplied({ ...draft, jobName });
          paging.resetPage();
        }}
        onReset={() => {
          setNameError(undefined);
          setDraft(EMPTY_FILTERS);
          setApplied(EMPTY_FILTERS);
          paging.resetPage();
        }}
      >
        <TextField
          label="작업 이름"
          value={draft.jobName}
          error={nameError}
          onValueChange={(jobName) => setDraft((current) => ({ ...current, jobName }))}
        />
        <SelectField
          label="결과"
          value={draft.status}
          options={JOB_STATUS_OPTIONS}
          onValueChange={(status) => setDraft((current) => ({ ...current, status }))}
        />
        <TextField
          label="사무소 번호"
          kind="number"
          value={draft.officeId}
          onValueChange={(officeId) => setDraft((current) => ({ ...current, officeId }))}
        />
      </OpsFilterBar>
      <OpsTable
        caption="시스템 작업 실행 이력"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.runId)}
        emptyMessage="조건에 맞는 작업 실행이 없습니다."
        columns={[
          { key: "runId", header: "작업 ID", render: (row) => row.runId },
          { key: "jobName", header: "작업 이름", render: (row) => row.jobName },
          { key: "office", header: "사무소", render: (row) => row.officeName ?? "-" },
          {
            key: "scheduled",
            header: "예약 시각",
            render: (row) => (row.scheduledAt ? formatSeoulDateTime(row.scheduledAt) : "-"),
          },
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
            key: "status",
            header: "결과",
            render: (row) => <OpsStatusBadge status={row.status} map={JOB_STATUS} />,
          },
          { key: "attempt", header: "시도 횟수", render: (row) => `${row.attemptCount}회` },
          { key: "error", header: "오류 코드", render: (row) => row.errorCode ?? "-" },
          {
            key: "next",
            header: "다음 실행",
            render: (row) => (row.nextRunAt ? formatSeoulDateTime(row.nextRunAt) : "-"),
          },
          { key: "assignee", header: "담당자", render: (row) => row.assignedOperatorName ?? "-" },
          {
            key: "rerun",
            header: "재실행",
            render: (row) => {
              const block = rerunBlock(row, session.roles);
              return (
                <div className="flex flex-col gap-1">
                  <Button
                    variant="outlined"
                    size="sm"
                    disabled={block !== null}
                    aria-label={`실행 ${row.runId} 재실행`}
                    onClick={() => setTarget(row)}
                  >
                    재실행
                  </Button>
                  {block ? (
                    <span className="text-caption text-ink-2">{RERUN_BLOCK_MESSAGE[block]}</span>
                  ) : null}
                </div>
              );
            },
          },
        ]}
      />
      <ConfirmDialog
        isOpen={target !== null}
        title="작업을 다시 실행할까요?"
        message={
          target
            ? `${target.jobName} 실행 ${target.runId}를 원래 멱등키로 다시 실행합니다. 처리 내용은 감사 로그에 기록됩니다.`
            : ""
        }
        confirmLabel="재실행"
        onConfirm={() => void confirmRerun()}
        onCancel={() => setTarget(null)}
      />
    </>
  );
}

export function SystemJobsScreen() {
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  return (
    <OpsScreen
      title="시스템 작업"
      description="결제, 알림, 이전, 내보내기, 파기, 백업 작업의 실행 이력을 확인하고 실패한 실행을 다시 실행합니다."
      roles={["OPS"]}
    >
      <p className="text-caption text-ink-2">
        재실행은 현재 상태와 원래 멱등키, 작업 종류별 역할을 서버가 다시 검사합니다. 이미 성공했거나
        진행 중인 실행은 거절됩니다.
      </p>
      <RoleTable />
      {feedback ? (
        <FormMessage tone={feedback.isError ? "error" : "success"}>{feedback.message}</FormMessage>
      ) : null}
      <JobTable onFeedback={(message, isError) => setFeedback({ message, isError })} />
    </OpsScreen>
  );
}
