"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { Checkbox, SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import type {
  OpsStartCustomerAgreementApproveResponse,
  OpsStartCustomerAgreementListResponse,
  OpsStartCustomerAgreementRevokeResponse,
} from "@/lib/api/contracts/ops.schema";
import { describeBillingError } from "../billing/billing-model";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsReasonDialog } from "../components/common/ops-reason-dialog";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { useHasOpsRole, useOpsSession } from "../model/ops-session";
import { useAgreementActions, useAgreementList } from "./agreement-api";
import { AGREEMENT_STATUS, EMPTY_FORM, validateAgreementForm } from "./agreement-model";
import type { AgreementErrors, AgreementForm } from "./agreement-model";

type Agreement = OpsStartCustomerAgreementListResponse["items"][number];
type Cohort = OpsStartCustomerAgreementListResponse["cohorts"][number];
type Filter = { status: string; trialEventId: string; officeId: string };
const EMPTY_FILTER: Filter = { status: "", trialEventId: "", officeId: "" };

const STATUS_OPTIONS = [
  { value: "", label: "전체" },
  ...Object.entries(AGREEMENT_STATUS).map(([value, entry]) => ({ value, label: entry.label })),
];

function CohortCards({ cohorts }: { cohorts: Cohort[] }) {
  if (cohorts.length === 0) return null;
  return (
    <ul aria-label="이벤트별 승인 현황" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {cohorts.map((cohort) => {
        const isFull = cohort.maxOffices !== null && cohort.approvedCount >= cohort.maxOffices;
        return (
          <li
            key={cohort.trialEventId}
            className="rounded-card-flat border border-line bg-white p-4 text-body text-ink"
          >
            <p className="font-semibold">{cohort.eventName}</p>
            <p>
              승인 {cohort.approvedCount}건 / 상한 {cohort.maxOffices ?? "없음"}건
            </p>
            <p className="text-caption text-ink-2">운영 목표 {cohort.targetCount}건</p>
            {isFull ? (
              <p role="note" className="text-caption text-danger">
                승인 상한에 도달해 더 승인할 수 없습니다.
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function RegisterCard({ cohorts }: { cohorts: Cohort[] }) {
  const { create } = useAgreementActions();
  const [form, setForm] = useState<AgreementForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<AgreementErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function set<K extends keyof AgreementForm>(key: K, value: AgreementForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailure(null);
    setSuccess(null);
    const found = validateAgreementForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      const created = await create.mutateAsync({
        officeId: Number(form.officeId),
        trialEventId: Number(form.trialEventId),
        priceScheduleId: Number(form.priceScheduleId),
        guaranteeMonths: Number(form.guaranteeMonths),
        contractedOn: form.contractedOn,
        contractReference: form.contractReference.trim(),
        weeklyUseConfirmed: form.weeklyUseConfirmed,
        monthlyInterviewConfirmed: form.monthlyInterviewConfirmed,
        casePublicationConsent: form.casePublicationConsent,
        agreementTextVersion: form.agreementTextVersion.trim(),
      });
      setSuccess(
        `합의 ${created.agreementId}를 등록했습니다. 등록만으로 무료 기간이나 가격이 바뀌지 않으며 결제담당이 승인해야 적용됩니다.`,
      );
      setForm(EMPTY_FORM);
    } catch (error) {
      setFailure(describeBillingError(error, "합의를 등록하지 못했습니다."));
    }
  }

  return (
    <Card title="시작 고객 합의 등록">
      <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="대상 사무소 ID"
            kind="number"
            value={form.officeId}
            onValueChange={(value) => set("officeId", value)}
            error={errors.officeId}
          />
          <SelectField
            label="시작 고객 이벤트"
            value={form.trialEventId}
            placeholder="이벤트를 선택해 주세요"
            options={cohorts.map((cohort) => ({
              value: String(cohort.trialEventId),
              label: cohort.eventName,
            }))}
            error={errors.trialEventId}
            onValueChange={(value) => set("trialEventId", value)}
          />
          <TextField
            label="시작 고객 가격 버전 ID"
            kind="number"
            value={form.priceScheduleId}
            onValueChange={(value) => set("priceScheduleId", value)}
            error={errors.priceScheduleId}
            hint="대상이 시작 고객인 예약·활성 가격 버전입니다."
          />
          <TextField
            label="가격 보장 개월 수"
            kind="number"
            value={form.guaranteeMonths}
            onValueChange={(value) => set("guaranteeMonths", value)}
            error={errors.guaranteeMonths}
            hint="1에서 24까지 입력합니다. 보장 기간은 서버가 계산합니다."
          />
          <DateTimeField
            label="체결일"
            kind="date"
            value={form.contractedOn}
            onValueChange={(value) => set("contractedOn", value)}
            error={errors.contractedOn}
          />
          <TextField
            label="합의서 참조번호"
            value={form.contractReference}
            onValueChange={(value) => set("contractReference", value)}
            error={errors.contractReference}
            maxLength={100}
          />
          <TextField
            label="합의서 문안 버전"
            value={form.agreementTextVersion}
            onValueChange={(value) => set("agreementTextVersion", value)}
            error={errors.agreementTextVersion}
            maxLength={20}
          />
        </div>
        <fieldset className="min-w-0 flex flex-col gap-2">
          <legend className="mb-1 text-caption font-semibold text-ink">협력 조건 확인</legend>
          <Checkbox
            label="주간 사용을 확인했습니다"
            checked={form.weeklyUseConfirmed}
            onCheckedChange={(value) => set("weeklyUseConfirmed", value)}
          />
          {errors.weeklyUseConfirmed ? (
            <p role="alert" className="text-caption text-danger">
              {errors.weeklyUseConfirmed}
            </p>
          ) : null}
          <Checkbox
            label="월 1회 피드백 인터뷰를 확인했습니다"
            checked={form.monthlyInterviewConfirmed}
            onCheckedChange={(value) => set("monthlyInterviewConfirmed", value)}
          />
          {errors.monthlyInterviewConfirmed ? (
            <p role="alert" className="text-caption text-danger">
              {errors.monthlyInterviewConfirmed}
            </p>
          ) : null}
        </fieldset>
        <Checkbox
          label="사례 공개에 동의했습니다(선택)"
          checked={form.casePublicationConsent}
          onCheckedChange={(value) => set("casePublicationConsent", value)}
        />
        <p className="text-caption text-ink-2">
          사례 공개 동의가 없어도 시작 고객 자격에는 영향이 없습니다.
        </p>
        {failure ? (
          <p role="alert" className="text-caption text-danger">
            {failure}
          </p>
        ) : null}
        {success ? (
          <p role="status" className="text-caption text-ink">
            {success}
          </p>
        ) : null}
        <div>
          <Button type="submit" isLoading={create.isPending}>
            합의 등록
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ApproveResult({ result }: { result: OpsStartCustomerAgreementApproveResponse }) {
  const subscription = result.subscription;
  return (
    <section
      role="status"
      aria-label="승인 결과"
      className="flex flex-col gap-1 rounded-card-flat border border-line bg-white p-4 text-body text-ink"
    >
      <p className="font-semibold">합의 {result.agreementId}를 승인했습니다.</p>
      <p>
        이벤트 승인 {result.cohort.approvedCount}건 / 상한 {result.cohort.maxOffices ?? "없음"}건
      </p>
      {subscription ? (
        <>
          <p>
            구독 변경 요약: 구독 {subscription.subscriptionId} 상태 {subscription.status}
          </p>
          <p>
            무료 종료{" "}
            {subscription.trialEndsAt ? formatSeoulDateTime(subscription.trialEndsAt) : "-"} · 첫
            청구 예정{" "}
            {subscription.firstBillingScheduledAt
              ? formatSeoulDateTime(subscription.firstBillingScheduledAt)
              : "-"}
          </p>
          <p>
            {subscription.promoted
              ? "무료 종료 시각을 시작 고객 이벤트 기준으로 늦췄습니다."
              : "무료 종료 시각은 바뀌지 않았습니다. 청구서가 있거나 이미 더 늦은 경우입니다."}
          </p>
        </>
      ) : (
        <p>구독 변경 요약: 사무소 구독이 아직 없어 변경된 구독이 없습니다.</p>
      )}
    </section>
  );
}

export function AgreementsScreen() {
  const session = useOpsSession();
  const canRegister = useHasOpsRole(["OPS"]);
  const canApprove = useHasOpsRole(["BILLING"]);
  const actions = useAgreementActions();
  const [draft, setDraft] = useState<Filter>(EMPTY_FILTER);
  const [applied, setApplied] = useState<Filter>(EMPTY_FILTER);
  const paging = useOpsPaging();
  const query = useAgreementList({ ...applied, page: paging.page, size: paging.size });
  const [approveTarget, setApproveTarget] = useState<Agreement | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Agreement | null>(null);
  const [approved, setApproved] = useState<OpsStartCustomerAgreementApproveResponse | null>(null);
  const [revoked, setRevoked] = useState<OpsStartCustomerAgreementRevokeResponse | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const cohorts = query.data?.cohorts ?? [];

  async function approve(target: Agreement) {
    setFailure(null);
    setApproved(null);
    setRevoked(null);
    try {
      setApproved(
        await actions.approve.mutateAsync({
          agreementId: target.agreementId,
          version: target.version,
        }),
      );
    } catch (error) {
      setFailure(describeBillingError(error, "합의를 승인하지 못했습니다."));
    }
    setApproveTarget(null);
  }

  return (
    <OpsScreen
      title="시작 고객 합의"
      description="시작 고객 합의를 등록하고 다른 결제담당이 승인하며 필요하면 취소합니다."
      roles={["OPS", "BILLING"]}
    >
      <CohortCards cohorts={cohorts} />
      {canRegister ? (
        <RegisterCard cohorts={cohorts} />
      ) : (
        <p role="note" className="text-caption text-ink-2">
          합의 등록은 운영담당만 할 수 있습니다. 이 화면에서는 목록을 읽기 전용으로 봅니다.
        </p>
      )}
      <OpsFilterBar
        label="시작 고객 합의 조회"
        onApply={() => {
          setApplied(draft);
          paging.resetPage();
        }}
        onReset={() => {
          setDraft(EMPTY_FILTER);
          setApplied(EMPTY_FILTER);
          paging.resetPage();
        }}
      >
        <SelectField
          label="상태"
          value={draft.status}
          options={STATUS_OPTIONS}
          onValueChange={(status) => setDraft({ ...draft, status })}
        />
        <SelectField
          label="이벤트"
          value={draft.trialEventId}
          options={[
            { value: "", label: "전체" },
            ...cohorts.map((cohort) => ({
              value: String(cohort.trialEventId),
              label: cohort.eventName,
            })),
          ]}
          onValueChange={(trialEventId) => setDraft({ ...draft, trialEventId })}
        />
        <TextField
          label="사무소 ID"
          kind="number"
          value={draft.officeId}
          onValueChange={(officeId) => setDraft({ ...draft, officeId })}
        />
      </OpsFilterBar>
      {failure ? (
        <p role="alert" className="text-caption text-danger">
          {failure}
        </p>
      ) : null}
      {approved ? <ApproveResult result={approved} /> : null}
      {revoked ? (
        <p role="status" className="text-caption text-ink">
          합의 {revoked.agreementId}를 취소했습니다.{" "}
          {revoked.freeEndsAtKept
            ? "이미 부여한 무료 기간은 그대로 유지됩니다."
            : "무료 기간이 조정되었습니다."}
        </p>
      ) : null}
      <OpsTable
        caption="시작 고객 합의 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.agreementId)}
        emptyMessage="조건에 맞는 시작 고객 합의가 없습니다."
        columns={[
          { key: "id", header: "합의", render: (row) => row.agreementId },
          {
            key: "office",
            header: "사무소",
            render: (row) => `${row.officeName} (${row.officeId})`,
          },
          {
            key: "status",
            header: "상태",
            render: (row) => <OpsStatusBadge status={row.status} map={AGREEMENT_STATUS} />,
          },
          { key: "event", header: "이벤트", render: (row) => row.trialEventId },
          { key: "price", header: "가격 버전", render: (row) => row.priceVersion },
          {
            key: "guarantee",
            header: "가격 보장 기간",
            render: (row) =>
              `${formatSeoulDate(row.priceStartsAt)} ~ ${formatSeoulDate(row.priceEndsAt)}`,
          },
          { key: "contracted", header: "체결일", render: (row) => row.contractedOn },
          { key: "reference", header: "참조번호", render: (row) => row.contractReference },
          { key: "creator", header: "등록자", render: (row) => row.createdByOperatorId },
          { key: "approver", header: "승인자", render: (row) => row.approvedByOperatorId ?? "-" },
          {
            key: "action",
            header: "처리",
            render: (row) => {
              if (!canApprove) return "-";
              const isOwn = row.createdByOperatorId === session.operatorId;
              return (
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap gap-2">
                    {row.status === "REGISTERED" ? (
                      <Button
                        size="sm"
                        variant="outlined"
                        disabled={isOwn}
                        aria-label={`합의 ${row.agreementId} 승인`}
                        onClick={() => setApproveTarget(row)}
                      >
                        승인
                      </Button>
                    ) : null}
                    {row.status !== "REVOKED" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`합의 ${row.agreementId} 취소`}
                        onClick={() => setRevokeTarget(row)}
                      >
                        취소
                      </Button>
                    ) : null}
                  </div>
                  {row.status === "REGISTERED" && isOwn ? (
                    <span className="text-caption text-ink-2">
                      등록한 운영자는 승인할 수 없습니다.
                    </span>
                  ) : null}
                </div>
              );
            },
          },
        ]}
      />
      <ConfirmDialog
        isOpen={approveTarget !== null}
        title="시작 고객 합의 승인"
        message="승인하면 같은 이벤트의 승인 상한과 가입 창을 검사한 뒤 구독에 시작 고객 규칙이 적용됩니다. 승인 기록은 감사 로그에 남습니다."
        confirmLabel="승인"
        isPending={actions.approve.isPending}
        onConfirm={() => approveTarget && void approve(approveTarget)}
        onCancel={() => setApproveTarget(null)}
      />
      <OpsReasonDialog
        isOpen={revokeTarget !== null}
        title="시작 고객 합의 취소"
        reasonLabel="취소 사유"
        description="취소해도 이미 부여한 무료 기간은 소급해서 취소하지 않고 가격 보장 연결만 끝납니다."
        confirmLabel="합의 취소"
        onSubmit={async (reason) => {
          if (!revokeTarget) return;
          setFailure(null);
          setApproved(null);
          setRevoked(
            await actions.revoke.mutateAsync({
              agreementId: revokeTarget.agreementId,
              version: revokeTarget.version,
              reason,
            }),
          );
        }}
        onClose={() => setRevokeTarget(null)}
      />
    </OpsScreen>
  );
}
