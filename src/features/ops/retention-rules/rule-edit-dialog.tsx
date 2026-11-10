"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { ApiError } from "@/shared/api/client";
import { FormMessage } from "../system-common/system-fields";
import { describeSystemError } from "../system-common/system-form";
import { useUpdateRetentionRule } from "./retention-api";
import {
  ANCHOR_LABELS,
  RULE_STATUS_OPTIONS,
  ruleInputOf,
  toRuleBody,
  validateRuleEdit,
} from "./retention-model";
import type { RetentionRule, RuleEditErrors, RuleEditInput } from "./retention-model";

export function RuleEditDialog({
  rule,
  onClose,
  onSaved,
}: {
  rule: RetentionRule;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [input, setInput] = useState<RuleEditInput>(() => ruleInputOf(rule));
  const [errors, setErrors] = useState<RuleEditErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);
  const [baseVersion, setBaseVersion] = useState(rule.version);
  const update = useUpdateRetentionRule();
  const set = (patch: Partial<RuleEditInput>) => setInput((current) => ({ ...current, ...patch }));

  async function save() {
    const found = validateRuleEdit(input);
    setErrors(found);
    setServerError(null);
    setIsConflict(false);
    if (Object.keys(found).length > 0) return;
    try {
      await update.mutateAsync({
        ruleCode: rule.ruleCode,
        version: baseVersion,
        body: toRuleBody(input),
      });
      onSaved(`규칙 ${rule.ruleCode}의 값을 저장했습니다.`);
    } catch (caught) {
      setIsConflict(caught instanceof ApiError && caught.code === "VERSION_CONFLICT");
      setServerError(describeSystemError(caught, "규칙을 저장하지 못했습니다."));
    }
  }

  function loadLatest() {
    setInput(ruleInputOf(rule));
    setBaseVersion(rule.version);
    setServerError(null);
    setIsConflict(false);
    setErrors({});
  }

  return (
    <Modal
      isOpen
      size="wide"
      title={`보관 규칙 ${rule.ruleCode} 수정`}
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose}>
            닫기
          </Button>
          <Button variant="submit" isLoading={update.isPending} onClick={() => void save()}>
            저장
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body font-semibold text-ink">{rule.dataGroupLabel}</p>
        <p className="text-caption text-ink-2">
          기산점은 {ANCHOR_LABELS[rule.anchorEvent] ?? rule.anchorEvent}이며 이 화면에서 바꾸지
          않습니다. 값 변경은 이후 새로 생기거나 종결되는 행부터 적용되고 이미 정한 삭제 예정일은
          다시 계산하지 않습니다. 변경 사유는 감사 로그에 기록됩니다.
        </p>
        <TextField
          label="보관 일수"
          kind="number"
          required
          value={input.retentionDays}
          onValueChange={(retentionDays) => set({ retentionDays })}
          error={errors.retentionDays}
        />
        <TextAreaField
          label="근거 메모"
          rows={2}
          value={input.basisNote}
          onValueChange={(basisNote) => set({ basisNote })}
          error={errors.basisNote}
          hint="근거 조항을 확인하지 못했으면 검토 대상 법령 이름만 적습니다."
        />
        <SelectField
          label="확인 상태"
          value={input.status}
          options={RULE_STATUS_OPTIONS}
          onValueChange={(status) => set({ status })}
          error={errors.status}
        />
        <TextAreaField
          label="변경 사유"
          rows={2}
          value={input.changeReason}
          onValueChange={(changeReason) => set({ changeReason })}
          error={errors.changeReason}
        />
        {serverError ? <FormMessage tone="error">{serverError}</FormMessage> : null}
        {isConflict ? (
          <div>
            <Button variant="outlined" size="sm" onClick={loadLatest}>
              최신 값 불러오기
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
