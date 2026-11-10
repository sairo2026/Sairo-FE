"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "@/shared/api/client";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { TextField } from "@/shared/components/ui/text-field";
import { KAKAO_STEP_UP_START_PATH, stepUpWithPassword } from "../api/auth-context.api";

const stepUpFormSchema = z.object({ password: z.string().min(1, "비밀번호를 입력해 주세요.") });
type StepUpForm = z.infer<typeof stepUpFormSchema>;

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "INVALID_CREDENTIALS") return "비밀번호가 맞지 않습니다.";
    if (error.status === 429) {
      return error.retryAfterSeconds
        ? `시도가 너무 많습니다. ${error.retryAfterSeconds}초 뒤에 다시 시도해 주세요.`
        : "시도가 너무 많습니다. 잠시 뒤에 다시 시도해 주세요.";
    }
  }
  return "재인증하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.";
}

/** 결제수단 변경, 대표 이전 같은 중요한 작업 전에 10분 안에 본인을 다시 확인한다. */
export function StepUpDialog({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<StepUpForm>({
    resolver: zodResolver(stepUpFormSchema),
    defaultValues: { password: "" },
  });

  const submit = handleSubmit(async ({ password }) => {
    try {
      await stepUpWithPassword({ password });
      onSuccess();
    } catch (caught) {
      setError("password", { message: toErrorMessage(caught) });
    }
  });

  return (
    <Modal isOpen title="본인 확인이 필요합니다" onClose={onCancel}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <p>
          중요한 작업이라 비밀번호를 다시 확인합니다. 카카오로 가입했다면 카카오로 확인해 주세요.
        </p>
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <TextField
              label="비밀번호"
              kind="password"
              value={field.value}
              onValueChange={field.onChange}
              error={errors.password?.message}
              autoComplete="current-password"
            />
          )}
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="cancel" onClick={onCancel}>
            취소
          </Button>
          <Button
            variant="outlined"
            onClick={() => window.location.assign(KAKAO_STEP_UP_START_PATH)}
          >
            카카오로 확인
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            확인
          </Button>
        </div>
      </form>
    </Modal>
  );
}
