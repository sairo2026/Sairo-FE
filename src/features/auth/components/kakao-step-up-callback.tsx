"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { emitStepUpCompleted } from "@/shared/api/auth-events";
import { AuthFrame, FormAlert } from "@/shared/components/feedback/form-frame";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Button } from "@/shared/components/ui/button";
import { describeAuthError } from "@/shared/lib/api-messages";
import { takeStepUpReturn } from "@/shared/lib/step-up-return";
import { completeKakaoStepUp } from "../api/auth-context.api";

export const KAKAO_STEP_UP_CALLBACK_PATH = "/account/step-up/kakao-callback";

const CANCELLED_MESSAGE =
  "카카오 확인이 취소되었거나 시간이 지나 끝나지 않았습니다. 하던 화면에서 다시 시도해 주세요.";

function toFailureMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "STEP_UP_ACCOUNT_MISMATCH") {
      return "로그인한 계정에 연결된 카카오 계정이 아닙니다. 같은 카카오 계정으로 다시 확인해 주세요.";
    }
    if (error.code === "INVALID_REQUEST") return CANCELLED_MESSAGE;
    if (error.isSessionExpired) return "로그인이 끝났습니다. 다시 로그인한 뒤 진행해 주세요.";
  }
  return describeAuthError(
    error,
    "카카오로 본인 확인을 하지 못했습니다. 하던 화면에서 다시 시도해 주세요.",
  );
}

export function KakaoStepUpCallback({
  code,
  state,
  hasError,
}: {
  code: string | null;
  state: string | null;
  hasError: boolean;
}) {
  const router = useRouter();
  const isCancelled = !code || !state || hasError;
  const [apiFailure, setApiFailure] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    window.history.replaceState(null, "", KAKAO_STEP_UP_CALLBACK_PATH);
    if (!code || !state || hasError) return;
    completeKakaoStepUp({ code, state })
      .then(() => {
        emitStepUpCompleted();
        router.replace(takeStepUpReturn());
      })
      .catch((caught: unknown) => setApiFailure(toFailureMessage(caught)));
  }, [code, state, hasError, router]);

  const message = isCancelled ? CANCELLED_MESSAGE : apiFailure;
  if (message === null) return <PageSkeleton label="카카오로 본인 확인을 마치는 중입니다." />;
  return (
    <AuthFrame title="본인 확인을 마치지 못했습니다" width="sm">
      <div className="flex flex-col gap-4">
        <FormAlert>{message}</FormAlert>
        <Button variant="outlined" fullWidth onClick={() => router.replace(takeStepUpReturn())}>
          하던 화면으로 돌아가기
        </Button>
      </div>
    </AuthFrame>
  );
}
