"use client";

import { useState } from "react";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { Checkbox } from "@/shared/components/ui/select-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsDetailList } from "../components/common/ops-detail-list";
import { OpsReasonDialog } from "../components/common/ops-reason-dialog";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { describeOpsError } from "../model/ops-errors";
import { ApiError } from "@/shared/api/client";
import { useOfficeRevoke, useRegistrationActions, useRegistrationDetail } from "./registration-api";
import {
  CHECKLIST_ITEMS,
  DOWNLOADABLE_STATUSES,
  EVIDENCE_LABELS,
  REGISTRATION_STATUS,
  toSeoulIso,
} from "./registration-model";
import type { RegistrationDetail } from "./registration-model";

type Notice = { tone: "ok" | "error"; text: string };

function describeRegistrationError(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.code === "EVIDENCE_NOT_FOUND") {
    return "해당 증빙 서류를 찾을 수 없습니다. 현재 제출 버전에 없는 서류일 수 있습니다.";
  }
  return describeOpsError(error, fallback);
}

function NoticeLine({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  return (
    <p
      role={notice.tone === "error" ? "alert" : "status"}
      className={notice.tone === "error" ? "text-caption text-danger" : "text-caption text-ink"}
    >
      {notice.text}
    </p>
  );
}

function EvidenceCard({
  detail,
  onDownload,
  pendingType,
}: {
  detail: RegistrationDetail;
  onDownload: (type: string) => void;
  pendingType: string | null;
}) {
  const current = detail.revisions.find((rev) => rev.revisionNo === detail.currentRevisionNo);
  const types = current?.evidenceTypes ?? [];
  const canDownload = detail.hasEvidence && DOWNLOADABLE_STATUSES.includes(detail.status);
  return (
    <Card title="증빙 서류 대조">
      <p className="mb-3 text-caption text-ink-2">
        서류는 신청 상태가 심사 대기나 보완 요청일 때만 받을 수 있습니다. 받은 주소는 짧은 시간만
        유효하며 새 창으로 열기만 하고 화면에 저장하지 않습니다.
      </p>
      {!canDownload ? (
        <p role="note" className="mb-3 text-caption text-danger">
          {detail.hasEvidence
            ? "현재 신청 상태에서는 증빙 서류를 받을 수 없습니다."
            : "제출된 증빙 서류가 없습니다."}
        </p>
      ) : null}
      {types.length === 0 ? (
        <p className="text-body text-ink-2">현재 제출 버전에 증빙 서류가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {types.map((type) => (
            <li key={type} className="flex items-center justify-between gap-4">
              <span className="text-body text-ink">{EVIDENCE_LABELS[type] ?? type}</span>
              <Button
                size="sm"
                variant="ghost"
                disabled={!canDownload}
                isLoading={pendingType === type}
                aria-label={`${EVIDENCE_LABELS[type] ?? type} 받기`}
                onClick={() => onDownload(type)}
              >
                받기
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ChecklistCard({
  detail,
  onToggle,
  pendingCode,
}: {
  detail: RegistrationDetail;
  onToggle: (code: string, checked: boolean) => void;
  pendingCode: string | null;
}) {
  const isEditable = detail.status === "PENDING_REVIEW";
  return (
    <Card title="필수 확인 항목">
      <p className="mb-3 text-caption text-ink-2">
        제출 버전 {detail.currentRevisionNo} 기준입니다. 다섯 항목을 모두 확인해야 승인할 수
        있습니다. 확인 출처 조회 결과와 고용명부 원본 대조 결과는 저장하지 않고, 확인했음만
        기록합니다.
      </p>
      <ul className="flex flex-col gap-4">
        {CHECKLIST_ITEMS.map((item) => {
          const entry = detail.reviewChecklist.find((row) => row.itemCode === item.code);
          const checked = entry?.checked ?? false;
          return (
            <li key={item.code} className="flex flex-col gap-1">
              <Checkbox
                label={item.label}
                checked={checked}
                disabled={!isEditable || pendingCode !== null}
                onCheckedChange={(next) => onToggle(item.code, next)}
              />
              <span className="pl-9 text-caption text-ink-2">{item.hint}</span>
              {checked && entry?.checkedByOperatorName ? (
                <span className="pl-9 text-caption text-ink-2">
                  {entry.checkedByOperatorName} 확인
                  {entry.checkedAt ? ` · ${formatSeoulDateTime(entry.checkedAt)}` : ""}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      {!isEditable ? (
        <p className="mt-3 text-caption text-ink-2">
          심사 대기 상태에서만 확인 상태를 바꿀 수 있습니다.
        </p>
      ) : null}
    </Card>
  );
}

function SupplementForm({
  onSubmit,
  onClose,
}: {
  onSubmit: (reason: string, dueAt: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [openedAt] = useState(() => Date.now());
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const dueAt = toSeoulIso(date, time);
  const isFuture = dueAt !== null && Date.parse(dueAt) > openedAt;
  const error = date !== "" && !isFuture ? "보완 기한은 지금 이후여야 합니다." : undefined;
  return (
    <OpsReasonDialog
      isOpen
      title="보완 요청"
      description="사유와 보완 기한은 신청한 사무소에 공개됩니다."
      reasonLabel="보완 사유(고객 공개)"
      confirmLabel="보완 요청"
      isReady={isFuture}
      onSubmit={(reason) => onSubmit(reason, dueAt ?? "")}
      onClose={onClose}
    >
      <div className="flex gap-4">
        <DateTimeField label="보완 기한 날짜" kind="date" value={date} onValueChange={setDate} />
        <DateTimeField
          label="보완 기한 시각"
          kind="time"
          value={time}
          onValueChange={setTime}
          error={error}
        />
      </div>
    </OpsReasonDialog>
  );
}

function SupplementDialog({
  isOpen,
  onSubmit,
  onClose,
}: {
  isOpen: boolean;
  onSubmit: (reason: string, dueAt: string) => Promise<unknown>;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  return <SupplementForm onSubmit={onSubmit} onClose={onClose} />;
}

function RevokeDialog({
  isOpen,
  onSubmit,
  onClose,
}: {
  isOpen: boolean;
  onSubmit: (reason: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <OpsReasonDialog
      isOpen={isOpen}
      title="사무소 인증 회수"
      description="회수하면 되돌릴 수 없습니다. 이 사무소의 인증이 취소되고 처리 기록은 감사 로그에 남습니다."
      reasonLabel="회수 사유"
      confirmLabel="인증 회수"
      isReady={confirmed}
      onSubmit={onSubmit}
      onClose={() => {
        setConfirmed(false);
        onClose();
      }}
    >
      <Checkbox
        label="되돌릴 수 없음을 확인했습니다"
        checked={confirmed}
        onCheckedChange={setConfirmed}
      />
    </OpsReasonDialog>
  );
}

type DialogKind = "approve" | "supplement" | "reject" | "revoke" | null;

function RegistrationBody({ detail }: { detail: RegistrationDetail }) {
  const id = detail.registrationId;
  const actions = useRegistrationActions(id);
  const revoke = useOfficeRevoke();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pendingType, setPendingType] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  const isPending = detail.status === "PENDING_REVIEW";
  const canReject = isPending || detail.status === "SUPPLEMENT_REQUESTED";
  const canRevoke = detail.status === "APPROVED" && typeof detail.officeId === "number";

  async function download(type: string) {
    setPendingType(type);
    setNotice(null);
    try {
      const result = await actions.evidenceUrl.mutateAsync(type);
      window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setNotice({
        tone: "error",
        text: describeRegistrationError(error, "서류를 받지 못했습니다."),
      });
    } finally {
      setPendingType(null);
    }
  }

  async function toggle(code: string, checked: boolean) {
    setPendingCode(code);
    setNotice(null);
    try {
      await actions.saveChecklist.mutateAsync([{ itemCode: code, checked }]);
    } catch (error) {
      setNotice({
        tone: "error",
        text: describeOpsError(error, "확인 상태를 저장하지 못했습니다."),
      });
    } finally {
      setPendingCode(null);
    }
  }

  async function approve() {
    try {
      await actions.approve.mutateAsync();
      setNotice({ tone: "ok", text: "인증 신청을 승인했습니다." });
    } catch (error) {
      setNotice({ tone: "error", text: describeOpsError(error, "승인하지 못했습니다.") });
    }
    setDialog(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card title="신청 정보">
        <OpsDetailList
          items={[
            {
              label: "상태",
              value: <OpsStatusBadge status={detail.status} map={REGISTRATION_STATUS} />,
            },
            { label: "사무소명", value: detail.requestedOfficeName },
            { label: "대표자", value: detail.requestedRepresentativeName },
            { label: "대표 연락처", value: detail.requestedRepresentativePhone },
            { label: "주소", value: detail.requestedAddress },
            { label: "사업자등록번호", value: detail.businessRegistrationNumber },
            { label: "개설등록번호", value: detail.realEstateLicenseNumber },
            { label: "개설등록관청", value: detail.registrationAuthority },
            { label: "사업자 구분", value: detail.entityType === "CORPORATION" ? "법인" : "개인" },
            { label: "신청자 등록관계", value: detail.applicantRegistrationRelation },
            { label: "심사 대상 제출 버전", value: `${detail.currentRevisionNo}` },
            { label: "반려 사유", value: detail.rejectionReason },
          ]}
        />
      </Card>
      <EvidenceCard
        detail={detail}
        onDownload={(type) => void download(type)}
        pendingType={pendingType}
      />
      <ChecklistCard
        detail={detail}
        onToggle={(code, next) => void toggle(code, next)}
        pendingCode={pendingCode}
      />
      <Card title="처리">
        <div className="flex flex-col gap-3">
          <NoticeLine notice={notice} />
          {isPending && !detail.canApprove ? (
            <p className="text-caption text-ink-2">
              필수 확인 항목을 모두 확인하면 승인할 수 있습니다.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={!isPending || !detail.canApprove}
              onClick={() => setDialog("approve")}
            >
              승인
            </Button>
            <Button
              variant="outlined"
              disabled={!isPending}
              onClick={() => setDialog("supplement")}
            >
              보완 요청
            </Button>
            <Button variant="ghost" disabled={!canReject} onClick={() => setDialog("reject")}>
              반려
            </Button>
            {canRevoke ? (
              <Button variant="ghost" onClick={() => setDialog("revoke")}>
                사무소 인증 회수
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
      <Card title="상태 이력">
        {detail.statusHistory.length === 0 ? (
          <p className="text-body text-ink-2">상태 이력이 없습니다.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {detail.statusHistory.map((row) => (
              <li key={row.historyId} className="text-body text-ink">
                {formatSeoulDateTime(row.createdAt)} ·{" "}
                {row.fromStatus
                  ? `${REGISTRATION_STATUS[row.fromStatus]?.label ?? row.fromStatus} → `
                  : ""}
                {REGISTRATION_STATUS[row.toStatus]?.label ?? row.toStatus}
                {row.reason ? ` · ${row.reason}` : ""}
              </li>
            ))}
          </ol>
        )}
      </Card>
      <ConfirmDialog
        isOpen={dialog === "approve"}
        title="인증 신청 승인"
        message="승인하면 사무소와 대표 소속이 만들어지고 승인 기록이 감사 로그에 남습니다."
        confirmLabel="승인"
        isPending={actions.approve.isPending}
        onConfirm={() => void approve()}
        onCancel={() => setDialog(null)}
      />
      <SupplementDialog
        isOpen={dialog === "supplement"}
        onSubmit={async (reason, dueAt) => {
          await actions.requestSupplement.mutateAsync({ reason, supplementDueAt: dueAt });
          setNotice({ tone: "ok", text: "보완을 요청했습니다." });
        }}
        onClose={() => setDialog(null)}
      />
      <OpsReasonDialog
        isOpen={dialog === "reject"}
        title="인증 신청 반려"
        description="반려 사유는 신청한 사무소에 공개됩니다."
        reasonLabel="반려 사유(고객 공개)"
        confirmLabel="반려"
        onSubmit={async (reason) => {
          await actions.reject.mutateAsync(reason);
          setNotice({ tone: "ok", text: "인증 신청을 반려했습니다." });
        }}
        onClose={() => setDialog(null)}
      />
      <RevokeDialog
        isOpen={dialog === "revoke"}
        onSubmit={async (reason) => {
          if (typeof detail.officeId !== "number") return;
          await revoke.mutateAsync({ officeId: detail.officeId, reason });
          setNotice({ tone: "ok", text: "사무소 인증을 회수했습니다." });
        }}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}

function RegistrationDetailLoader({ registrationId }: { registrationId: number }) {
  const query = useRegistrationDetail(registrationId);
  return (
    <QueryGate query={query} loadingLabel="인증 신청을 불러오는 중입니다">
      {(detail) => <RegistrationBody detail={detail} />}
    </QueryGate>
  );
}

export function RegistrationDetailScreen({ registrationId }: { registrationId: number }) {
  return (
    <OpsScreen title={`인증 신청 ${registrationId}`} roles={["REVIEW"]}>
      <RegistrationDetailLoader registrationId={registrationId} />
    </OpsScreen>
  );
}
