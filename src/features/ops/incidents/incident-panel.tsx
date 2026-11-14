"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OperatorSelect } from "../components/common/operator-select";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { DateTimePair, FormMessage } from "../system-common/system-fields";
import { describeSystemError } from "../system-common/system-form";
import { IncidentUpdateDialog } from "./incident-update-dialog";
import { useCreateIncident, useIncidents } from "./incidents-api";
import {
  EMPTY_INCIDENT_CREATE,
  INCIDENT_STATUS,
  INCIDENT_STATUS_OPTIONS,
  TITLE_MAX,
  toIncidentCreateBody,
  validateIncidentCreate,
} from "./incidents-model";
import type { Incident, IncidentCreateErrors, IncidentCreateInput } from "./incidents-model";

function CreateIncidentForm({ onDone }: { onDone: (message: string) => void }) {
  const [input, setInput] = useState<IncidentCreateInput>(EMPTY_INCIDENT_CREATE);
  const [errors, setErrors] = useState<IncidentCreateErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const create = useCreateIncident();
  const set = (patch: Partial<IncidentCreateInput>) =>
    setInput((current) => ({ ...current, ...patch }));

  async function submit() {
    const found = validateIncidentCreate(input);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;
    try {
      const created = await create.mutateAsync(toIncidentCreateBody(input));
      setInput(EMPTY_INCIDENT_CREATE);
      onDone(`장애 ${created.incidentId}를 감지 단계로 등록했습니다.`);
    } catch (caught) {
      setServerError(describeSystemError(caught, "장애를 등록하지 못했습니다."));
    }
  }

  return (
    <Card title="장애 등록" tone="flat">
      <form
        noValidate
        aria-label="장애 등록"
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="text-caption text-ink-2">
          등록하면 상태는 감지로 시작하고 감지 일시는 서버 시각으로 기록됩니다.
        </p>
        <TextField
          label="장애 제목"
          required
          maxLength={TITLE_MAX}
          value={input.title}
          onValueChange={(title) => set({ title })}
          error={errors.title}
        />
        <TextField
          label="영향 서비스"
          required
          value={input.services}
          onValueChange={(services) => set({ services })}
          error={errors.services}
          hint="서비스 코드를 쉼표로 구분해 입력합니다. 예: BILLING, API"
        />
        <TextField
          label="영향 사무소 번호"
          value={input.officeIds}
          onValueChange={(officeIds) => set({ officeIds })}
          error={errors.officeIds}
          hint="전체 사무소가 영향을 받으면 비워 둡니다. 여러 곳은 쉼표로 구분합니다."
        />
        <DateTimePair
          label="장애 시작 시각"
          date={input.startedDate}
          time={input.startedTime}
          onDateChange={(startedDate) => set({ startedDate })}
          onTimeChange={(startedTime) => set({ startedTime })}
          error={errors.startedDate}
        />
        <OperatorSelect
          label="담당 운영자"
          value={input.assignedOperatorId}
          onValueChange={(assignedOperatorId) => set({ assignedOperatorId })}
          error={errors.assignedOperatorId}
          hint="선택 입력입니다."
          emptyLabel="지정하지 않음"
        />
        <TextAreaField
          label="장애 원인"
          rows={2}
          value={input.rootCause}
          onValueChange={(rootCause) => set({ rootCause })}
          hint="선택 입력입니다. 조사 뒤 갱신할 수 있습니다."
        />
        {serverError ? <FormMessage tone="error">{serverError}</FormMessage> : null}
        <div>
          <Button type="submit" variant="submit" isLoading={create.isPending}>
            장애 등록
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function IncidentPanel() {
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState("");
  const [editing, setEditing] = useState<Incident | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const paging = useOpsPaging();
  const query = useIncidents({ status: applied, page: paging.page, size: paging.size });

  return (
    <div className="flex flex-col gap-6">
      <CreateIncidentForm onDone={setFeedback} />
      {feedback ? <FormMessage tone="success">{feedback}</FormMessage> : null}
      <OpsFilterBar
        label="장애 조회"
        onApply={() => {
          setApplied(status);
          paging.resetPage();
        }}
        onReset={() => {
          setStatus("");
          setApplied("");
          paging.resetPage();
        }}
      >
        <SelectField
          label="장애 단계"
          value={status}
          options={INCIDENT_STATUS_OPTIONS}
          onValueChange={setStatus}
        />
      </OpsFilterBar>
      <OpsTable
        caption="장애 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.incidentId)}
        emptyMessage="등록된 장애가 없습니다."
        columns={[
          { key: "id", header: "장애 번호", render: (row) => row.incidentId },
          { key: "title", header: "제목", render: (row) => row.title },
          {
            key: "status",
            header: "단계",
            render: (row) => <OpsStatusBadge status={row.status} map={INCIDENT_STATUS} />,
          },
          {
            key: "services",
            header: "영향 서비스",
            render: (row) => row.affectedServices.join(", "),
          },
          {
            key: "offices",
            header: "영향 사무소",
            render: (row) =>
              row.affectedOffices.length === 0 ? "전체 사무소" : row.affectedOffices.join(", "),
          },
          { key: "detected", header: "감지", render: (row) => formatSeoulDateTime(row.detectedAt) },
          {
            key: "started",
            header: "시작",
            render: (row) => (row.startedAt ? formatSeoulDateTime(row.startedAt) : "-"),
          },
          {
            key: "recovered",
            header: "복구",
            render: (row) => (row.recoveredAt ? formatSeoulDateTime(row.recoveredAt) : "-"),
          },
          {
            key: "closed",
            header: "종료",
            render: (row) => (row.closedAt ? formatSeoulDateTime(row.closedAt) : "-"),
          },
          {
            key: "assignee",
            header: "담당",
            render: (row) =>
              row.assignedOperatorId === null ? "미지정" : `운영자 ${row.assignedOperatorId}`,
          },
          { key: "cause", header: "원인", render: (row) => row.rootCause ?? "-" },
          { key: "actions", header: "조치", render: (row) => row.responseActions ?? "-" },
          { key: "notice", header: "고객 안내", render: (row) => row.customerNotice ?? "-" },
          { key: "prevention", header: "재발 방지", render: (row) => row.preventionTasks ?? "-" },
          {
            key: "update",
            header: "갱신",
            render: (row) => (
              <Button
                variant="outlined"
                size="sm"
                aria-label={`장애 ${row.incidentId} 갱신`}
                onClick={() => {
                  setFeedback(null);
                  setEditing(row);
                }}
              >
                갱신
              </Button>
            ),
          },
        ]}
      />
      {editing ? (
        <IncidentUpdateDialog
          key={editing.incidentId}
          incident={editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            setFeedback(message);
          }}
        />
      ) : null}
    </div>
  );
}
