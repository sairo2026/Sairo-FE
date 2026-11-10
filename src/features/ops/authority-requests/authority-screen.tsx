"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Checkbox, SelectField } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { useOpsSession } from "../model/ops-session";
import { DateTimePair, DraftNotice, FormMessage } from "../system-common/system-fields";
import { describeSystemError } from "../system-common/system-form";
import { AuthorityCloseDialog } from "./authority-close-dialog";
import { useAuthorityRequests, useCreateAuthorityRequest } from "./authority-api";
import {
  AGENCY_LABELS,
  AGENCY_NAME_MAX,
  AGENCY_OPTIONS,
  DECISION_FILTER_OPTIONS,
  DECISION_STATUS,
  DOCUMENT_REF_MAX,
  EMPTY_AUTHORITY_CREATE,
  NOTICE_STATUS,
  toAuthorityCreateBody,
  validateAuthorityCreate,
} from "./authority-model";
import type {
  AuthorityCreateErrors,
  AuthorityCreateInput,
  AuthorityRecord,
  AuthorityRow,
} from "./authority-model";

function CreateForm({ onCreated }: { onCreated: (record: AuthorityRecord) => void }) {
  const [input, setInput] = useState<AuthorityCreateInput>(EMPTY_AUTHORITY_CREATE);
  const [errors, setErrors] = useState<AuthorityCreateErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const create = useCreateAuthorityRequest();
  const set = (patch: Partial<AuthorityCreateInput>) =>
    setInput((current) => ({ ...current, ...patch }));

  async function submit() {
    const found = validateAuthorityCreate(input);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;
    try {
      const record = await create.mutateAsync(toAuthorityCreateBody(input));
      setInput(EMPTY_AUTHORITY_CREATE);
      onCreated(record);
    } catch (caught) {
      setServerError(describeSystemError(caught, "요청을 기록하지 못했습니다."));
    }
  }

  return (
    <Card title="자료 요청 기록" tone="flat">
      <form
        noValidate
        aria-label="자료 요청 기록"
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <DateTimePair
          label="요청을 받은 시각"
          date={input.receivedDate}
          time={input.receivedTime}
          onDateChange={(receivedDate) => set({ receivedDate })}
          onTimeChange={(receivedTime) => set({ receivedTime })}
          error={errors.receivedDate}
        />
        <SelectField
          label="기관 종류"
          required
          value={input.agencyType}
          options={AGENCY_OPTIONS}
          onValueChange={(agencyType) => set({ agencyType })}
          error={errors.agencyType}
        />
        <TextField
          label="기관 이름"
          required
          maxLength={AGENCY_NAME_MAX}
          value={input.agencyName}
          onValueChange={(agencyName) => set({ agencyName })}
          error={errors.agencyName}
        />
        <TextField
          label="문서 번호"
          maxLength={DOCUMENT_REF_MAX}
          value={input.documentReference}
          onValueChange={(documentReference) => set({ documentReference })}
          error={errors.documentReference}
        />
        <TextAreaField
          label="법적 근거 메모"
          rows={2}
          value={input.legalBasisNote}
          onValueChange={(legalBasisNote) => set({ legalBasisNote })}
          error={errors.legalBasisNote}
          hint="조항을 모르면 검토 대상 법령 이름만 적습니다."
        />
        <TextField
          label="대상 사무소 번호"
          kind="number"
          value={input.targetOfficeId}
          onValueChange={(targetOfficeId) => set({ targetOfficeId })}
          error={errors.targetOfficeId}
        />
        <TextField
          label="대상 회원 번호"
          kind="number"
          value={input.targetUserId}
          onValueChange={(targetUserId) => set({ targetUserId })}
          error={errors.targetUserId}
        />
        <TextAreaField
          label="요청 범위"
          rows={2}
          value={input.requestedItems}
          onValueChange={(requestedItems) => set({ requestedItems })}
          error={errors.requestedItems}
        />
        {serverError ? <FormMessage tone="error">{serverError}</FormMessage> : null}
        <div>
          <Button type="submit" variant="submit" isLoading={create.isPending}>
            요청 기록
          </Button>
        </div>
      </form>
    </Card>
  );
}

type Filters = { decision: string; open: boolean };

function AuthorityBody() {
  const session = useOpsSession();
  const [draft, setDraft] = useState<Filters>({ decision: "", open: false });
  const [applied, setApplied] = useState<Filters>({ decision: "", open: false });
  const [closing, setClosing] = useState<AuthorityRow | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [recorders, setRecorders] = useState<Record<number, number>>({});
  const [selfBlocked, setSelfBlocked] = useState<readonly number[]>([]);
  const [retention, setRetention] = useState<Record<number, string | null>>({});
  const paging = useOpsPaging();
  const query = useAuthorityRequests({
    decision: applied.decision,
    open: applied.open ? true : undefined,
    page: paging.page,
    size: paging.size,
  });

  function isSelfRecorded(requestId: number): boolean {
    return selfBlocked.includes(requestId) || recorders[requestId] === session.operatorId;
  }

  return (
    <>
      <p className="text-caption text-ink-2">
        수사기관 등 외부 기관의 자료 요청을 기록하고 제공 여부를 결정합니다. 제공 결정은 기록자와
        다른 보안관리자만 종결할 수 있고 모든 처리는 감사 로그에 남습니다.
      </p>
      <DraftNotice extra="출시 후 확장 기능입니다." />
      <CreateForm
        onCreated={(record) => {
          setRecorders((current) => ({
            ...current,
            [record.requestId]: record.recordedByOperatorId,
          }));
          setFeedback(`요청 ${record.requestId}를 기록했습니다.`);
        }}
      />
      {feedback ? <FormMessage tone="success">{feedback}</FormMessage> : null}
      <OpsFilterBar
        label="자료 요청 조회"
        onApply={() => {
          setApplied(draft);
          paging.resetPage();
        }}
        onReset={() => {
          setDraft({ decision: "", open: false });
          setApplied({ decision: "", open: false });
          paging.resetPage();
        }}
      >
        <SelectField
          label="제공 결정"
          value={draft.decision}
          options={DECISION_FILTER_OPTIONS}
          onValueChange={(decision) => setDraft((current) => ({ ...current, decision }))}
        />
        <Checkbox
          label="미종결만"
          checked={draft.open}
          onCheckedChange={(open) => setDraft((current) => ({ ...current, open }))}
        />
      </OpsFilterBar>
      <OpsTable
        caption="자료 요청 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.requestId)}
        emptyMessage="기록된 자료 요청이 없습니다."
        columns={[
          { key: "id", header: "요청 번호", render: (row) => row.requestId },
          {
            key: "received",
            header: "접수 시각",
            render: (row) => formatSeoulDateTime(row.receivedAt),
          },
          {
            key: "type",
            header: "기관 종류",
            render: (row) => AGENCY_LABELS[row.agencyType] ?? row.agencyType,
          },
          { key: "name", header: "기관 이름", render: (row) => row.agencyName },
          { key: "doc", header: "문서 번호", render: (row) => row.documentReference ?? "-" },
          {
            key: "decision",
            header: "제공 결정",
            render: (row) => <OpsStatusBadge status={row.decision} map={DECISION_STATUS} />,
          },
          {
            key: "notice",
            header: "사무소 통지 검토",
            render: (row) => <OpsStatusBadge status={row.officeNoticeStatus} map={NOTICE_STATUS} />,
          },
          {
            key: "closed",
            header: "종결 시각",
            render: (row) => (row.closedAt ? formatSeoulDateTime(row.closedAt) : "미종결"),
          },
          {
            key: "retention",
            header: "삭제 예정일",
            render: (row) => {
              const until = retention[row.requestId];
              return until ? formatSeoulDate(until) : "-";
            },
          },
          {
            key: "close",
            header: "종결",
            render: (row) => (
              <Button
                variant="outlined"
                size="sm"
                disabled={row.closedAt !== null}
                aria-label={`요청 ${row.requestId} 종결`}
                onClick={() => {
                  setFeedback(null);
                  setClosing(row);
                }}
              >
                종결
              </Button>
            ),
          },
        ]}
      />
      {closing ? (
        <AuthorityCloseDialog
          key={closing.requestId}
          row={closing}
          isSelfRecorded={isSelfRecorded(closing.requestId)}
          onSelfForbidden={() => setSelfBlocked((current) => [...current, closing.requestId])}
          onClose={() => setClosing(null)}
          onClosed={(record) => {
            setClosing(null);
            setRetention((current) => ({ ...current, [record.requestId]: record.retentionUntil }));
            setFeedback(
              record.retentionUntil
                ? `요청 ${record.requestId}를 종결했습니다. 기록 삭제 예정일은 ${formatSeoulDate(record.retentionUntil)}입니다.`
                : `요청 ${record.requestId}를 종결했습니다.`,
            );
          }}
        />
      ) : null}
    </>
  );
}

export function AuthorityRequestsScreen() {
  return (
    <OpsScreen
      title="수사기관 요청 기록"
      description="외부 기관의 자료 요청과 제공 결정을 기록합니다."
      roles={["PRIVACY"]}
    >
      <AuthorityBody />
    </OpsScreen>
  );
}
