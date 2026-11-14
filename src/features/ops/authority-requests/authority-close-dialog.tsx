"use client";

import { useState } from "react";
import { ApiError } from "@/shared/api/client";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { useHasOpsRole } from "../model/ops-session";
import { DateTimePair, FormMessage } from "../system-common/system-fields";
import { describeSystemError } from "../system-common/system-form";
import { useCloseAuthorityRequest } from "./authority-api";
import {
  CLOSE_DECISION_OPTIONS,
  EMPTY_CLOSE_INPUT,
  NOTICE_OPTIONS,
  closeAvailability,
  isProvideDecision,
  toCloseBody,
  validateClose,
} from "./authority-model";
import type { AuthorityRecord, AuthorityRow, CloseErrors, CloseInput } from "./authority-model";

const AVAILABILITY_MESSAGE = {
  NO_SECURITY_ADMIN: "제공 결정은 기록자와 다른 보안관리자만 종결할 수 있습니다.",
  SELF_RECORDED:
    "본인이 기록한 요청의 제공 결정은 직접 승인할 수 없습니다. 기록자와 다른 보안관리자가 종결해 주세요.",
} as const;

export function AuthorityCloseDialog({
  row,
  isSelfRecorded,
  onSelfForbidden,
  onClose,
  onClosed,
}: {
  row: AuthorityRow;
  isSelfRecorded: boolean;
  onSelfForbidden: () => void;
  onClose: () => void;
  onClosed: (record: AuthorityRecord) => void;
}) {
  const isSecurityAdmin = useHasOpsRole(["SECURITY_ADMIN"]);
  const [input, setInput] = useState<CloseInput>(EMPTY_CLOSE_INPUT);
  const [errors, setErrors] = useState<CloseErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const close = useCloseAuthorityRequest();
  const set = (patch: Partial<CloseInput>) => setInput((current) => ({ ...current, ...patch }));
  const availability = closeAvailability(input.decision, { isSecurityAdmin, isSelfRecorded });

  async function submit() {
    const found = validateClose(input);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;
    try {
      const record = await close.mutateAsync({
        requestId: row.requestId,
        body: toCloseBody(input),
      });
      onClosed(record);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "SELF_APPROVAL_FORBIDDEN")
        onSelfForbidden();
      setServerError(describeSystemError(caught, "요청을 종결하지 못했습니다."));
    }
  }

  return (
    <Modal
      isOpen
      size="wide"
      title={`요청 ${row.requestId} 종결`}
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose}>
            닫기
          </Button>
          <Button
            variant="submit"
            disabled={availability !== "OK"}
            isLoading={close.isPending}
            onClick={() => void submit()}
          >
            종결
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body font-semibold text-ink">{row.agencyName}</p>
        <p className="text-caption text-ink-2">
          종결하면 되돌릴 수 없고 기록은 삭제 예정일까지 보관됩니다. 제공 결정(제공, 일부 제공)은
          기록자와 다른 보안관리자만 할 수 있고 감사 로그에 남습니다.
        </p>
        <SelectField
          label="제공 결정"
          required
          value={input.decision}
          options={CLOSE_DECISION_OPTIONS}
          onValueChange={(decision) => set({ decision })}
          error={errors.decision}
        />
        {availability !== "OK" ? (
          <p role="alert" className="text-caption text-danger">
            {AVAILABILITY_MESSAGE[availability]}
          </p>
        ) : null}
        {isProvideDecision(input.decision) ? (
          <>
            <TextAreaField
              label="제공한 자료의 범위"
              rows={2}
              value={input.providedItems}
              onValueChange={(providedItems) => set({ providedItems })}
              error={errors.providedItems}
            />
            <DateTimePair
              label="제공 시각"
              date={input.providedDate}
              time={input.providedTime}
              onDateChange={(providedDate) => set({ providedDate })}
              onTimeChange={(providedTime) => set({ providedTime })}
              error={errors.providedDate}
            />
          </>
        ) : null}
        <SelectField
          label="사무소 통지 검토 결과"
          required
          value={input.officeNoticeStatus}
          options={NOTICE_OPTIONS}
          onValueChange={(officeNoticeStatus) => set({ officeNoticeStatus })}
          error={errors.officeNoticeStatus}
        />
        <TextAreaField
          label="종결 메모"
          rows={2}
          value={input.closeNote}
          onValueChange={(closeNote) => set({ closeNote })}
        />
        {serverError ? <FormMessage tone="error">{serverError}</FormMessage> : null}
      </div>
    </Modal>
  );
}
