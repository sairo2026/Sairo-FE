"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { TextField } from "@/shared/components/ui/text-field";
import {
  KAKAO_LINK_START_PATH,
  ensureStepUp,
  fetchMe,
  linkEmailLoginMethod,
  linkKakaoLoginMethod,
  sendLoginMethodEmailVerification,
  unlinkLoginMethod,
  verifyLoginMethodEmail,
} from "../api/account.api";
import { useCountdown } from "../hooks/use-countdown";
import { WITHDRAWAL_COPY } from "../model/withdrawal-copy";
import { describeAuthError } from "@/shared/lib/api-messages";
import {
  PASSWORD_STRENGTH_LABEL,
  passwordStrength,
  validatePasswordInput,
} from "../model/password-policy";
import { AuthFrame, FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const meQueryKey = ["auth", "me"] as const;

type MethodKey = "email" | "kakao";

export function LoginMethodsScreen() {
  const queryClient = useQueryClient();
  const meQuery = useQuery({ queryKey: meQueryKey, queryFn: fetchMe });
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [isLinkSent, setIsLinkSent] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [pendingUnlink, setPendingUnlink] = useState<MethodKey | null>(null);
  const [isKakaoBusy, setIsKakaoBusy] = useState(false);
  const resend = useCountdown();

  const sendMutation = useMutation({
    mutationFn: sendLoginMethodEmailVerification,
    onSuccess: (result) => {
      setIsLinkSent(true);
      resend.start(result.resendAfterSeconds);
    },
    onError: (caught) => {
      if (caught instanceof ApiError && caught.status === 429 && caught.retryAfterSeconds) {
        resend.start(caught.retryAfterSeconds);
      }
      setEmailError(
        describeAuthError(caught, "인증 링크를 보내지 못했습니다. 다시 시도해 주세요."),
      );
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: unlinkLoginMethod,
    onSuccess: async () => {
      setPendingUnlink(null);
      setMessage("로그인 방식을 해제했습니다.");
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
    onError: (caught) => {
      setPendingUnlink(null);
      setError(describeAuthError(caught, "해제하지 못했습니다. 잠시 뒤에 다시 시도해 주세요."));
    },
  });

  if (meQuery.isPending) return <PageSkeleton label="로그인 방식을 불러오는 중입니다." />;
  if (meQuery.isError) {
    return (
      <ErrorScreen
        kind={toErrorScreenKind(meQuery.error)}
        traceId={meQuery.error instanceof ApiError ? meQuery.error.traceId : undefined}
        onRetry={() => void meQuery.refetch()}
      />
    );
  }

  const me = meQuery.data;
  const hasEmail = me.loginMethods.includes("EMAIL");
  const hasKakao = me.loginMethods.includes("KAKAO");
  const isOnlyMethod = me.loginMethods.length <= 1;

  function sendLink() {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError("이메일 주소를 올바르게 입력해 주세요.");
      return;
    }
    setEmailError(undefined);
    setError(undefined);
    sendMutation.mutate(email.trim());
  }

  async function startKakaoLink() {
    setError(undefined);
    setIsKakaoBusy(true);
    try {
      if (await ensureStepUp()) window.location.assign(KAKAO_LINK_START_PATH);
    } catch (caught) {
      setError(describeAuthError(caught, "카카오 연결을 시작하지 못했습니다. 다시 시도해 주세요."));
    } finally {
      setIsKakaoBusy(false);
    }
  }

  return (
    <AuthFrame
      title="로그인 방식"
      description="연결한 로그인 방식으로 같은 계정에 들어올 수 있습니다. 연결과 해제는 본인 확인을 한 번 더 합니다."
    >
      <div className="flex flex-col gap-6">
        {message ? <FormNotice>{message}</FormNotice> : null}
        {error ? <FormAlert>{error}</FormAlert> : null}

        <section className="flex flex-col gap-3 rounded-control bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-body font-semibold text-ink">이메일 로그인</h2>
              <p className="text-caption text-ink-2">
                {hasEmail ? (me.email ?? "연결됨") : "연결되지 않았습니다."}
              </p>
            </div>
            {hasEmail ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={isOnlyMethod}
                onClick={() => setPendingUnlink("email")}
              >
                해제
              </Button>
            ) : null}
          </div>
          {!hasEmail ? (
            <>
              <TextField
                label="연결할 이메일"
                value={email}
                onValueChange={(next) => {
                  setEmail(next);
                  setEmailError(undefined);
                }}
                inputMode="email"
                autoComplete="email"
                placeholder="email@email.com"
                actionLabel={isLinkSent ? "재발송" : "인증 링크 받기"}
                onAction={sendLink}
                isActionDisabled={sendMutation.isPending || resend.remaining > 0}
                error={emailError}
                statusText={
                  isLinkSent
                    ? "인증 링크를 보냈습니다. 메일의 링크를 열어 비밀번호를 설정하면 연결됩니다."
                    : undefined
                }
                hint="링크는 30분 동안 한 번만 사용할 수 있습니다."
              />
            </>
          ) : null}
        </section>

        <section className="flex flex-col gap-3 rounded-control bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-body font-semibold text-ink">카카오 로그인</h2>
              <p className="text-caption text-ink-2">
                {hasKakao ? "연결됨" : "연결되지 않았습니다."}
              </p>
            </div>
            {hasKakao ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={isOnlyMethod}
                onClick={() => setPendingUnlink("kakao")}
              >
                해제
              </Button>
            ) : (
              <Button
                variant="outlined"
                size="sm"
                isLoading={isKakaoBusy}
                onClick={() => void startKakaoLink()}
              >
                카카오 연결
              </Button>
            )}
          </div>
        </section>

        {isOnlyMethod ? (
          <p className="text-caption text-ink-2">
            로그인 방식이 하나뿐이라 해제할 수 없습니다. 다른 방식을 먼저 연결해 주세요.
          </p>
        ) : null}
      </div>
      <p className="mt-4 text-caption text-ink-2">{WITHDRAWAL_COPY.kakaoUnlinkNotice}</p>
      <ConfirmDialog
        isOpen={pendingUnlink !== null}
        title="로그인 방식을 해제할까요"
        message={
          pendingUnlink === "kakao"
            ? WITHDRAWAL_COPY.kakaoUnlinkConfirm
            : "이메일과 비밀번호로는 더 이상 로그인할 수 없습니다."
        }
        confirmLabel="해제"
        isPending={unlinkMutation.isPending}
        onConfirm={() => pendingUnlink && unlinkMutation.mutate(pendingUnlink)}
        onCancel={() => setPendingUnlink(null)}
      />
    </AuthFrame>
  );
}

export function LoginMethodEmailVerify({ token }: { token: string | null }) {
  const [ticket, setTicket] = useState<string | null>(null);
  const [status, setStatus] = useState<"verifying" | "ready" | "failed" | "done">(
    token ? "verifying" : "failed",
  );
  const [failMessage, setFailMessage] = useState<string>(
    "인증 링크가 올바르지 않습니다. 설정에서 새 링크를 받아 주세요.",
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string>();
  const [confirmError, setConfirmError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);
  const verified = useRef<string | null>(null);

  useEffect(() => {
    if (!token || verified.current === token) return;
    verified.current = token;
    window.history.replaceState(null, "", "/settings/login-methods/verify-email");
    verifyLoginMethodEmail(token)
      .then((result) => {
        setTicket(result.verifiedEmailTicket);
        setStatus("ready");
      })
      .catch((caught: unknown) => {
        setFailMessage(
          describeAuthError(
            caught,
            "인증 링크를 확인하지 못했습니다. 설정에서 새 링크를 받아 주세요.",
          ),
        );
        setStatus("failed");
      });
  }, [token]);

  if (status === "verifying") return <PageSkeleton label="이메일 인증을 확인하는 중입니다." />;
  if (status === "failed") {
    return (
      <AuthFrame title="인증 링크를 사용할 수 없습니다" width="sm">
        <div className="flex flex-col gap-4">
          <FormAlert>{failMessage}</FormAlert>
          <Link
            href="/settings/login-methods"
            className="text-caption font-semibold text-primary hover:underline"
          >
            로그인 방식으로 돌아가기
          </Link>
        </div>
      </AuthFrame>
    );
  }
  if (status === "done") {
    return (
      <AuthFrame title="이메일 로그인을 연결했습니다" width="sm">
        <Link
          href="/settings/login-methods"
          className="text-caption font-semibold text-primary hover:underline"
        >
          로그인 방식으로 돌아가기
        </Link>
      </AuthFrame>
    );
  }

  async function submit() {
    const problem = validatePasswordInput(password);
    setPasswordError(problem ?? undefined);
    const mismatch = password !== confirm ? "비밀번호가 일치하지 않습니다." : undefined;
    setConfirmError(mismatch);
    if (problem || mismatch || !ticket) return;
    setIsBusy(true);
    setFormError(undefined);
    try {
      await linkEmailLoginMethod({ verifiedEmailTicket: ticket, password });
      setStatus("done");
    } catch (caught) {
      if (
        caught instanceof ApiError &&
        (caught.code === "TOKEN_EXPIRED" || caught.code === "TOKEN_INVALID")
      ) {
        setFailMessage("인증 시간이 지났습니다. 설정에서 새 링크를 받아 주세요.");
        setStatus("failed");
        return;
      }
      setFormError(describeAuthError(caught, "연결하지 못했습니다. 잠시 뒤에 다시 시도해 주세요."));
    } finally {
      setIsBusy(false);
    }
  }

  const strength = passwordStrength(password);
  return (
    <AuthFrame
      title="이메일 로그인 비밀번호 설정"
      description="이메일 인증을 마쳤습니다. 이 이메일로 로그인할 때 쓸 비밀번호를 정해 주세요."
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
          label="비밀번호"
          kind="password"
          value={password}
          onValueChange={(next) => {
            setPassword(next);
            setPasswordError(undefined);
          }}
          autoComplete="new-password"
          error={passwordError}
          statusText={password ? `강도 ${PASSWORD_STRENGTH_LABEL[strength]}` : undefined}
          hint="8자 이상 12자 이하"
        />
        <TextField
          label="비밀번호 확인"
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
          연결하기
        </Button>
      </form>
    </AuthFrame>
  );
}

export function KakaoLinkCallback({
  code,
  state,
  hasError,
}: {
  code: string | null;
  state: string | null;
  hasError: boolean;
}) {
  const [status, setStatus] = useState<"working" | "done" | "failed">(
    code && state && !hasError ? "working" : "failed",
  );
  const [message, setMessage] = useState("카카오 연결에 실패했습니다. 다시 시도해 주세요.");
  const started = useRef(false);

  useEffect(() => {
    if (!code || !state || hasError || started.current) return;
    started.current = true;
    window.history.replaceState(null, "", "/settings/login-methods/kakao-callback");
    linkKakaoLoginMethod({ code, state })
      .then(() => setStatus("done"))
      .catch((caught: unknown) => {
        setMessage(describeAuthError(caught, "카카오 연결에 실패했습니다. 다시 시도해 주세요."));
        setStatus("failed");
      });
  }, [code, state, hasError]);

  if (status === "working") return <PageSkeleton label="카카오 로그인을 연결하는 중입니다." />;
  return (
    <AuthFrame
      title={status === "done" ? "카카오 로그인을 연결했습니다" : "연결하지 못했습니다"}
      width="sm"
    >
      <div className="flex flex-col gap-4">
        {status === "failed" ? <FormAlert>{message}</FormAlert> : null}
        <Link
          href="/settings/login-methods"
          className="text-caption font-semibold text-primary hover:underline"
        >
          로그인 방식으로 돌아가기
        </Link>
      </div>
    </AuthFrame>
  );
}
