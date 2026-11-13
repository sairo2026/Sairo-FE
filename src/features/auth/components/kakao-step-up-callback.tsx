"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { emitStepUpCompleted } from "@/shared/api/auth-events";
import { AuthFrame, FormAlert } from "@/shared/components/feedback/form-frame";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Button } from "@/shared/components/ui/button";
import { takeStepUpReturn } from "@/shared/lib/step-up-return";

export const KAKAO_STEP_UP_CALLBACK_PATH = "/auth/kakao/step-up/callback";

const CANCELLED_MESSAGE =
  "카카오 확인이 취소되었거나 시간이 지나 끝나지 않았습니다. 하던 화면에서 다시 시도해 주세요.";

const FAILURE_MESSAGES: Record<string, string> = {
  STEP_UP_ACCOUNT_MISMATCH:
    "로그인한 계정에 연결된 카카오 계정이 아닙니다. 같은 카카오 계정으로 다시 확인해 주세요.",
  INVALID_REQUEST: CANCELLED_MESSAGE,
  UNAUTHENTICATED: "로그인이 끝났습니다. 다시 로그인한 뒤 진행해 주세요.",
};

const FALLBACK_MESSAGE = "카카오로 본인 확인을 하지 못했습니다. 하던 화면에서 다시 시도해 주세요.";

export function KakaoStepUpCallback({ error }: { error: string | null }) {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    window.history.replaceState(null, "", KAKAO_STEP_UP_CALLBACK_PATH);
    if (error !== null) return;
    void Promise.resolve().then(() => {
      emitStepUpCompleted();
      router.replace(takeStepUpReturn());
    });
  }, [error, router]);

  if (error === null) return <PageSkeleton label="카카오로 본인 확인을 마치는 중입니다." />;
  return (
    <AuthFrame title="본인 확인을 마치지 못했습니다" width="sm">
      <div className="flex flex-col gap-4">
        <FormAlert>{FAILURE_MESSAGES[error] ?? FALLBACK_MESSAGE}</FormAlert>
        <Button variant="outlined" fullWidth onClick={() => router.replace(takeStepUpReturn())}>
          하던 화면으로 돌아가기
        </Button>
      </div>
    </AuthFrame>
  );
}
