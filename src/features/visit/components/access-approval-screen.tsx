"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type { AccessApprovalHistoryResponse } from "@/lib/api/contracts/visit.schema";
import { usePropertyDetail } from "@/features/property/hooks/property-queries";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { ConfirmDialog, Modal } from "@/shared/components/ui/modal";
import { PageHeader } from "@/shared/components/ui/page-header";
import { RadioGroup, SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { createAccessApproval, issueApproverLink, revokeApproverLink } from "../api/visit.api";
import { useAccessApprovals, useApproverLinkStatus, visitKeys } from "../hooks/visit-queries";
import {
  APPROVAL_ROLE_LABEL,
  APPROVAL_SOURCE_LABEL,
  APPROVER_TYPE_LABEL,
  labelOf,
} from "../model/labels";
import { describeVisitError, fieldErrorMap } from "../model/messages";
import { todayKst, toKstIso } from "../model/time";
import { IssuedLinkDialog } from "./issued-link-dialog";
import type { IssuedLink } from "./issued-link-dialog";

type Approval = AccessApprovalHistoryResponse["items"][number];

type FormValues = {
  approverType: string;
  approverName: string;
  approverPhone: string;
  approvalRole: string;
  source: string;
  fromDate: string;
  fromTime: string;
  untilDate: string;
  untilTime: string;
  confirmedDate: string;
  confirmedTime: string;
};

function emptyForm(): FormValues {
  const today = todayKst();
  return {
    approverType: "OCCUPANT",
    approverName: "",
    approverPhone: "",
    approvalRole: "PRIMARY",
    source: "DIRECT",
    fromDate: today,
    fromTime: "09:00",
    untilDate: today,
    untilTime: "18:00",
    confirmedDate: today,
    confirmedTime: "09:00",
  };
}

function ApprovalFormModal({
  propertyId,
  isOpen,
  onClose,
}: {
  propertyId: number;
  isOpen: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  const mutation = useMutation({
    mutationFn: () =>
      createAccessApproval(propertyId, {
        approverType: values.approverType as Approval["approverType"],
        approverName: values.approverName.trim(),
        approverPhone: values.approverPhone.trim() === "" ? null : values.approverPhone.trim(),
        validFrom: toKstIso(values.fromDate, values.fromTime),
        validUntil: toKstIso(values.untilDate, values.untilTime),
        source: values.source as "DIRECT" | "PROXY",
        approvalRole: values.approvalRole as "PRIMARY" | "CO_APPROVER",
        confirmedAt:
          values.source === "PROXY" ? toKstIso(values.confirmedDate, values.confirmedTime) : null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: visitKeys.approvals(propertyId) });
      setValues(emptyForm());
      onClose();
    },
    onError: (caught) => {
      const mapped = fieldErrorMap(caught);
      if (Object.keys(mapped).length > 0) setErrors((current) => ({ ...current, ...mapped }));
      setFormError(describeVisitError(caught, "출입승인을 등록하지 못했습니다."));
    },
  });

  function set(key: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function submit() {
    const next: Record<string, string> = {};
    if (values.approverName.trim() === "") next.approverName = "승인자 이름을 입력해 주세요.";
    if (values.source === "DIRECT" && values.approverPhone.trim() === "")
      next.approverPhone = "승인자 본인 입력은 연락처가 필요합니다.";
    if (toKstIso(values.untilDate, values.untilTime) <= toKstIso(values.fromDate, values.fromTime))
      next.untilDate = "종료 시각은 시작 시각보다 늦어야 합니다.";
    if (
      values.source === "PROXY" &&
      toKstIso(values.confirmedDate, values.confirmedTime) > new Date().toISOString()
    )
      next.confirmedDate = "확인 시각은 현재 이후일 수 없습니다.";
    setErrors(next);
    setFormError(undefined);
    if (Object.keys(next).length === 0) mutation.mutate();
  }

  return (
    <Modal
      isOpen={isOpen}
      title="출입승인 등록"
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={mutation.isPending}>
            취소
          </Button>
          <Button isLoading={mutation.isPending} onClick={submit}>
            등록
          </Button>
        </>
      }
    >
      <form
        noValidate
        className="flex max-h-[60vh] flex-col gap-4 overflow-auto"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <p className="text-caption text-ink-2">
          공실이어도 출입승인은 꼭 받아야 합니다. 승인자 연락처는 승인자 계정 연결 판정에 쓰입니다.
        </p>
        <SelectField
          label="승인자 유형"
          value={values.approverType}
          options={Object.entries(APPROVER_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
          onValueChange={(value) => set("approverType", value)}
        />
        <TextField
          label="승인자 이름"
          value={values.approverName}
          onValueChange={(value) => set("approverName", value)}
          error={errors.approverName}
        />
        <TextField
          label="승인자 연락처"
          kind="tel"
          value={values.approverPhone}
          onValueChange={(value) => set("approverPhone", value)}
          error={errors.approverPhone}
          hint="연락처가 없으면 승인자 링크를 발급할 수 없습니다."
        />
        <RadioGroup
          legend="승인 역할"
          name="approval-role"
          value={values.approvalRole}
          options={Object.entries(APPROVAL_ROLE_LABEL).map(([value, label]) => ({ value, label }))}
          onValueChange={(value) => set("approvalRole", value)}
        />
        <p className="text-caption text-ink-2">
          한 매물에 대표 승인자는 하나입니다. 공동 승인자는 읽기만 할 수 있습니다.
        </p>
        <RadioGroup
          legend="입력 방식"
          name="approval-source"
          value={values.source}
          options={Object.entries(APPROVAL_SOURCE_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
          onValueChange={(value) => set("source", value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <DateTimeField
            label="승인 시작일"
            kind="date"
            value={values.fromDate}
            onValueChange={(v) => set("fromDate", v)}
          />
          <DateTimeField
            label="승인 시작 시각"
            kind="time"
            value={values.fromTime}
            onValueChange={(v) => set("fromTime", v)}
          />
          <DateTimeField
            label="승인 종료일"
            kind="date"
            value={values.untilDate}
            onValueChange={(v) => set("untilDate", v)}
            error={errors.untilDate}
          />
          <DateTimeField
            label="승인 종료 시각"
            kind="time"
            value={values.untilTime}
            onValueChange={(v) => set("untilTime", v)}
          />
        </div>
        {values.source === "PROXY" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <DateTimeField
              label="확인한 날짜"
              kind="date"
              value={values.confirmedDate}
              onValueChange={(v) => set("confirmedDate", v)}
              error={errors.confirmedDate}
            />
            <DateTimeField
              label="확인한 시각"
              kind="time"
              value={values.confirmedTime}
              onValueChange={(v) => set("confirmedTime", v)}
            />
          </div>
        ) : null}
        {formError ? <FormAlert>{formError}</FormAlert> : null}
      </form>
    </Modal>
  );
}

function ApprovalRow({
  propertyId,
  approval,
  canManageLinks,
  isReadOnly,
}: {
  propertyId: number;
  approval: Approval;
  canManageLinks: boolean;
  isReadOnly: boolean;
}) {
  const queryClient = useQueryClient();
  const isRevoked = approval.revokedAt !== null;
  const status = useApproverLinkStatus(
    propertyId,
    approval.approvalId,
    canManageLinks && !isRevoked,
  );
  const [issued, setIssued] = useState<IssuedLink | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string>();
  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: visitKeys.approverLink(propertyId, approval.approvalId),
    });

  const issue = useMutation({
    mutationFn: () => issueApproverLink(propertyId, approval.approvalId),
    onSuccess: async (result) => {
      setError(undefined);
      setIssued({ publicUrl: result.publicUrl, expiresAt: result.expiresAt });
      await refresh();
    },
    onError: (caught) => setError(describeVisitError(caught, "링크를 발급하지 못했습니다.")),
  });

  const revoke = useMutation({
    mutationFn: () => revokeApproverLink(propertyId, approval.approvalId),
    onSuccess: async () => {
      setError(undefined);
      setIsRevoking(false);
      await refresh();
    },
    onError: (caught) => {
      setIsRevoking(false);
      setError(describeVisitError(caught, "링크를 폐기하지 못했습니다."));
    },
  });

  const hasLink = status.data?.hasActiveLink === true;
  const base = `/properties/${propertyId}/access-approvals/${approval.approvalId}`;
  return (
    <li className="flex flex-col gap-3 border-b border-line py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body font-semibold text-ink">
          {approval.approverName ?? "이름 없음"}
        </span>
        <Badge tone="blue">{labelOf(APPROVER_TYPE_LABEL, approval.approverType)}</Badge>
        <Badge tone={approval.approvalRole === "PRIMARY" ? "green" : "gray"}>
          {labelOf(APPROVAL_ROLE_LABEL, approval.approvalRole)}
        </Badge>
        {isRevoked ? <Badge tone="red">철회됨</Badge> : null}
      </div>
      <p className="text-caption text-ink-2">
        {formatSeoulDateTime(approval.validFrom)} ~ {formatSeoulDateTime(approval.validUntil)} ·{" "}
        {labelOf(APPROVAL_SOURCE_LABEL, approval.source)}
        {approval.recordedByName ? ` · 입력 ${approval.recordedByName}` : ""}
        {approval.confirmedAt ? ` · 확인 ${formatSeoulDateTime(approval.confirmedAt)}` : ""}
      </p>
      {isRevoked ? (
        <p className="text-caption text-danger">
          {approval.revokedAt ? formatSeoulDateTime(approval.revokedAt) : ""} 철회
          {approval.revocationReason ? ` · ${approval.revocationReason}` : ""}
        </p>
      ) : (
        <>
          {canManageLinks ? (
            <div className="flex flex-col gap-2">
              {status.isError ? (
                <p role="alert" className="text-caption text-danger">
                  링크 상태를 불러오지 못했습니다.
                </p>
              ) : status.isPending ? (
                <p className="text-caption text-ink-2">링크 상태를 불러오는 중입니다.</p>
              ) : hasLink ? (
                <p className="text-caption text-ink-2">
                  활성 링크 · 발급{" "}
                  {status.data.issuedAt ? formatSeoulDateTime(status.data.issuedAt) : "-"} · 만료{" "}
                  {status.data.expiresAt ? formatSeoulDateTime(status.data.expiresAt) : "-"} ·
                  마지막 접속{" "}
                  {status.data.lastAccessedAt
                    ? formatSeoulDateTime(status.data.lastAccessedAt)
                    : "없음"}
                </p>
              ) : (
                <p className="text-caption text-ink-2">활성 링크가 없습니다.</p>
              )}
              {approval.approvalRole === "CO_APPROVER" ? (
                <p className="text-caption text-ink-2">공동 승인자 링크는 읽기 전용입니다.</p>
              ) : null}
              {!approval.approverPhone ? (
                <p className="text-caption text-ink-2">연락처가 없어 링크를 발급할 수 없습니다.</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outlined"
                  isLoading={issue.isPending}
                  disabled={isReadOnly || !approval.approverPhone}
                  onClick={() => issue.mutate()}
                >
                  {hasLink ? "링크 재발급" : "링크 발급"}
                </Button>
                {hasLink ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isReadOnly}
                    onClick={() => setIsRevoking(true)}
                  >
                    링크 폐기
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-4 text-caption">
            <Link
              href={`${base}/conditions`}
              className="font-semibold text-primary hover:underline"
            >
              승인자 조건
            </Link>
            {approval.approvalRole === "PRIMARY" ? (
              <Link href={`${base}/grants`} className="font-semibold text-primary hover:underline">
                신청 허용
              </Link>
            ) : null}
          </div>
        </>
      )}
      {error ? <FormAlert>{error}</FormAlert> : null}
      <IssuedLinkDialog
        title="승인자 링크"
        link={issued}
        notice="활성 링크는 출입승인당 하나이고 이 링크는 지금만 볼 수 있습니다. 복사해 승인자에게 전달해 주세요. 링크를 폐기해도 승인자 계정 접근에는 영향이 없고, 접근을 끊으려면 출입승인을 철회해야 합니다."
        onClose={() => setIssued(null)}
      />
      <ConfirmDialog
        isOpen={isRevoking}
        title="승인자 링크 폐기"
        message="이 출입승인의 활성 링크를 폐기합니다. 승인자는 이 링크로 더 이상 접속할 수 없습니다."
        confirmLabel="폐기"
        isPending={revoke.isPending}
        onConfirm={() => revoke.mutate()}
        onCancel={() => setIsRevoking(false)}
      />
    </li>
  );
}

function ApprovalBody({ propertyId, propertyName }: { propertyId: number; propertyName: string }) {
  const { role, isReadOnly } = useOfficeAccess();
  const approvals = useAccessApprovals(propertyId);
  const [isOpen, setIsOpen] = useState(false);
  const canManageLinks = role === "OWNER" || role === "AGENT";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="출입승인"
        description={`${propertyName}의 출입승인과 승인자 링크를 관리합니다.`}
        actions={
          <div className="flex gap-2">
            <Link
              href={`/properties/${propertyId}`}
              className="inline-flex h-12 items-center rounded-control border border-line bg-white px-6 text-body font-medium text-ink-2 hover:border-primary hover:text-primary"
            >
              매물 상세
            </Link>
            <Button disabled={isReadOnly} onClick={() => setIsOpen(true)}>
              + 출입승인 등록
            </Button>
          </div>
        }
      />
      {!canManageLinks ? (
        <FormNotice>승인자 링크는 승인된 대표와 소속공인중개사만 발급할 수 있습니다.</FormNotice>
      ) : (
        <FormNotice>
          승인자 조건은 승인자가 링크로 직접 등록합니다. 링크 원문은 발급 응답에서 한 번만 보입니다.
        </FormNotice>
      )}
      <Card>
        <QueryGate query={approvals} loadingLabel="출입승인 이력을 불러오는 중입니다.">
          {(data) =>
            data.items.length === 0 ? (
              <p className="text-body text-ink-2">등록된 출입승인이 없습니다.</p>
            ) : (
              <ul>
                {data.items.map((approval) => (
                  <ApprovalRow
                    key={approval.approvalId}
                    propertyId={propertyId}
                    approval={approval}
                    canManageLinks={canManageLinks}
                    isReadOnly={isReadOnly}
                  />
                ))}
              </ul>
            )
          }
        </QueryGate>
      </Card>
      <ApprovalFormModal
        key={String(isOpen)}
        propertyId={propertyId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}

export function AccessApprovalScreen({ propertyId }: { propertyId: number }) {
  const property = usePropertyDetail(propertyId);
  return (
    <QueryGate query={property} loadingLabel="매물 정보를 불러오는 중입니다.">
      {(detail) => <ApprovalBody propertyId={propertyId} propertyName={detail.name} />}
    </QueryGate>
  );
}
