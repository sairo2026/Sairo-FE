"use client";

import { useState } from "react";
import { z } from "zod";
import { OpsStepUpResponseSchema } from "@/lib/api/contracts/ops.schema";
import { ApiError, apiFetch } from "@/shared/api/client";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { TextField } from "@/shared/components/ui/text-field";
import { formatWait } from "@/shared/lib/api-messages";

export const OPS_STEP_UP_PATH = "/api/ops/auth/step-up";
const OTP_PATTERN = z.string().regex(/^\d{6}$/);

export function stepUpOperator(otpCode: string) {
  return apiFetch(OPS_STEP_UP_PATH, {
    method: "POST",
    body: { otpCode },
    schema: OpsStepUpResponseSchema,
    skipStepUp: true,
    skipAuthEvents: true,
  });
}

function toMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "MFA_LOCKED" || error.status === 429) {
      return error.retryAfterSeconds
        ? `확인 코드를 여러 번 틀려 잠겼습니다. ${formatWait(error.retryAfterSeconds)} 뒤에 다시 시도해 주세요.`
        : "확인 코드를 여러 번 틀려 잠겼습니다. 잠시 뒤에 다시 시도해 주세요.";
    }
    if (error.code === "MFA_CODE_INVALID") return "확인 코드가 맞지 않습니다.";
  }
  return "재인증하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.";
}

/** 고위험 실행 직전에 인증 앱의 확인 코드로 본인을 다시 확인한다. 성공하면 5분 동안 유효하다. */
export function OpsStepUpDialog({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failureCount, setFailureCount] = useState(0);
  const [isPending, setIsPending] = useState(false);

  async function submit() {
    if (!OTP_PATTERN.safeParse(code).success) {
      setErrorMessage("인증 앱의 6자리 숫자를 입력해 주세요.");
      return;
    }
    setIsPending(true);
    setErrorMessage(null);
    try {
      await stepUpOperator(code);
      onSuccess();
    } catch (caught) {
      setCode("");
      if (caught instanceof ApiError && caught.code === "MFA_CODE_INVALID") {
        setFailureCount((count) => count + 1);
      }
      setErrorMessage(toMessage(caught));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Modal
      isOpen
      title="운영자 재인증"
      onClose={onCancel}
      footer={
        <>
          <Button variant="cancel" onClick={onCancel}>
            취소
          </Button>
          <Button variant="submit" isLoading={isPending} onClick={() => void submit()}>
            확인
          </Button>
        </>
      }
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-4"
      >
        <p>중요한 작업이라 인증 앱의 확인 코드를 다시 입력합니다. 확인하면 5분 동안 유효합니다.</p>
        <TextField
          label="확인 코드"
          kind="number"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onValueChange={setCode}
          error={errorMessage ?? undefined}
        />
        {failureCount > 0 ? (
          <p className="text-caption text-ink-2">
            연속 5회 틀리면 15분 동안 잠깁니다. 현재 {failureCount}회 틀렸습니다.
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
