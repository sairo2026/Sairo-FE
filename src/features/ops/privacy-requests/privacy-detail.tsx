"use client";

import { useState } from "react";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsDetailList } from "../components/common/ops-detail-list";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { ApiError } from "@/shared/api/client";
import { describeOpsError } from "../model/ops-errors";
import { usePrivacyDetail, usePrivacyProcess } from "./privacy-api";
import {
  ACTION_LABELS,
  CONFIRM_ACTIONS,
  DUE_STATE,
  DUE_STATE_HELP,
  EVENT_TYPE_LABELS,
  EVIDENCE_MAX_LENGTH,
  IDENTITY_STATUS,
  NOTE_MAX_LENGTH,
  NEEDS_EVIDENCE,
  PRIVACY_STATUS,
  PROCESS_ACTIONS,
  REQUEST_TYPE_LABELS,
  unavailableReason,
  validateProcess,
} from "./privacy-model";
import type { PrivacyDetail, ProcessAction } from "./privacy-model";

type Notice = { tone: "ok" | "error"; text: string };

function describeProcessError(error: unknown): string {
  if (error instanceof ApiError && error.code === "IDENTITY_NOT_VERIFIED") {
    return "요청자의 본인확인이 완료되지 않아 승인과 일부 제한을 할 수 없습니다.";
  }
  return describeOpsError(error, "처리를 기록하지 못했습니다.");
}

function ProcessCard({ detail }: { detail: PrivacyDetail }) {
  const process = usePrivacyProcess(detail.requestId, detail.version);
  const availableActions = PROCESS_ACTIONS.filter(
    (action) => unavailableReason(action, detail.status, detail.identityStatus) !== "status",
  );
  const [choice, setChoice] = useState<ProcessAction | "">(
    availableActions.find(
      (candidate) => unavailableReason(candidate, detail.status, detail.identityStatus) === null,
    ) ?? "",
  );
  const action: ProcessAction | "" =
    choice !== "" && unavailableReason(choice, detail.status, detail.identityStatus) === null
      ? choice
      : "";
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState("");
  const [errors, setErrors] = useState<{ note?: string; evidence?: string }>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  if (availableActions.length === 0) {
    return (
      <Card title="처리 기록">
        <div className="flex flex-col gap-3">
          {notice ? (
            <p role="status" className="text-caption text-ink">
              {notice.text}
            </p>
          ) : null}
          <p className="text-body text-ink-2">완료하거나 거절한 요청은 더 처리할 수 없습니다.</p>
        </div>
      </Card>
    );
  }

  const options = [
    { value: "", label: "처리 단계를 선택해 주세요", isDisabled: true },
    ...availableActions.map((candidate) => ({
      value: candidate,
      label:
        unavailableReason(candidate, detail.status, detail.identityStatus) === "identity"
          ? `${ACTION_LABELS[candidate]} (본인확인 필요)`
          : ACTION_LABELS[candidate],
      isDisabled: unavailableReason(candidate, detail.status, detail.identityStatus) === "identity",
    })),
  ];
  const identityBlocked = detail.identityStatus !== "VERIFIED";

  async function send(selected: ProcessAction) {
    setNotice(null);
    try {
      await process.mutateAsync({
        action: selected,
        note: note.trim() === "" ? null : note.trim(),
        evidenceReference: evidence.trim() === "" ? null : evidence.trim(),
      });
      setNotice({ tone: "ok", text: `${ACTION_LABELS[selected]}을(를) 기록했습니다.` });
      setNote("");
      setEvidence("");
      setChoice("");
    } catch (error) {
      setNotice({ tone: "error", text: describeProcessError(error) });
    }
    setIsConfirming(false);
  }

  function submit() {
    if (action === "") return;
    const found = validateProcess(action, note, evidence);
    setErrors(found);
    setNotice(null);
    if (found.note || found.evidence) return;
    if (CONFIRM_ACTIONS.includes(action)) setIsConfirming(true);
    else void send(action);
  }

  return (
    <Card title="처리 기록">
      <div className="flex flex-col gap-4">
        <OpsDetailList
          items={[
            {
              label: "담당 운영자",
              value: detail.assignedOperatorName ?? "처음 처리하는 운영자로 기록됩니다",
            },
            { label: "처리 범위", value: detail.requestScope },
          ]}
        />
        <SelectField
          label="처리 단계"
          value={action}
          options={options}
          onValueChange={(value) => {
            setChoice(PROCESS_ACTIONS.find((candidate) => candidate === value) ?? "");
            setErrors({});
          }}
        />
        {identityBlocked ? (
          <p className="text-caption text-ink-2">
            요청자의 본인확인이 완료되지 않아 승인과 일부 제한은 할 수 없습니다. 거절과 완료 처리는
            본인확인 없이 할 수 있습니다.
          </p>
        ) : null}
        <TextAreaField
          label="결정 사유(요청자에게 안내되는 문구)"
          value={note}
          onValueChange={setNote}
          maxLength={NOTE_MAX_LENGTH}
          rows={4}
          error={errors.note}
          hint="결정 사유는 요청자가 읽는 문장으로 작성해 주세요. 일부 제한과 거절에서는 필수입니다."
        />
        <TextField
          label={`완료 증빙 위치${action !== "" && NEEDS_EVIDENCE.includes(action) ? " (필수)" : ""}`}
          value={evidence}
          onValueChange={setEvidence}
          maxLength={EVIDENCE_MAX_LENGTH}
          error={errors.evidence}
          hint="실행 결과와 증빙을 보관한 위치를 적어 주세요. 개인정보 원문은 적지 않습니다."
        />
        {notice ? (
          <p
            role={notice.tone === "error" ? "alert" : "status"}
            className={
              notice.tone === "error" ? "text-caption text-danger" : "text-caption text-ink"
            }
          >
            {notice.text}
          </p>
        ) : null}
        <div>
          <Button
            isLoading={process.isPending && !isConfirming}
            disabled={action === ""}
            onClick={submit}
          >
            처리 기록
          </Button>
        </div>
      </div>
      <ConfirmDialog
        isOpen={isConfirming}
        title={action === "" ? "처리 확인" : `${ACTION_LABELS[action]} 확인`}
        message="이 처리는 되돌릴 수 없고 처리 기록은 감사 로그에 남습니다. 결정 사유는 요청자에게 안내됩니다."
        confirmLabel="기록"
        isPending={process.isPending}
        onConfirm={() => {
          if (action !== "") void send(action);
        }}
        onCancel={() => setIsConfirming(false)}
      />
    </Card>
  );
}

function PrivacyBody({ detail }: { detail: PrivacyDetail }) {
  return (
    <div className="flex flex-col gap-6">
      <Card title="요청 정보">
        <OpsDetailList
          items={[
            {
              label: "요청 유형",
              value: REQUEST_TYPE_LABELS[detail.requestType] ?? detail.requestType,
            },
            {
              label: "처리 상태",
              value: <OpsStatusBadge status={detail.status} map={PRIVACY_STATUS} />,
            },
            {
              label: "본인확인",
              value: <OpsStatusBadge status={detail.identityStatus} map={IDENTITY_STATUS} />,
            },
            {
              label: "처리 주체",
              value: detail.handlerType === "SAIRO" ? "사이로" : "책임 사무소",
            },
            { label: "책임 사무소", value: detail.officeId === null ? "사이로" : detail.officeId },
            { label: "접수일", value: formatSeoulDateTime(detail.receivedAt) },
            { label: "적용 근거", value: detail.legalBasis },
            { label: "요청 범위", value: detail.requestScope },
            { label: "법정 기한", value: formatSeoulDateTime(detail.legalDueAt) },
            { label: "내부 기한", value: formatSeoulDateTime(detail.internalDueAt) },
            {
              label: "기한 상태",
              value:
                detail.dueState === null ? null : (
                  <OpsStatusBadge status={detail.dueState} map={DUE_STATE} />
                ),
            },
            { label: "담당 운영자", value: detail.assignedOperatorName },
            { label: "결정 사유", value: detail.decisionReason },
            { label: "완료 증빙", value: detail.completionEvidence },
            {
              label: "완료 시각",
              value: detail.completedAt ? formatSeoulDateTime(detail.completedAt) : null,
            },
          ]}
        />
        <p className="mt-4 text-caption text-ink-2">
          {DUE_STATE_HELP} 요청자의 이름과 연락처는 표시하지 않습니다. 고객 원문이 필요하면 원문
          접근 승인을 요청해 주세요.
        </p>
      </Card>
      <Card title="처리 이력">
        {detail.events.length === 0 ? (
          <p className="text-body text-ink-2">처리 이력이 없습니다.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {detail.events.map((event) => (
              <li key={event.eventId} className="text-body text-ink">
                {formatSeoulDateTime(event.occurredAt)} ·{" "}
                {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType} ·{" "}
                {event.previousStatus
                  ? `${PRIVACY_STATUS[event.previousStatus]?.label ?? event.previousStatus} → `
                  : ""}
                {PRIVACY_STATUS[event.newStatus]?.label ?? event.newStatus} · {event.actionDetail}
                {event.actorOperatorName ? ` · ${event.actorOperatorName}` : ""}
              </li>
            ))}
          </ol>
        )}
      </Card>
      <ProcessCard detail={detail} />
    </div>
  );
}

function PrivacyLoader({ requestId }: { requestId: number }) {
  const query = usePrivacyDetail(requestId);
  return (
    <QueryGate query={query} loadingLabel="개인정보 요청을 불러오는 중입니다">
      {(detail) => <PrivacyBody detail={detail} />}
    </QueryGate>
  );
}

export function PrivacyDetailScreen({ requestId }: { requestId: number }) {
  return (
    <OpsScreen title={`개인정보 요청 ${requestId}`} roles={["PRIVACY"]}>
      <PrivacyLoader requestId={requestId} />
    </OpsScreen>
  );
}
