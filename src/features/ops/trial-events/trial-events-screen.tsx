"use client";

import Link from "next/link";
import { useState } from "react";
import type { OpsTrialEventCreateResponse } from "@/lib/api/contracts/ops.schema";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Checkbox, RadioGroup } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsDetailList } from "../components/common/ops-detail-list";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { ActionDialog } from "../content-common/action-dialog";
import { FailureNotice, SuccessNotice } from "../content-common/notice-banner";
import { SeoulDateTimeInput } from "../content-common/seoul-date-time-input";
import { useHasOpsRole } from "../model/ops-session";
import { useTrialActions, useTrialList, useTrialPreview } from "./trial-api";
import {
  AUDIENCE_LABELS,
  AUDIENCE_OPTIONS,
  EMPTY_TRIAL_FORM,
  FREE_END_MODE_LABELS,
  FREE_END_MODE_OPTIONS,
  NAME_MAX,
  STOP_NOTICE_TEXT,
  TRIAL_RULE_TEXTS,
  TRIAL_STATUS,
  describeTrialError,
  toTrialRequest,
  validateTrialForm,
} from "./trial-model";
import type { TrialErrors, TrialEventItem, TrialForm } from "./trial-model";

function CreateResult({ result }: { result: OpsTrialEventCreateResponse }) {
  return (
    <div role="status" className="flex flex-col gap-3 rounded-card-flat border border-line p-4">
      <p className="text-body font-semibold text-ink">
        {result.name} 이벤트를 등록했습니다. 작성자와 다른 운영담당의 승인이 필요합니다.
      </p>
      <OpsDetailList
        items={[
          { label: "대상", value: AUDIENCE_LABELS[result.audience] ?? result.audience },
          {
            label: "기간",
            value: `${formatSeoulDateTime(result.startsAt)} ~ ${formatSeoulDateTime(result.endsAt)}`,
          },
          {
            label: "무료 종료 방식",
            value: FREE_END_MODE_LABELS[result.freeEndMode] ?? result.freeEndMode,
          },
          {
            label: "고정 무료 종료 시각",
            value: result.fixedFreeEndsAt ? formatSeoulDateTime(result.fixedFreeEndsAt) : null,
          },
          {
            label: "승인 사무소 상한",
            value: result.maxOffices ? `${result.maxOffices.toLocaleString("ko-KR")}곳` : null,
          },
        ]}
      />
    </div>
  );
}

function CreateCard() {
  const { create } = useTrialActions();
  const [form, setForm] = useState<TrialForm>(EMPTY_TRIAL_FORM);
  const [errors, setErrors] = useState<TrialErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [result, setResult] = useState<OpsTrialEventCreateResponse | null>(null);

  function patch(next: Partial<TrialForm>) {
    setForm({ ...form, ...next });
  }

  async function submit() {
    setFailure(null);
    setResult(null);
    const found = validateTrialForm(form);
    setErrors(found);
    const body = toTrialRequest(form);
    if (Object.keys(found).length > 0 || body === null) return;
    try {
      setResult(await create.mutateAsync(body));
      setForm(EMPTY_TRIAL_FORM);
    } catch (caught) {
      setFailure(describeTrialError(caught, "이벤트를 등록하지 못했습니다."));
    }
  }

  return (
    <Card title="체험 이벤트 등록">
      <div className="flex flex-col gap-4">
        <ul className="list-disc pl-5 text-caption text-ink-2">
          {TRIAL_RULE_TEXTS.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
        <TextField
          label="이벤트명"
          value={form.name}
          error={errors.name}
          hint={`${form.name.trim().length}/${NAME_MAX}자`}
          onValueChange={(name) => patch({ name })}
        />
        <RadioGroup
          legend="이벤트 대상"
          name="trial-audience"
          value={form.audience}
          options={AUDIENCE_OPTIONS}
          onValueChange={(audience) => patch({ audience })}
        />
        {form.audience === "START_CUSTOMER" ? (
          <TextField
            label="승인 사무소 상한"
            kind="number"
            value={form.maxOffices}
            error={errors.maxOffices}
            onValueChange={(maxOffices) => patch({ maxOffices })}
          />
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <SeoulDateTimeInput
            label="시작"
            value={form.startsAt}
            error={errors.startsAt}
            onChange={(startsAt) => patch({ startsAt })}
          />
          <SeoulDateTimeInput
            label="종료"
            value={form.endsAt}
            error={errors.endsAt}
            onChange={(endsAt) => patch({ endsAt })}
          />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-caption font-semibold text-ink">대상 조건</legend>
          <Checkbox
            label="기간 안에 사무소를 만든 경우만 대상으로 합니다"
            checked={form.officeCreatedDuring}
            onCheckedChange={(officeCreatedDuring) => patch({ officeCreatedDuring })}
          />
          <Checkbox
            label="기간 안에 처음 인증을 신청한 경우만 대상으로 합니다"
            checked={form.firstApplicationDuring}
            onCheckedChange={(firstApplicationDuring) => patch({ firstApplicationDuring })}
          />
        </fieldset>
        <RadioGroup
          legend="무료 종료 방식"
          name="trial-free-end"
          value={form.freeEndMode}
          options={FREE_END_MODE_OPTIONS}
          onValueChange={(freeEndMode) => patch({ freeEndMode })}
        />
        {form.freeEndMode === "FIXED_END" ? (
          <SeoulDateTimeInput
            label="고정 무료 종료"
            value={form.fixedFreeEndsAt}
            error={errors.fixedFreeEndsAt}
            onChange={(fixedFreeEndsAt) => patch({ fixedFreeEndsAt })}
          />
        ) : null}
        <FailureNotice message={failure} />
        <div>
          <Button isLoading={create.isPending} onClick={() => void submit()}>
            이벤트 등록
          </Button>
        </div>
        {result ? <CreateResult result={result} /> : null}
      </div>
    </Card>
  );
}

function PreviewBody({ eventId }: { eventId: number }) {
  const query = useTrialPreview(eventId);
  if (query.isPending) return <p role="status">대상을 계산하는 중입니다.</p>;
  if (query.isError) {
    return (
      <div className="flex flex-col gap-2">
        <p role="alert" className="text-danger">
          대상 미리보기를 불러오지 못했습니다.
        </p>
        <div>
          <Button variant="outlined" size="sm" onClick={() => void query.refetch()}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }
  const data = query.data;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body text-ink">
        대상 사무소 {data.targetOfficeCount.toLocaleString("ko-KR")}곳
      </p>
      <p className="text-body text-ink">
        중복 수혜 {data.duplicateBenefitCount.toLocaleString("ko-KR")}곳
      </p>
      {data.duplicateOffices.length > 0 ? (
        <ul aria-label="중복 수혜 사무소" className="text-caption text-ink-2">
          {data.duplicateOffices.map((office) => (
            <li key={office.officeId}>
              {office.officeName} ({office.officeId})
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-caption text-ink-2">중복 수혜가 없습니다.</p>
      )}
    </div>
  );
}

type Dialog = { kind: "preview" | "approve" | "stop"; item: TrialEventItem } | null;

export function TrialEventsScreen() {
  const paging = useOpsPaging();
  const query = useTrialList({ page: paging.page, size: paging.size });
  const actions = useTrialActions();
  const canSeePrice = useHasOpsRole(["BILLING"]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const close = () => setDialog(null);

  return (
    <OpsScreen
      title="체험 이벤트"
      description="무료체험 이벤트의 기간과 대상, 승인 상태, 무료 종료 방식을 관리합니다."
      roles={["OPS"]}
    >
      <SuccessNotice message={notice} />
      {canSeePrice ? (
        <p className="text-caption text-ink-2">
          요금표 설정은 <Link href="/ops/price-schedules">요금표</Link>에서 합니다.
        </p>
      ) : null}
      <CreateCard />
      <OpsTable
        caption="체험 이벤트 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.eventId)}
        emptyMessage="등록된 체험 이벤트가 없습니다."
        columns={[
          { key: "name", header: "이벤트명", render: (row) => row.name },
          {
            key: "audience",
            header: "대상",
            render: (row) => AUDIENCE_LABELS[row.audience] ?? row.audience,
          },
          {
            key: "period",
            header: "기간",
            render: (row) =>
              `${formatSeoulDateTime(row.startsAt)} ~ ${formatSeoulDateTime(row.endsAt)}`,
          },
          {
            key: "condition",
            header: "대상 조건",
            render: (row) =>
              [
                row.officeCreatedDuring ? "기간 내 사무소 생성" : null,
                row.firstApplicationDuring ? "기간 내 최초 인증 신청" : null,
              ]
                .filter((text) => text !== null)
                .join(", ") || "조건 없음",
          },
          {
            key: "freeEnd",
            header: "무료 종료 방식",
            render: (row) =>
              row.freeEndMode === "FIXED_END" && row.fixedFreeEndsAt
                ? `${FREE_END_MODE_LABELS.FIXED_END} (${formatSeoulDateTime(row.fixedFreeEndsAt)})`
                : (FREE_END_MODE_LABELS[row.freeEndMode] ?? row.freeEndMode),
          },
          {
            key: "max",
            header: "상한",
            render: (row) => (row.maxOffices ? `${row.maxOffices.toLocaleString("ko-KR")}곳` : "-"),
          },
          {
            key: "status",
            header: "상태",
            render: (row) => <OpsStatusBadge status={row.status} map={TRIAL_STATUS} />,
          },
          {
            key: "approver",
            header: "승인자",
            render: (row) =>
              row.approvedByOperatorId === null ? "-" : `운영자 ${row.approvedByOperatorId}`,
          },
          {
            key: "actions",
            header: "처리",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`${row.name} 대상 미리보기`}
                  onClick={() => setDialog({ kind: "preview", item: row })}
                >
                  대상 미리보기
                </Button>
                {row.status === "REVIEW" ? (
                  <Button
                    size="sm"
                    aria-label={`${row.name} 승인`}
                    onClick={() => setDialog({ kind: "approve", item: row })}
                  >
                    승인
                  </Button>
                ) : null}
                {row.status === "SCHEDULED" || row.status === "ACTIVE" ? (
                  <Button
                    variant="cancel"
                    size="sm"
                    aria-label={`${row.name} 중단`}
                    onClick={() => setDialog({ kind: "stop", item: row })}
                  >
                    중단
                  </Button>
                ) : null}
              </div>
            ),
          },
        ]}
      />
      {dialog?.kind === "preview" ? (
        <ActionDialog isOpen title={`${dialog.item.name} 대상 미리보기`} onClose={close}>
          <PreviewBody eventId={dialog.item.eventId} />
        </ActionDialog>
      ) : null}
      {dialog?.kind === "approve" ? (
        <ActionDialog
          isOpen
          title="이벤트 승인"
          confirmLabel="승인"
          describeError={(caught) => describeTrialError(caught, "이벤트를 승인하지 못했습니다.")}
          onClose={close}
          onConfirm={async () => {
            const result = await actions.approve.mutateAsync(dialog.item.eventId);
            setNotice(
              result.status === "ACTIVE"
                ? `${dialog.item.name} 이벤트를 승인했습니다. 지금 진행 중입니다.`
                : `${dialog.item.name} 이벤트를 승인했습니다. 시작 시각에 맞춰 예약됩니다.`,
            );
          }}
        >
          <p>
            작성자와 다른 운영담당만 승인할 수 있습니다. 승인한 운영자가 승인자로 기록됩니다. 대상
            미리보기와 중복 수혜 검사를 확인한 뒤 승인해 주세요.
          </p>
        </ActionDialog>
      ) : null}
      {dialog?.kind === "stop" ? (
        <ActionDialog
          isOpen
          title="이벤트 중단"
          confirmLabel="중단"
          describeError={(caught) => describeTrialError(caught, "이벤트를 중단하지 못했습니다.")}
          onClose={close}
          onConfirm={async () => {
            await actions.stop.mutateAsync(dialog.item.eventId);
            setNotice(`${dialog.item.name} 이벤트를 중단했습니다.`);
          }}
        >
          <p>{STOP_NOTICE_TEXT}</p>
        </ActionDialog>
      ) : null}
    </OpsScreen>
  );
}
