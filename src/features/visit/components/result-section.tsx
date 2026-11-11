"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type { VisitCoordinationDetailResponse } from "@/lib/api/contracts/visit.schema";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { Modal } from "@/shared/components/ui/modal";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { recordItemResult } from "../api/follow.api";
import { useResultHistory } from "../hooks/follow-queries";
import { visitKeys } from "../hooks/visit-queries";
import {
  CANCEL_REASON_CODES,
  CANCEL_REASON_LABEL,
  ITEM_RESULT_LABEL,
  labelOf,
} from "../model/labels";
import { describeVisitError } from "../model/messages";
import { kstParts, toKstIso } from "../model/time";
import { AssistantNoticePanel } from "./assistant-notice-panel";

type Detail = VisitCoordinationDetailResponse;
type Item = NonNullable<Detail["scheduleItems"]>[number];

const RESULT_OPTIONS = [
  { value: "COMPLETED", label: "방문 완료" },
  { value: "NO_SHOW", label: "불참" },
  { value: "CANCELLED", label: "취소" },
];

export type ResultFormValues = {
  result: string;
  date: string;
  time: string;
  cancelReason: string;
  correctionReason: string;
};

export function validateResult(
  values: ResultFormValues,
  isCorrection: boolean,
  now: Date = new Date(),
): Partial<Record<keyof ResultFormValues, string>> {
  const errors: Partial<Record<keyof ResultFormValues, string>> = {};
  if (values.result === "") errors.result = "결과를 선택해 주세요.";
  if (values.result === "COMPLETED") {
    if (values.date === "" || values.time === "") {
      errors.date = "실제 방문 날짜와 시각을 입력해 주세요.";
    } else if (Date.parse(toKstIso(values.date, values.time)) > now.getTime()) {
      errors.date = "미래 시각은 입력할 수 없습니다.";
    }
  }
  if (isCorrection && values.correctionReason.trim() === "") {
    errors.correctionReason = "정정 사유를 입력해 주세요.";
  }
  return errors;
}

function HistoryList({ itemId }: { itemId: number }) {
  const history = useResultHistory(itemId, true);
  if (history.isPending)
    return <p className="text-caption text-ink-2">이력을 불러오는 중입니다.</p>;
  if (history.isError) return <FormAlert>정정 이력을 불러오지 못했습니다.</FormAlert>;
  if (history.data.items.length === 0)
    return <p className="text-caption text-ink-2">기록된 이력이 없습니다.</p>;
  return (
    <ul className="flex flex-col gap-1 text-caption text-ink-2">
      {history.data.items.map((entry) => (
        <li key={entry.historyId}>
          {entry.previousResult ? labelOf(ITEM_RESULT_LABEL, entry.previousResult) : "처음"} →{" "}
          {labelOf(ITEM_RESULT_LABEL, entry.newResult)}
          {entry.newActualVisitedAt
            ? ` · 방문 ${formatSeoulDateTime(entry.newActualVisitedAt)}`
            : ""}
          {entry.correctionReason ? ` · 사유 ${entry.correctionReason}` : ""} ·{" "}
          {entry.recordedByName} · {formatSeoulDateTime(entry.recordedAt)}
        </li>
      ))}
    </ul>
  );
}

function ResultDialog({
  item,
  name,
  onClose,
  onRecorded,
}: {
  item: Item;
  name: string;
  onClose: () => void;
  onRecorded: (reviewWindowEndsAt: string | null) => void;
}) {
  const isCorrection = item.result !== "SCHEDULED";
  const queryClient = useQueryClient();
  const [values, setValues] = useState<ResultFormValues>(() => {
    const scheduled = item.scheduledStartAt
      ? kstParts(item.scheduledStartAt)
      : { date: "", time: "" };
    return {
      result: isCorrection ? item.result : "COMPLETED",
      date: scheduled.date,
      time: scheduled.time,
      cancelReason: "USER_CANCEL",
      correctionReason: "",
    };
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ResultFormValues, string>>>({});
  const mutation = useMutation({
    mutationFn: () =>
      recordItemResult(item.itemId, {
        result: values.result as "COMPLETED" | "NO_SHOW" | "CANCELLED",
        actualVisitedAt: values.result === "COMPLETED" ? toKstIso(values.date, values.time) : null,
        correctionReason: isCorrection ? values.correctionReason.trim() : null,
        cancelReasonCode:
          values.result === "CANCELLED"
            ? (values.cancelReason as (typeof CANCEL_REASON_CODES)[number])
            : null,
      }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: visitKeys.all });
      onRecorded(response.reviewWindowEndsAt ?? null);
    },
  });

  function set<K extends keyof ResultFormValues>(key: K, value: ResultFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function submit() {
    const next = validateResult(values, isCorrection);
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  }

  return (
    <Modal
      isOpen
      title={isCorrection ? `${name} 결과 정정` : `${name} 결과 기록`}
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={mutation.isPending}>
            취소
          </Button>
          <Button isLoading={mutation.isPending} onClick={submit}>
            {isCorrection ? "정정 저장" : "결과 저장"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SelectField
          label="방문 결과"
          value={values.result}
          options={RESULT_OPTIONS}
          onValueChange={(value) => set("result", value)}
          error={errors.result}
        />
        {values.result === "COMPLETED" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DateTimeField
              label="실제 방문 날짜"
              kind="date"
              value={values.date}
              onValueChange={(value) => set("date", value)}
              error={errors.date}
            />
            <DateTimeField
              label="실제 방문 시각"
              kind="time"
              value={values.time}
              onValueChange={(value) => set("time", value)}
            />
          </div>
        ) : null}
        {values.result === "CANCELLED" ? (
          <>
            <SelectField
              label="취소 사유"
              value={values.cancelReason}
              options={CANCEL_REASON_CODES.map((code) => ({
                value: code,
                label: CANCEL_REASON_LABEL[code],
              }))}
              onValueChange={(value) => set("cancelReason", value)}
            />
            <p className="text-caption text-ink-2">
              승인자 사유와 고객 사유 취소는 이력의 취소 건수에 들어가지 않습니다.
            </p>
          </>
        ) : null}
        {isCorrection ? (
          <>
            <TextField
              label="정정 사유"
              value={values.correctionReason}
              onValueChange={(value) => set("correctionReason", value)}
              error={errors.correctionReason}
            />
            <div className="flex flex-col gap-1">
              <h3 className="text-caption font-semibold text-ink">정정 이력</h3>
              <HistoryList itemId={item.itemId} />
            </div>
          </>
        ) : null}
        {mutation.isError ? (
          <FormAlert>{describeVisitError(mutation.error, "결과를 저장하지 못했습니다.")}</FormAlert>
        ) : null}
      </div>
    </Modal>
  );
}

export function ResultSection({ detail }: { detail: Detail }) {
  const { isReadOnly, role } = useOfficeAccess();
  const [target, setTarget] = useState<Item | null>(null);
  const [window, setWindow] = useState<string | null>(null);
  const items = (detail.scheduleItems ?? []).filter((item) => item.scheduledStartAt !== null);
  if (items.length === 0) return null;
  const cancelled = detail.status === "CANCELLED";
  const nameOf = (id: number) =>
    detail.candidateProperties.find((entry) => entry.candidatePropertyId === id);
  return (
    <section className="flex flex-col gap-3" aria-labelledby="result-title" id="results">
      <h2 id="result-title" className="text-h2 font-semibold text-ink">
        방문 결과 기록
      </h2>
      <p className="text-caption text-ink-2">
        방문 완료는 예정 시각이 지나도 자동으로 처리되지 않고 이곳에서 기록해야 합니다. 정정하면
        이전 결과와 사유가 이력에 남습니다.
      </p>
      {window ? (
        <FormNotice>
          승인자 평가 입력 기한은 {formatSeoulDateTime(window)}입니다. 평가를 받으려면 승인자 링크를
          다시 발급해 승인자에게 직접 전달해 주세요. 평가는 승인자만 입력하며 직원이 대신 입력할 수
          없습니다.
        </FormNotice>
      ) : null}
      <ul className="flex flex-col">
        {items.map((item) => {
          const candidate = nameOf(item.candidatePropertyId);
          return (
            <li key={item.itemId} className="flex flex-col gap-2 border-b border-line py-3">
              <span className="flex flex-wrap items-center gap-2 text-body text-ink">
                <span className="font-semibold">{candidate?.propertyName ?? ""}</span>
                <span className="text-caption text-ink-2">
                  {item.scheduledStartAt ? formatSeoulDateTime(item.scheduledStartAt) : ""}
                </span>
                <Badge tone={item.result === "SCHEDULED" ? "blue" : "gray"}>
                  {labelOf(ITEM_RESULT_LABEL, item.result)}
                </Badge>
                {item.resultRecordedAt ? (
                  <span className="text-caption text-ink-2">
                    입력 {formatSeoulDateTime(item.resultRecordedAt)} · 정정 {item.correctionCount}
                    회
                  </span>
                ) : null}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outlined"
                  disabled={cancelled}
                  onClick={() => setTarget(item)}
                >
                  {item.result === "SCHEDULED" ? "결과 기록" : "결과 정정"}
                </Button>
                {item.result === "COMPLETED" && candidate ? (
                  <Link
                    href={`/properties/${candidate.propertyId}/access-approvals`}
                    className="text-caption font-semibold text-primary hover:underline"
                  >
                    승인자 링크 발급 화면으로 이동
                  </Link>
                ) : null}
              </span>
              {role === "DEPUTY" || role === "AGENT" || role === "OWNER" ? (
                <AssistantNoticePanel item={item} role={role} isReadOnly={isReadOnly} />
              ) : null}
            </li>
          );
        })}
      </ul>
      {cancelled ? (
        <p className="text-caption text-ink-2">취소된 조율에는 결과를 기록할 수 없습니다.</p>
      ) : null}
      {target ? (
        <ResultDialog
          item={target}
          name={nameOf(target.candidatePropertyId)?.propertyName ?? ""}
          onClose={() => setTarget(null)}
          onRecorded={(endsAt) => {
            setWindow(endsAt);
            setTarget(null);
          }}
        />
      ) : null}
    </section>
  );
}
