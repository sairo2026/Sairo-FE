"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { markFollowupSubmitted } from "../api/contract-extra.api";
import { contractExtraKeys, useFollowups } from "../hooks/contract-queries";
import { FOLLOWUP_TYPE_LABEL, labelOf } from "../model/labels";
import { describeContractError } from "../model/messages";
import { ContractSubScreen } from "./contract-sub-screen";

function FollowupList({ contractId }: { contractId: number }) {
  const queryClient = useQueryClient();
  const { isReadOnly } = useOfficeAccess();
  const query = useFollowups(contractId);
  const [error, setError] = useState<string>();
  const submit = useMutation({
    mutationFn: (input: { taskId: number; version: number }) =>
      markFollowupSubmitted(input.taskId, input.version),
    onSuccess: async () => {
      setError(undefined);
      await queryClient.invalidateQueries({ queryKey: contractExtraKeys.followups(contractId) });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
    },
    onError: (failure) => setError(describeContractError(failure, "제출 처리하지 못했습니다.")),
  });

  return (
    <div className="flex flex-col gap-4">
      <FormNotice>
        이 화면에는 서류·신고 후속업무만 보입니다. 잔금일과 만기일에 맞춰 만들어진 할 일은{" "}
        <Link href="/tasks" className="font-semibold underline">
          업무 목록
        </Link>
        에서 확인합니다. 제출 여부만 기록하며 자동 신고는 하지 않습니다.
      </FormNotice>
      {error ? <FormAlert>{error}</FormAlert> : null}
      <QueryGate query={query} loadingLabel="후속업무를 불러오는 중입니다.">
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState
              title="후속업무가 없습니다."
              description="임대 만기 90일 안에 들어오는 전세·월세 계약에 자동으로 만들어집니다."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {data.items.map((task) => (
                <li
                  key={task.taskId}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-card-flat border border-line px-5 py-4"
                >
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <span className="text-body font-semibold text-ink">
                        {labelOf(FOLLOWUP_TYPE_LABEL, task.taskType)}
                      </span>
                      <Badge
                        tone={task.submitted ? "green" : "amber"}
                        className="h-7 min-w-0 px-3 text-caption"
                      >
                        {task.submitted ? "제출 완료" : "미제출"}
                      </Badge>
                    </span>
                    <span className="text-caption text-ink-2">
                      신고 대상 {task.reportTarget ?? "-"} · 근거 {task.reportBasis ?? "-"}
                    </span>
                    <span className="text-caption text-ink-2">
                      기한 {task.targetDate ? formatSeoulDate(task.targetDate) : ""}
                      {task.submittedAt ? ` · 제출 ${formatSeoulDateTime(task.submittedAt)}` : ""}
                    </span>
                  </div>
                  {task.submitted ? null : (
                    <Button
                      variant="outlined"
                      isLoading={submit.isPending && submit.variables?.taskId === task.taskId}
                      disabled={isReadOnly || submit.isPending}
                      onClick={() => submit.mutate({ taskId: task.taskId, version: task.version })}
                      aria-label={`${labelOf(FOLLOWUP_TYPE_LABEL, task.taskType)} 제출 처리`}
                    >
                      제출 처리
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )
        }
      </QueryGate>
    </div>
  );
}

export function FollowupScreen({ contractId }: { contractId: number }) {
  return (
    <ContractSubScreen
      contractId={contractId}
      active="followups"
      title="후속업무·신고 확인"
      description="계약 이후 서류 교부와 신고 기한을 관리합니다."
    >
      {() => <FollowupList contractId={contractId} />}
    </ContractSubScreen>
  );
}
