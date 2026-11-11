"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type {
  VisitCoordinationDetailResponse,
  VisitCoordinationRescheduleResponse,
} from "@/lib/api/contracts/visit.schema";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { Button } from "@/shared/components/ui/button";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { Modal } from "@/shared/components/ui/modal";
import { TextField } from "@/shared/components/ui/text-field";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import {
  cancelCoordination,
  cloneCoordination,
  recordAccessRevocation,
  rescheduleCoordination,
} from "../api/follow.api";
import { visitKeys } from "../hooks/visit-queries";
import { describeVisitError } from "../model/messages";
import { toKstIso, todayKst, validatePeriod } from "../model/time";

type Detail = VisitCoordinationDetailResponse;

const REASON_LIMIT = 500;

function useRefreshAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: visitKeys.all });
}

function RescheduleBlock({ detail }: { detail: Detail }) {
  const refresh = useRefreshAll();
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<VisitCoordinationRescheduleResponse | null>(null);
  const mutation = useMutation({
    mutationFn: () => rescheduleCoordination(detail.coordinationId, reason.trim() || null),
    onSuccess: async (response) => {
      setResult(response);
      await refresh();
    },
  });
  const nameOf = (candidateId: number) =>
    detail.candidateProperties.find((entry) => entry.candidatePropertyId === candidateId)
      ?.propertyName ?? "";
  return (
    <div className="flex flex-col gap-3">
      <p className="text-caption text-ink-2">
        이미 끝난 방문과 영향이 없는 확정 방문은 그대로 고정되고 변경이 필요한 방문만 다시
        구성합니다. 확정 방문은 자동으로 바뀌거나 취소되지 않습니다.
      </p>
      <TextField
        label="재조율이 필요한 이유"
        value={reason}
        maxLength={REASON_LIMIT}
        onValueChange={setReason}
      />
      <div>
        <Button
          size="sm"
          variant="outlined"
          isLoading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          재조율 필요로 전환
        </Button>
      </div>
      {mutation.isError ? (
        <FormAlert>{describeVisitError(mutation.error, "재조율로 전환하지 못했습니다.")}</FormAlert>
      ) : null}
      {result ? (
        <div className="flex flex-col gap-2" role="status">
          <FormNotice>재조율 필요로 전환했습니다. 변경이 필요한 방문을 확인해 주세요.</FormNotice>
          <ul className="flex flex-col gap-1 text-caption text-ink">
            {result.affectedItems.map((entry) => (
              <li key={entry.scheduleItemId}>
                {nameOf(entry.candidatePropertyId)} · 재조율 필요 · {entry.reason}
                {result.noAlternativeScheduleItemIds.includes(entry.scheduleItemId)
                  ? " · 대안 없음, 이번 조율에서 제외하려면 방문 결과를 취소로 기록해 주세요."
                  : ""}
              </li>
            ))}
            {result.affectedItems.length === 0 ? <li>영향을 받는 방문이 없습니다.</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function RevocationDialog({ detail, onClose }: { detail: Detail; onClose: () => void }) {
  const refresh = useRefreshAll();
  const [approvalId, setApprovalId] = useState(
    detail.rescheduleAlert?.approvalId ? String(detail.rescheduleAlert.approvalId) : "",
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const mutation = useMutation({
    mutationFn: () =>
      recordAccessRevocation(detail.coordinationId, {
        approvalId: Number(approvalId),
        revokedAt: toKstIso(date, time),
        revocationReason: reason.trim(),
      }),
    onSuccess: async () => {
      await refresh();
      onClose();
    },
  });

  function submit() {
    const next: Partial<Record<string, string>> = {};
    if (!/^\d+$/.test(approvalId.trim())) next.approvalId = "출입승인 번호를 숫자로 입력해 주세요.";
    if (date === "" || time === "") next.date = "철회 날짜와 시각을 입력해 주세요.";
    else if (Date.parse(toKstIso(date, time)) > Date.now())
      next.date = "미래 시각은 입력할 수 없습니다.";
    if (reason.trim() === "") next.reason = "철회 사유를 입력해 주세요.";
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  }

  return (
    <Modal
      isOpen
      title="출입승인 철회 접수"
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={mutation.isPending}>
            취소
          </Button>
          <Button isLoading={mutation.isPending} onClick={submit}>
            철회 접수
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-caption text-ink-2">
          승인자가 출입승인을 철회했다는 사실을 접수합니다. 접수하면 그 출입승인의 신청 허용이
          만료되고 허용 근거 신청 대기 신청이 종결됩니다.
        </p>
        <TextField
          label="출입승인 번호"
          kind="number"
          value={approvalId}
          onValueChange={setApprovalId}
          error={errors.approvalId}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DateTimeField
            label="철회 날짜"
            kind="date"
            value={date}
            onValueChange={setDate}
            error={errors.date}
          />
          <DateTimeField label="철회 시각" kind="time" value={time} onValueChange={setTime} />
        </div>
        <TextField
          label="철회 사유"
          value={reason}
          onValueChange={setReason}
          error={errors.reason}
        />
        {mutation.isError ? (
          <FormAlert>{describeVisitError(mutation.error, "철회를 접수하지 못했습니다.")}</FormAlert>
        ) : null}
      </div>
    </Modal>
  );
}

function CancelDialog({
  detail,
  isPartial,
  onClose,
}: {
  detail: Detail;
  isPartial: boolean;
  onClose: () => void;
}) {
  const refresh = useRefreshAll();
  const [reason, setReason] = useState("");
  const mutation = useMutation({
    mutationFn: () => cancelCoordination(detail.coordinationId, reason.trim() || null),
    onSuccess: async () => {
      await refresh();
      onClose();
    },
  });
  return (
    <Modal
      isOpen
      title={isPartial ? "남은 일정 취소" : "조율 전체 취소"}
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={mutation.isPending}>
            돌아가기
          </Button>
          <Button isLoading={mutation.isPending} onClick={() => mutation.mutate()}>
            {isPartial ? "남은 일정 취소" : "전체 취소"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-caption text-ink-2">
          {isPartial
            ? "이미 방문 완료·불참·취소로 기록한 결과는 유지하고 아직 결과가 없는 남은 일정만 취소합니다."
            : "아직 결과가 기록되지 않은 조율 전체를 취소합니다. 취소한 조율을 다시 진행하려면 새 기간을 입력해 복제합니다."}{" "}
          취소된 자리에 있던 이전 대기자는 자동으로 올라가지 않고 최신 조건을 다시 확인해
          승인받습니다.
        </p>
        <TextField
          label="취소 사유 (선택)"
          value={reason}
          maxLength={REASON_LIMIT}
          onValueChange={setReason}
        />
        {mutation.isError ? (
          <FormAlert>{describeVisitError(mutation.error, "취소하지 못했습니다.")}</FormAlert>
        ) : null}
      </div>
    </Modal>
  );
}

function CloneDialog({ detail, onClose }: { detail: Detail; onClose: () => void }) {
  const refresh = useRefreshAll();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [errors, setErrors] = useState<{ start?: string; end?: string }>({});
  const mutation = useMutation({
    mutationFn: () =>
      cloneCoordination(detail.coordinationId, { periodStartDate: start, periodEndDate: end }),
    onSuccess: async () => {
      await refresh();
    },
  });

  function submit() {
    const next = validatePeriod(start, end, todayKst());
    setErrors(next);
    if (!next.start && !next.end) mutation.mutate();
  }

  return (
    <Modal
      isOpen
      title="새 기간으로 복제"
      onClose={onClose}
      footer={
        mutation.isSuccess ? (
          <Button onClick={onClose}>닫기</Button>
        ) : (
          <>
            <Button variant="cancel" onClick={onClose} disabled={mutation.isPending}>
              취소
            </Button>
            <Button isLoading={mutation.isPending} onClick={submit}>
              복제해서 새 조율 만들기
            </Button>
          </>
        )
      }
    >
      {mutation.isSuccess ? (
        <div className="flex flex-col gap-3">
          <FormNotice>새 조율을 만들었습니다.</FormNotice>
          <Link
            href={`/coordinations/${mutation.data.coordinationId}`}
            className="text-body font-semibold text-primary hover:underline"
          >
            새 조율 열기
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-caption text-ink-2">
            취소된 조율의 고객과 후보 매물을 그대로 가져옵니다. 방문 가능 기간은 오늘부터 30일
            안에서 새로 입력합니다.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DateTimeField
              label="방문 가능 시작일"
              kind="date"
              value={start}
              onValueChange={setStart}
              error={errors.start}
            />
            <DateTimeField
              label="방문 가능 종료일"
              kind="date"
              value={end}
              onValueChange={setEnd}
              error={errors.end}
            />
          </div>
          {mutation.isError ? (
            <FormAlert>{describeVisitError(mutation.error, "복제하지 못했습니다.")}</FormAlert>
          ) : null}
        </div>
      )}
    </Modal>
  );
}

export function LifecycleSection({ detail }: { detail: Detail }) {
  const { isReadOnly, role } = useOfficeAccess();
  const [dialog, setDialog] = useState<"cancel" | "revoke" | "clone" | null>(null);
  if (role === "DEPUTY") return null;
  const items = detail.scheduleItems ?? [];
  const isCancelled = detail.status === "CANCELLED";
  const isClosed =
    isCancelled || detail.status === "VISIT_COMPLETED" || detail.status === "VISIT_INCOMPLETE";
  const isPartial = items.some((item) => item.result !== "SCHEDULED");
  return (
    <section className="flex flex-col gap-3" aria-labelledby="lifecycle-title" id="lifecycle">
      <h2 id="lifecycle-title" className="text-h2 font-semibold text-ink">
        재조율과 취소
      </h2>
      {isReadOnly ? (
        <FormNotice>
          구독이 제한된 상태입니다. 새 조율, 복제, 외부 링크 발급은 할 수 없고 기존 방문 취소,
          출입승인 철회 접수, 방문 결과 기록만 할 수 있습니다.
        </FormNotice>
      ) : null}
      {detail.status === "RESCHEDULE_REQUIRED" || detail.status === "CONFIRMED" ? (
        <RescheduleBlock detail={detail} />
      ) : null}
      {!isClosed ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outlined" onClick={() => setDialog("revoke")}>
            출입승인 철회 접수
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDialog("cancel")}>
            {isPartial ? "남은 일정 취소" : "조율 전체 취소"}
          </Button>
        </div>
      ) : null}
      {isCancelled && !isReadOnly ? (
        <div>
          <Button size="sm" variant="outlined" onClick={() => setDialog("clone")}>
            새 기간으로 복제
          </Button>
        </div>
      ) : null}
      {dialog === "revoke" ? (
        <RevocationDialog detail={detail} onClose={() => setDialog(null)} />
      ) : null}
      {dialog === "cancel" ? (
        <CancelDialog detail={detail} isPartial={isPartial} onClose={() => setDialog(null)} />
      ) : null}
      {dialog === "clone" ? <CloneDialog detail={detail} onClose={() => setDialog(null)} /> : null}
    </section>
  );
}
