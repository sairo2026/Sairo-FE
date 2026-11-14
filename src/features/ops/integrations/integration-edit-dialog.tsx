"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { Checkbox, SelectField, Toggle } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { FormMessage } from "../system-common/system-fields";
import { describeSystemError } from "../system-common/system-form";
import { useUpdateIntegration } from "./integrations-api";
import {
  CONSENT_OPTIONS,
  CONTRACT_OPTIONS,
  ENVIRONMENT_LABELS,
  FIELD_MAX,
  editInputOf,
  isDestinationChange,
  toIntegrationPatchBody,
  validateIntegrationEdit,
} from "./integrations-model";
import type {
  Integration,
  IntegrationEditErrors,
  IntegrationEditInput,
} from "./integrations-model";

export function IntegrationEditDialog({
  row,
  onClose,
  onSaved,
}: {
  row: Integration;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [input, setInput] = useState<IntegrationEditInput>(() => editInputOf(row));
  const [errors, setErrors] = useState<IntegrationEditErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const update = useUpdateIntegration();
  const set = (patch: Partial<IntegrationEditInput>) =>
    setInput((current) => ({ ...current, ...patch }));
  const isProduction = row.environment === "PRODUCTION";
  const body = toIntegrationPatchBody(row, input);
  const needsReview = isProduction && isDestinationChange(row, body);

  async function save() {
    const found = validateIntegrationEdit(input);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;
    try {
      await update.mutateAsync({ integrationId: row.integrationId, body });
      onSaved(`연동 ${row.integrationId}의 설정을 저장했습니다.`);
    } catch (caught) {
      setServerError(describeSystemError(caught, "연동 설정을 저장하지 못했습니다."));
    }
  }

  return (
    <Modal
      isOpen
      size="wide"
      title={`연동 ${row.integrationId} 설정 변경`}
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
        <p className="text-body font-semibold text-ink">
          {ENVIRONMENT_LABELS[row.environment] ?? row.environment} 환경 · {row.provider} ·{" "}
          {row.functionCode}
        </p>
        {isProduction ? (
          <p className="text-caption text-ink-2">
            운영 환경의 활성화와 공급자·처리지역 변경은 계약 체결, 동의, 고지 점검과 승인, 회사 정보
            게시·수신 시험이 끝난 뒤에만 적용됩니다. 끝나지 않았으면 저장이 거절됩니다. 변경 내용은
            감사 로그에 기록됩니다.
          </p>
        ) : (
          <p className="text-caption text-ink-2">
            시험 환경에서는 실제 과금과 운영 고객 발송이 차단됩니다. 비밀값은 이 화면에서 바꾸지
            않으며 저장소 참조 ID로만 관리합니다.
          </p>
        )}
        <div className="flex items-center gap-3">
          <Toggle
            label="연동 활성"
            checked={input.enabled}
            onCheckedChange={(enabled) => set({ enabled })}
          />
          <span className="text-body text-ink">{input.enabled ? "활성" : "비활성"}</span>
        </div>
        <TextField
          label="공급자"
          maxLength={FIELD_MAX}
          value={input.provider}
          onValueChange={(provider) => set({ provider })}
          error={errors.provider}
        />
        <TextField
          label="처리지역"
          maxLength={FIELD_MAX}
          value={input.processingRegion}
          onValueChange={(processingRegion) => set({ processingRegion })}
          error={errors.processingRegion}
        />
        <TextAreaField
          label="보유기간과 파기 기준"
          rows={2}
          value={input.retentionPolicy}
          onValueChange={(retentionPolicy) => set({ retentionPolicy })}
          error={errors.retentionPolicy}
        />
        <SelectField
          label="계약 상태"
          value={input.contractStatus}
          options={CONTRACT_OPTIONS}
          onValueChange={(contractStatus) => set({ contractStatus })}
        />
        <SelectField
          label="동의 상태"
          value={input.consentStatus}
          options={CONSENT_OPTIONS}
          onValueChange={(consentStatus) => set({ consentStatus })}
        />
        <Checkbox
          label="계약·고지 점검을 마쳤습니다"
          checked={input.contractNoticeReviewed}
          onCheckedChange={(contractNoticeReviewed) => set({ contractNoticeReviewed })}
        />
        {needsReview && !input.contractNoticeReviewed && row.contractNoticeReviewedAt === null ? (
          <p className="text-caption text-ink-2">
            계약·고지 점검 시각이 비어 있습니다. 점검을 마쳤다면 체크한 뒤 저장해 주세요.
          </p>
        ) : null}
        {serverError ? <FormMessage tone="error">{serverError}</FormMessage> : null}
      </div>
    </Modal>
  );
}
