"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type {
  ApproverConditionImpactPreviewResponse,
  ApproverConditionResponse,
  ApproverConditionUpsertRequest,
} from "@/lib/api/contracts/visit.schema";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { Checkbox } from "@/shared/components/ui/select-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import {
  WEEKDAYS,
  conditionToForm,
  emptyConditionForm,
  toConditionRequest,
  validateCondition,
  violatedRuleLabel,
} from "../model/conditions";
import type { ConditionErrors, ConditionFormValues, ConditionLike } from "../model/conditions";
import { describeVisitError, fieldErrorMap, isApiCode } from "../model/messages";
import { ConditionForm } from "./condition-form";

type Affected = ApproverConditionImpactPreviewResponse["affectedItems"];

function describeRange(range: ApproverConditionResponse["normalizedRanges"][number]): string {
  const scope =
    range.windowType === "WEEKDAY"
      ? (WEEKDAYS.find((item) => item.value === range.weekday)?.label ?? "요일")
      : (range.windowDate ?? "날짜");
  return `${scope} ${range.startsTime}~${range.endsTime}${range.isException ? " (제외)" : ""}`;
}

export function ConditionEditor({
  initial,
  noticeVersion,
  readOnly,
  lockedMessage = "공동 승인자는 조건을 입력할 수 없고 대표 승인자가 등록한 조건을 읽기만 할 수 있습니다.",
  submitLabel,
  save,
  preview,
  onSaved,
}: {
  initial: ConditionLike | null;
  noticeVersion: string;
  readOnly: boolean;
  lockedMessage?: string;
  submitLabel: string;
  save: (request: ApproverConditionUpsertRequest) => Promise<ApproverConditionResponse>;
  preview?: (
    request: ApproverConditionUpsertRequest,
  ) => Promise<ApproverConditionImpactPreviewResponse>;
  onSaved?: (saved: ApproverConditionResponse) => void;
}) {
  const [values, setValues] = useState<ConditionFormValues>(() =>
    initial ? conditionToForm(initial) : emptyConditionForm(),
  );
  const [errors, setErrors] = useState<ConditionErrors>({});
  const [formError, setFormError] = useState<string>();
  const [saved, setSaved] = useState<ApproverConditionResponse>();
  const [impact, setImpact] = useState<{ affected: Affected | null }>();
  const [acknowledged, setAcknowledged] = useState(false);
  const [locked, setLocked] = useState(readOnly);

  function applyServerError(error: unknown, fallback: string) {
    if (isApiCode(error, "APPROVER_READ_ONLY")) setLocked(true);
    const mapped = fieldErrorMap(error);
    if (Object.keys(mapped).length > 0) setErrors((current) => ({ ...current, ...mapped }));
    setFormError(describeVisitError(error, fallback));
  }

  const saveMutation = useMutation({
    mutationFn: (impactAcknowledged: boolean) =>
      save(toConditionRequest(values, { impactAcknowledged, noticeVersion })),
    onSuccess: (result) => {
      setImpact(undefined);
      setAcknowledged(false);
      setFormError(undefined);
      setSaved(result);
      onSaved?.(result);
    },
    onError: (error) => {
      if (isApiCode(error, "IMPACT_NOT_ACKNOWLEDGED")) {
        setImpact({ affected: null });
        return;
      }
      setImpact(undefined);
      applyServerError(error, "조건을 저장하지 못했습니다. 다시 시도해 주세요.");
    },
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!preview) return null;
      return preview(toConditionRequest(values, { impactAcknowledged: false, noticeVersion }));
    },
    onSuccess: (result) => {
      if (result?.hasImpact) {
        setImpact({ affected: result.affectedItems });
        setAcknowledged(false);
        return;
      }
      saveMutation.mutate(false);
    },
    onError: (error) => applyServerError(error, "영향을 확인하지 못했습니다. 다시 시도해 주세요."),
  });

  function submit() {
    setSaved(undefined);
    setFormError(undefined);
    const next = validateCondition(values);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setFormError("입력한 내용을 확인해 주세요.");
      return;
    }
    if (preview) previewMutation.mutate();
    else saveMutation.mutate(false);
  }

  const isBusy = saveMutation.isPending || previewMutation.isPending;

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {locked ? <FormNotice>{lockedMessage}</FormNotice> : null}
      <ConditionForm
        values={values}
        errors={errors}
        disabled={locked || isBusy}
        onChange={setValues}
      />
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      {saved ? (
        <div className="flex flex-col gap-2">
          <FormNotice>조건 {saved.versionNo}번 버전으로 저장했습니다.</FormNotice>
          {saved.normalizationApplied ? (
            <FormNotice>
              겹치거나 맞닿는 시간대를 하나로 합쳐 저장했습니다:{" "}
              {saved.normalizedRanges.map(describeRange).join(", ")}
            </FormNotice>
          ) : null}
        </div>
      ) : null}
      {locked ? null : (
        <div>
          <Button type="submit" isLoading={isBusy}>
            {submitLabel}
          </Button>
        </div>
      )}
      <Modal
        isOpen={impact !== undefined}
        title="확정된 방문에 영향이 있습니다"
        onClose={() => setImpact(undefined)}
        footer={
          <>
            <Button variant="cancel" onClick={() => setImpact(undefined)} disabled={isBusy}>
              돌아가기
            </Button>
            <Button
              isLoading={saveMutation.isPending}
              disabled={!acknowledged}
              onClick={() => saveMutation.mutate(true)}
            >
              영향을 확인하고 저장
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>
            저장해도 확정된 방문은 자동으로 취소되지 않습니다. 영향받는 방문은 재조율 필요로
            표시되고 해당 중개사에게 알림이 갑니다.
          </p>
          {impact?.affected ? (
            <ul className="flex flex-col gap-2">
              {impact.affected.map((item) => (
                <li key={item.scheduleItemId} className="rounded-control bg-surface px-3 py-2">
                  {formatSeoulDateTime(item.scheduledStartAt)} ~{" "}
                  {formatSeoulDateTime(item.scheduledEndAt)}
                  <span className="block text-caption text-ink-2">
                    {item.violatedRules.map(violatedRuleLabel).join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <Checkbox
            label="영향을 확인했습니다"
            checked={acknowledged}
            onCheckedChange={setAcknowledged}
          />
        </div>
      </Modal>
    </form>
  );
}
