"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { Button } from "@/shared/components/ui/button";
import { TextField } from "@/shared/components/ui/text-field";
import { requestPasswordReset, resetPassword } from "../api/account.api";
import { useCountdown } from "../hooks/use-countdown";
import { describeAuthError } from "@/shared/lib/api-messages";
import {
  PASSWORD_STRENGTH_LABEL,
  passwordStrength,
  validatePasswordInput,
} from "../model/password-policy";
import { AuthFrame, FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PasswordResetRequestForm({
  title = "비밀번호 찾기",
  description = "가입한 이메일 주소를 입력하면 비밀번호를 다시 만들 수 있는 링크를 보내드립니다.",
}: {
  title?: string;
  description?: string;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [isSent, setIsSent] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const cooldown = useCountdown();

  async function submit() {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("이메일 주소를 올바르게 입력해 주세요.");
      return;
    }
    setIsBusy(true);
    setError(undefined);
    try {
      await requestPasswordReset({ email: email.trim() });
      setIsSent(true);
      cooldown.start(60);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 429 && caught.retryAfterSeconds) {
        cooldown.start(caught.retryAfterSeconds);
      }
      setError(
        describeAuthError(caught, "링크를 보내지 못했습니다. 잠시 뒤에 다시 시도해 주세요."),
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <AuthFrame title={title} description={description} width="sm">
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <TextField
          label="이메일"
          value={email}
          onValueChange={(next) => {
            setEmail(next);
            setError(undefined);
          }}
          inputMode="email"
          autoComplete="email"
          placeholder="email@email.com"
          error={error}
        />
        {isSent ? (
          <FormNotice>
            입력한 주소로 가입한 계정이 있다면 재설정 링크를 보냈습니다. 링크는 30분 동안 한 번만
            사용할 수 있고, 다시 요청하면 이전 링크는 사라집니다.
          </FormNotice>
        ) : null}
        <Button type="submit" fullWidth isLoading={isBusy} disabled={cooldown.remaining > 0}>
          {cooldown.remaining > 0
            ? `${cooldown.remaining}초 뒤 다시 보내기`
            : isSent
              ? "다시 보내기"
              : "재설정 링크 받기"}
        </Button>
        <Link
          href="/login"
          className="text-center text-caption font-semibold text-primary hover:underline"
        >
          로그인으로 돌아가기
        </Link>
      </form>
    </AuthFrame>
  );
}

export function PasswordResetForm({ token }: { token: string | null }) {
  const tokenRef = useRef(token);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string>();
  const [confirmError, setConfirmError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [isExpired, setIsExpired] = useState(token === null);
  const [isDone, setIsDone] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (token) window.history.replaceState(null, "", "/password/reset");
  }, [token]);

  if (isExpired) {
    return (
      <PasswordResetRequestForm
        title="링크를 사용할 수 없습니다"
        description="링크가 만료되었거나 이미 사용했습니다. 이메일을 입력하면 새 링크를 보내드립니다."
      />
    );
  }

  if (isDone) {
    return (
      <AuthFrame title="비밀번호를 바꿨습니다" width="sm">
        <div className="flex flex-col gap-4">
          <FormNotice>
            보안을 위해 이전에 로그인한 모든 기기에서 로그아웃되었습니다. 새 비밀번호로 다시
            로그인해 주세요.
          </FormNotice>
          <Link
            href="/login/email"
            className="inline-flex h-12 items-center justify-center rounded-control bg-primary px-10 font-bold text-white hover:bg-primary-hover"
          >
            로그인
          </Link>
        </div>
      </AuthFrame>
    );
  }

  async function submit() {
    const problem = validatePasswordInput(password);
    setPasswordError(problem ?? undefined);
    const mismatch = password !== confirm ? "비밀번호가 일치하지 않습니다." : undefined;
    setConfirmError(mismatch);
    if (problem || mismatch || !tokenRef.current) return;

    setIsBusy(true);
    setFormError(undefined);
    try {
      await resetPassword({ token: tokenRef.current, newPassword: password });
      setIsDone(true);
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.code === "TOKEN_EXPIRED" || error.code === "TOKEN_INVALID")
      ) {
        setIsExpired(true);
        return;
      }
      const passwordField =
        error instanceof ApiError
          ? error.fieldErrors?.find((item) => item.field === "newPassword")
          : undefined;
      if (passwordField) {
        setPasswordError(passwordField.message);
        return;
      }
      setFormError(
        describeAuthError(error, "비밀번호를 바꾸지 못했습니다. 잠시 뒤에 다시 시도해 주세요."),
      );
    } finally {
      setIsBusy(false);
    }
  }

  const strength = passwordStrength(password);

  return (
    <AuthFrame
      title="새 비밀번호 설정"
      description="링크는 30분 동안 한 번만 사용할 수 있습니다. 8자 이상 12자 이하로 만들어 주세요."
      width="sm"
    >
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <TextField
          label="새 비밀번호"
          kind="password"
          value={password}
          onValueChange={(next) => {
            setPassword(next);
            setPasswordError(undefined);
          }}
          autoComplete="new-password"
          error={passwordError}
          statusText={password ? `강도 ${PASSWORD_STRENGTH_LABEL[strength]}` : undefined}
        />
        <TextField
          label="새 비밀번호 확인"
          kind="password"
          value={confirm}
          onValueChange={(next) => {
            setConfirm(next);
            setConfirmError(undefined);
          }}
          autoComplete="new-password"
          error={confirmError}
        />
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        <Button type="submit" fullWidth isLoading={isBusy}>
          비밀번호 바꾸기
        </Button>
      </form>
    </AuthFrame>
  );
}
