"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { describeOpsError } from "../../model/ops-errors";

export type OpsReasonDialogProps = {
  isOpen: boolean;
  title: string;
  description?: ReactNode;
  reasonLabel?: string;
  reasonHint?: string;
  maxLength?: number;
  confirmLabel: string;
  /** 사유 외 추가 입력과 안내. */
  children?: ReactNode;
  /** 사유 외 조건(추가 입력 검증)이 충족됐는지. */
  isReady?: boolean;
  onSubmit: (reason: string) => Promise<unknown>;
  onClose: () => void;
};

/** 사유 입력이 필요한 처리를 확인받는 대화상자. 사유가 비어 있으면 실행할 수 없다. */
export function OpsReasonDialog({
  isOpen,
  title,
  description,
  reasonLabel = "사유",
  reasonHint,
  maxLength = 500,
  confirmLabel,
  children,
  isReady = true,
  onSubmit,
  onClose,
}: OpsReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmed = reason.trim();
  const canSubmit = trimmed.length > 0 && isReady && !isPending;

  function close() {
    setReason("");
    setErrorMessage(null);
    onClose();
  }

  async function submit() {
    if (!canSubmit) return;
    setIsPending(true);
    setErrorMessage(null);
    try {
      await onSubmit(trimmed);
      setReason("");
      onClose();
    } catch (caught) {
      setErrorMessage(describeOpsError(caught));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={close}
      footer={
        <>
          <Button variant="cancel" onClick={close}>
            취소
          </Button>
          <Button
            variant="submit"
            disabled={!canSubmit}
            isLoading={isPending}
            onClick={() => void submit()}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {description ? <div>{description}</div> : null}
        {children}
        <TextAreaField
          label={reasonLabel}
          value={reason}
          onValueChange={setReason}
          maxLength={maxLength}
          hint={reasonHint}
          rows={4}
        />
        {errorMessage ? (
          <p role="alert" className="text-caption text-danger">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
