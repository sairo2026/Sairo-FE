"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { operatorQueryKey } from "@/features/auth/hooks/use-auth-context";
import { AUTH_ROUTES } from "@/features/auth/model/routes";
import { ApiError } from "@/shared/api/client";
import { Button } from "@/shared/components/ui/button";
import { TextField } from "@/shared/components/ui/text-field";
import { fieldErrorMap, formatWait } from "@/shared/lib/api-messages";
import { verifyOperatorMfa } from "../api/ops-auth-api";
import { useNow } from "../model/use-now";
import { OpsNotice, OpsPublicFrame, primaryLinkClass } from "./ops-public-frame";

const MAX_FAILURES = 5;
const DEFAULT_LOCK_SECONDS = 900;
const OTP_PATTERN = /^\d{6}$/;

type Problem =
  | { kind: "invalid"; failures: number; remaining: number | null }
  | { kind: "locked"; until: number }
  | { kind: "no-session" }
  | { kind: "field"; message: string }
  | { kind: "other"; message: string };

function toProblem(error: unknown, failures: number): Problem {
  if (error instanceof ApiError) {
    if (error.code === "MFA_LOCKED") {
      const seconds = error.retryAfterSeconds ?? DEFAULT_LOCK_SECONDS;
      return { kind: "locked", until: Date.now() + seconds * 1000 };
    }
    if (error.code === "MFA_CODE_INVALID") {
      return { kind: "invalid", failures, remaining: error.remainingAttempts ?? null };
    }
    if (error.status === 401) return { kind: "no-session" };
    if (error.status === 400) {
      return {
        kind: "field",
        message: fieldErrorMap(error).otpCode ?? "인증 앱의 6자리 숫자를 입력해 주세요.",
      };
    }
    if (error.status === 429) {
      return { kind: "other", message: "요청이 너무 많습니다. 잠시 뒤에 다시 시도해 주세요." };
    }
  }
  return { kind: "other", message: "확인하지 못했습니다. 잠시 뒤에 다시 시도해 주세요." };
}

export function OpsMfaScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [failures, setFailures] = useState(0);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [isPending, setIsPending] = useState(false);
  const now = useNow();

  const lockedUntil = problem?.kind === "locked" ? problem.until : 0;
  const isLocked = lockedUntil > now;
  const lockSeconds = Math.ceil((lockedUntil - now) / 1000);

  async function submit() {
    if (!OTP_PATTERN.test(code)) {
      setProblem({ kind: "field", message: "인증 앱의 6자리 숫자를 입력해 주세요." });
      return;
    }
    setIsPending(true);
    setProblem(null);
    try {
      const operator = await verifyOperatorMfa(code);
      queryClient.setQueryData(operatorQueryKey, {
        operatorId: operator.operatorId,
        name: operator.name,
        roles: operator.roles,
      });
      router.replace(AUTH_ROUTES.opsHome);
    } catch (caught) {
      setCode("");
      const isWrongCode = caught instanceof ApiError && caught.code === "MFA_CODE_INVALID";
      const next = failures + (isWrongCode ? 1 : 0);
      setFailures(next);
      setProblem(toProblem(caught, next));
    } finally {
      setIsPending(false);
    }
  }

  if (problem?.kind === "no-session") {
    return (
      <OpsPublicFrame title="2차 인증">
        <OpsNotice tone="error">
          진행 중인 로그인이 없거나 시간이 지났습니다. 운영자 로그인부터 다시 시작해 주세요.
        </OpsNotice>
        <a href={AUTH_ROUTES.opsLogin} className={primaryLinkClass}>
          운영자 로그인으로 이동
        </a>
      </OpsPublicFrame>
    );
  }

  return (
    <OpsPublicFrame
      title="2차 인증"
      description="인증 앱에 표시된 6자리 확인 코드를 입력해 주세요."
    >
      {isLocked ? (
        <OpsNotice tone="error">
          확인 코드를 연속 {MAX_FAILURES}회 틀려 잠겼습니다. {formatWait(lockSeconds)} 뒤에 다시
          시도해 주세요.
        </OpsNotice>
      ) : null}
      {problem?.kind === "invalid" ? (
        <OpsNotice tone="error">
          확인 코드가 맞지 않습니다.{" "}
          {problem.remaining !== null
            ? `${problem.remaining}회 더 틀리면 15분 동안 잠깁니다.`
            : `연속 ${MAX_FAILURES}회 틀리면 15분 동안 잠깁니다. (현재 ${problem.failures}회)`}
        </OpsNotice>
      ) : null}
      {problem?.kind === "other" ? <OpsNotice tone="error">{problem.message}</OpsNotice> : null}
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <TextField
          label="확인 코드"
          kind="number"
          value={code}
          onValueChange={setCode}
          maxLength={6}
          autoComplete="one-time-code"
          disabled={isLocked}
          error={problem?.kind === "field" ? problem.message : undefined}
        />
        <Button type="submit" fullWidth isLoading={isPending} disabled={isLocked}>
          확인
        </Button>
      </form>
      <a href={AUTH_ROUTES.opsLogin} className="text-caption text-ink-2 underline">
        다른 카카오 계정으로 다시 로그인
      </a>
    </OpsPublicFrame>
  );
}
