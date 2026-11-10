"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { operatorQueryKey } from "@/features/auth/hooks/use-auth-context";
import { AUTH_ROUTES } from "@/features/auth/model/routes";
import { ApiError } from "@/shared/api/client";
import { Button } from "@/shared/components/ui/button";
import { TextField } from "@/shared/components/ui/text-field";
import { fieldErrorMap, formatWait } from "@/shared/lib/api-messages";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { acceptInvitation, enrollInvitationMfa } from "../api/ops-auth-api";
import type { MfaEnrollment } from "../api/ops-auth-api";
import { formatRemaining, useNow } from "../model/use-now";
import { OpsNotice, OpsPublicFrame, primaryLinkClass } from "./ops-public-frame";

const OTP_PATTERN = /^\d{6}$/;

type Restart = { title: string; description: string; showLogin?: boolean };

function toRestart(error: unknown): Restart | null {
  if (!(error instanceof ApiError)) return null;
  if (error.code === "OPERATOR_ALREADY_EXISTS") {
    return {
      title: "이미 운영자 계정이 있습니다",
      description:
        "이 카카오 계정은 이미 운영자 계정으로 등록되어 있습니다. 운영자 로그인을 이용해 주세요.",
      showLogin: true,
    };
  }
  if (error.code === "INVITATION_NOT_USABLE") {
    return {
      title: "사용할 수 없는 초대입니다",
      description:
        "초대가 만료되었거나 취소되었거나 이미 수락되었습니다. 보안관리자에게 새 초대를 요청해 주세요.",
    };
  }
  if (error.status === 401 && error.code !== "MFA_CODE_INVALID") {
    return {
      title: "인증 앱 등록 시간이 지났습니다",
      description:
        "카카오 인증 뒤 15분이 지났거나 인증 정보가 없습니다. 초대 링크부터 다시 시작해 주세요.",
    };
  }
  return null;
}

function describeFailure(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "MFA_CODE_INVALID") return "확인 코드가 맞지 않습니다. 다시 입력해 주세요.";
    if (error.status === 429) {
      return error.retryAfterSeconds
        ? `확인 코드 입력이 분당 5회를 넘었습니다. ${formatWait(error.retryAfterSeconds)} 뒤에 다시 시도해 주세요.`
        : "확인 코드 입력이 분당 5회를 넘었습니다. 잠시 뒤에 다시 시도해 주세요.";
    }
    if (error.status === 400) {
      return fieldErrorMap(error).otpCode ?? "인증 앱의 6자리 숫자를 입력해 주세요.";
    }
  }
  return "처리하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.";
}

function groupSecret(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

function isOtpauth(uri: string): boolean {
  return uri.startsWith("otpauth://");
}

function isImageData(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("data:image/");
}

export function InvitationEnrollScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [isIssuing, setIsIssuing] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [restart, setRestart] = useState<Restart | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const started = useRef(false);
  const now = useNow();

  async function issue() {
    setIsIssuing(true);
    setLoadError(null);
    setMessage(null);
    setCodeError(null);
    try {
      setEnrollment(await enrollInvitationMfa());
      setCode("");
    } catch (caught) {
      const next = toRestart(caught);
      if (next) setRestart(next);
      else setLoadError(caught);
    } finally {
      setIsIssuing(false);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void issue();
  }, []);

  async function submit() {
    if (!OTP_PATTERN.test(code)) {
      setCodeError("인증 앱의 6자리 숫자를 입력해 주세요.");
      return;
    }
    setIsSubmitting(true);
    setCodeError(null);
    setMessage(null);
    try {
      const operator = await acceptInvitation(code);
      queryClient.setQueryData(operatorQueryKey, {
        operatorId: operator.operatorId,
        name: operator.name,
        roles: operator.roles,
      });
      router.replace(AUTH_ROUTES.opsHome);
    } catch (caught) {
      const next = toRestart(caught);
      if (next) setRestart(next);
      else {
        setCode("");
        setMessage(describeFailure(caught));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (restart) {
    return (
      <OpsPublicFrame title={restart.title} description={restart.description}>
        {restart.showLogin ? (
          <a href={AUTH_ROUTES.opsLogin} className={primaryLinkClass}>
            운영자 로그인으로 이동
          </a>
        ) : null}
      </OpsPublicFrame>
    );
  }
  if (loadError) {
    return (
      <OpsPublicFrame title="인증 앱 등록">
        <OpsNotice tone="error">
          등록 정보를 불러오지 못했습니다. 잠시 뒤에 다시 시도해 주세요.
        </OpsNotice>
        <Button onClick={() => void issue()} isLoading={isIssuing}>
          다시 시도
        </Button>
      </OpsPublicFrame>
    );
  }
  if (enrollment === null) {
    return (
      <OpsPublicFrame title="인증 앱 등록">
        <p role="status" className="text-body text-ink-2">
          등록 정보를 준비하는 중입니다.
        </p>
      </OpsPublicFrame>
    );
  }

  const remainingSeconds = (new Date(enrollment.enrollmentExpiresAt).getTime() - now) / 1000;
  const isExpired = remainingSeconds <= 0;

  return (
    <OpsPublicFrame
      title="인증 앱 등록"
      description="인증 앱에 아래 비밀값을 등록한 뒤 앱에 표시된 6자리 확인 코드를 입력해 주세요."
    >
      {isExpired ? (
        <OpsNotice tone="error">
          등록 시간이 지났습니다. 초대 링크부터 다시 시작해 주세요.
        </OpsNotice>
      ) : (
        <OpsNotice>
          남은 시간 <span role="timer">{formatRemaining(remainingSeconds)}</span> (
          {formatSeoulDateTime(enrollment.enrollmentExpiresAt)}까지)
        </OpsNotice>
      )}
      {isImageData(enrollment.qrImageUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={enrollment.qrImageUrl}
          alt="인증 앱 등록용 QR 코드"
          className="mx-auto h-40 w-40"
        />
      ) : null}
      <div>
        <p className="text-caption font-semibold text-ink-2">수동 입력 비밀값</p>
        <p
          aria-label="수동 입력 비밀값"
          className="mt-1 break-all rounded-control border border-line bg-surface px-4 py-3 font-mono text-body text-ink"
        >
          {groupSecret(enrollment.secret)}
        </p>
        {isOtpauth(enrollment.otpauthUri) ? (
          <a
            href={enrollment.otpauthUri}
            className="mt-2 inline-block text-caption text-primary underline"
          >
            휴대폰의 인증 앱에서 바로 열기
          </a>
        ) : null}
        <p className="mt-2 text-caption text-ink-2">
          이 비밀값은 이 화면에서만 볼 수 있고 다시 확인할 수 없습니다. 다른 곳에 저장하거나
          공유하지 마세요.
        </p>
      </div>
      {message ? <OpsNotice tone="error">{message}</OpsNotice> : null}
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
          disabled={isExpired}
          error={codeError ?? undefined}
        />
        <Button type="submit" fullWidth isLoading={isSubmitting} disabled={isExpired}>
          등록 완료
        </Button>
      </form>
      <Button variant="outlined" onClick={() => void issue()} isLoading={isIssuing}>
        비밀값 다시 발급
      </Button>
      <p className="text-caption text-ink-2">
        다시 발급하면 이전 비밀값은 사용할 수 없습니다. 인증 앱에 먼저 등록한 항목이 있다면 지우고
        새 비밀값으로 등록해 주세요. 확인 코드는 분당 5회까지 입력할 수 있습니다.
      </p>
    </OpsPublicFrame>
  );
}
