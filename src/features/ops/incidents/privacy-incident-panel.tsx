"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsReasonDialog } from "../components/common/ops-reason-dialog";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { DateTimePair, FormMessage } from "../system-common/system-fields";
import { describeSystemError } from "../system-common/system-form";
import {
  useAddPrivacyEvidence,
  useCreatePrivacyIncident,
  usePrivacyIncidents,
} from "./incidents-api";
import {
  EMPTY_PRIVACY_CREATE,
  toPrivacyCreateBody,
  validatePrivacyCreate,
} from "./incidents-model";
import type { PrivacyCreateErrors, PrivacyCreateInput, PrivacyIncident } from "./incidents-model";

function CreatePrivacyForm({ onDone }: { onDone: (message: string) => void }) {
  const [input, setInput] = useState<PrivacyCreateInput>(EMPTY_PRIVACY_CREATE);
  const [errors, setErrors] = useState<PrivacyCreateErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const create = useCreatePrivacyIncident();
  const set = (patch: Partial<PrivacyCreateInput>) =>
    setInput((current) => ({ ...current, ...patch }));

  async function submit() {
    const found = validatePrivacyCreate(input);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;
    try {
      const created = await create.mutateAsync(toPrivacyCreateBody(input));
      setInput(EMPTY_PRIVACY_CREATE);
      onDone(
        `개인정보 사고 ${created.privacyIncidentId}를 등록했습니다. 담당자는 등록한 운영자(${created.assignedOperatorId})로 지정됩니다.`,
      );
    } catch (caught) {
      setServerError(describeSystemError(caught, "개인정보 사고를 등록하지 못했습니다."));
    }
  }

  return (
    <Card title="개인정보 사고 등록" tone="flat">
      <form
        noValidate
        aria-label="개인정보 사고 등록"
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="text-caption text-ink-2">
          담당자는 등록하는 운영자로 자동 지정되고 직접 고를 수 없습니다. 조치 증빙은 등록한 뒤에
          따로 추가합니다. 장애 하나에 사고는 한 건만 연결합니다.
        </p>
        <TextField
          label="연결할 장애 번호"
          kind="number"
          required
          value={input.incidentLogId}
          onValueChange={(incidentLogId) => set({ incidentLogId })}
          error={errors.incidentLogId}
        />
        <TextAreaField
          label="사고 대상과 범위"
          rows={2}
          value={input.affectedScope}
          onValueChange={(affectedScope) => set({ affectedScope })}
          error={errors.affectedScope}
        />
        <TextAreaField
          label="신고 요건 판단"
          rows={2}
          value={input.reportRequirement}
          onValueChange={(reportRequirement) => set({ reportRequirement })}
          error={errors.reportRequirement}
        />
        <TextAreaField
          label="통지 요건 판단"
          rows={2}
          value={input.noticeRequirement}
          onValueChange={(noticeRequirement) => set({ noticeRequirement })}
          error={errors.noticeRequirement}
        />
        <DateTimePair
          label="신고 기한"
          date={input.reportDueDate}
          time={input.reportDueTime}
          onDateChange={(reportDueDate) => set({ reportDueDate })}
          onTimeChange={(reportDueTime) => set({ reportDueTime })}
          error={errors.reportDueDate}
        />
        <DateTimePair
          label="통지 기한"
          date={input.noticeDueDate}
          time={input.noticeDueTime}
          onDateChange={(noticeDueDate) => set({ noticeDueDate })}
          onTimeChange={(noticeDueTime) => set({ noticeDueTime })}
          error={errors.noticeDueDate}
        />
        {serverError ? <FormMessage tone="error">{serverError}</FormMessage> : null}
        <div>
          <Button type="submit" variant="submit" isLoading={create.isPending}>
            사고 등록
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function PrivacyIncidentPanel() {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [target, setTarget] = useState<PrivacyIncident | null>(null);
  const paging = useOpsPaging();
  const query = usePrivacyIncidents({ page: paging.page, size: paging.size }, true);
  const addEvidence = useAddPrivacyEvidence();

  return (
    <div className="flex flex-col gap-6">
      <p className="rounded-card-flat border border-line bg-surface px-4 py-3 text-caption text-ink-2">
        개인정보 사고는 대상, 신고·통지 요건, 기한, 증빙을 제한 권한으로 따로 보관합니다.
        개인정보담당 역할 운영자만 볼 수 있고 처리 내용은 감사 로그에 남습니다.
      </p>
      <CreatePrivacyForm onDone={setFeedback} />
      {feedback ? <FormMessage tone="success">{feedback}</FormMessage> : null}
      <OpsTable
        caption="개인정보 사고 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.privacyIncidentId)}
        emptyMessage="등록된 개인정보 사고가 없습니다."
        columns={[
          { key: "id", header: "사고 번호", render: (row) => row.privacyIncidentId },
          { key: "incident", header: "연결 장애", render: (row) => row.incidentLogId },
          { key: "scope", header: "대상과 범위", render: (row) => row.affectedScope },
          { key: "report", header: "신고 요건", render: (row) => row.reportRequirement },
          { key: "notice", header: "통지 요건", render: (row) => row.noticeRequirement },
          {
            key: "reportDue",
            header: "신고 기한",
            render: (row) => (row.reportDueAt ? formatSeoulDateTime(row.reportDueAt) : "-"),
          },
          {
            key: "noticeDue",
            header: "통지 기한",
            render: (row) => (row.noticeDueAt ? formatSeoulDateTime(row.noticeDueAt) : "-"),
          },
          {
            key: "evidence",
            header: "조치 증빙",
            render: (row) => row.responseEvidence ?? "증빙 미등록",
          },
          { key: "assignee", header: "담당", render: (row) => `운영자 ${row.assignedOperatorId}` },
          {
            key: "createdAt",
            header: "등록 시각",
            render: (row) => formatSeoulDateTime(row.createdAt),
          },
          {
            key: "action",
            header: "증빙",
            render: (row) => (
              <Button
                variant="outlined"
                size="sm"
                aria-label={`사고 ${row.privacyIncidentId} 증빙 추가`}
                onClick={() => {
                  setFeedback(null);
                  setTarget(row);
                }}
              >
                증빙 추가
              </Button>
            ),
          },
        ]}
      />
      <OpsReasonDialog
        key={target?.privacyIncidentId ?? "closed"}
        isOpen={target !== null}
        title="조치 증빙 추가"
        description="증빙 원문이 아니라 신고·통지·조치 증빙의 보관 위치를 적어 주세요. 처리 내용은 감사 로그에 남습니다."
        reasonLabel="증빙 보관 위치"
        confirmLabel="증빙 저장"
        onSubmit={async (value) => {
          if (!target) return;
          await addEvidence.mutateAsync({
            privacyIncidentId: target.privacyIncidentId,
            responseEvidence: value,
          });
          setFeedback(`사고 ${target.privacyIncidentId}의 조치 증빙을 저장했습니다.`);
        }}
        onClose={() => setTarget(null)}
      />
    </div>
  );
}
