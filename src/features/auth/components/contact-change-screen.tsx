"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Button } from "@/shared/components/ui/button";
import { Tabs } from "@/shared/components/ui/tabs";
import { TextField } from "@/shared/components/ui/text-field";
import {
  changeContact,
  fetchMe,
  sendContactEmailVerification,
  verifyContactEmail,
} from "../api/account.api";
import { useCountdown } from "../hooks/use-countdown";
import { describeAuthError } from "../model/auth-messages";
import { savePendingContactEmail, usePendingContactEmail } from "../model/signup-draft";
import { AuthFrame, FormAlert, FormNotice } from "./auth-frame";
import { PhoneVerificationField } from "./phone-verification-field";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const meQueryKey = ["auth", "me"] as const;

type ContactTab = "email" | "phone";

export function ContactChangeScreen() {
  const queryClient = useQueryClient();
  const meQuery = useQuery({ queryKey: meQueryKey, queryFn: fetchMe });
  const [tab, setTab] = useState<ContactTab>("email");
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [isLinkSent, setIsLinkSent] = useState(false);
  const [isEmailBusy, setIsEmailBusy] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneTicket, setPhoneTicket] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string>();
  const [isPhoneBusy, setIsPhoneBusy] = useState(false);
  const [phoneDone, setPhoneDone] = useState(false);
  const resend = useCountdown();

  if (meQuery.isPending) return <PageSkeleton label="내 정보를 불러오는 중입니다." />;
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
  const hasEmailLogin = me.loginMethods.includes("EMAIL");

  async function sendLink() {
    if (!EMAIL_PATTERN.test(newEmail.trim())) {
      setEmailError("이메일 주소를 올바르게 입력해 주세요.");
      return;
    }
    setIsEmailBusy(true);
    setEmailError(undefined);
    try {
      const result = await sendContactEmailVerification(newEmail.trim());
      savePendingContactEmail(newEmail.trim());
      setIsLinkSent(true);
      resend.start(result.resendAfterSeconds);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 429 && caught.retryAfterSeconds) {
        resend.start(caught.retryAfterSeconds);
      }
      setEmailError(
        describeAuthError(caught, "인증 링크를 보내지 못했습니다. 다시 시도해 주세요."),
      );
    } finally {
      setIsEmailBusy(false);
    }
  }

  async function changePhone() {
    if (!phoneTicket) return;
    setIsPhoneBusy(true);
    setPhoneError(undefined);
    try {
      await changeContact({ phone, verifiedTicket: phoneTicket });
      setPhoneDone(true);
      setPhoneTicket(null);
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
    } catch (caught) {
      if (
        caught instanceof ApiError &&
        (caught.code === "TOKEN_EXPIRED" || caught.code === "TOKEN_INVALID")
      ) {
        setPhoneTicket(null);
      }
      setPhoneError(
        describeAuthError(caught, "휴대폰 번호를 바꾸지 못했습니다. 다시 시도해 주세요."),
      );
    } finally {
      setIsPhoneBusy(false);
    }
  }

  return (
    <AuthFrame title="이메일·휴대폰 변경" description="로그인에 쓰는 연락처를 바꿉니다.">
      <div className="flex flex-col gap-6">
        <Tabs
          label="변경할 항목"
          activeKey={tab}
          onActiveKeyChange={(next) => setTab(next as ContactTab)}
          items={[
            {
              key: "email",
              label: "이메일",
              panel: hasEmailLogin ? (
                <div className="flex flex-col gap-4">
                  <p className="text-caption text-ink-2">현재 이메일 {me.email}</p>
                  <TextField
                    label="새 이메일"
                    value={newEmail}
                    onValueChange={(next) => {
                      setNewEmail(next);
                      setEmailError(undefined);
                    }}
                    inputMode="email"
                    autoComplete="email"
                    placeholder="email@email.com"
                    actionLabel={isLinkSent ? "재발송" : "인증 링크 받기"}
                    onAction={() => void sendLink()}
                    isActionDisabled={isEmailBusy || resend.remaining > 0}
                    error={emailError}
                    statusText={
                      isLinkSent
                        ? "새 주소로 인증 링크를 보냈습니다. 링크를 열어 변경을 마쳐 주세요."
                        : undefined
                    }
                    hint="변경하려면 본인 확인을 한 번 더 합니다."
                  />
                  <FormNotice>변경이 끝나면 이전 이메일로 변경 알림을 보냅니다.</FormNotice>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <FormNotice>
                    카카오로만 로그인하는 계정은 이메일을 바꿀 수 없습니다. 먼저 이메일 로그인을
                    연결해 주세요.
                  </FormNotice>
                  <Link
                    href="/settings/login-methods"
                    className="text-caption font-semibold text-primary hover:underline"
                  >
                    이메일 로그인 연결하기
                  </Link>
                </div>
              ),
            },
            {
              key: "phone",
              label: "휴대폰",
              panel: (
                <div className="flex flex-col gap-4">
                  <p className="text-caption text-ink-2">
                    현재 휴대폰 {me.phone ?? "등록되지 않음"}
                  </p>
                  <PhoneVerificationField
                    label="새 휴대폰 번호"
                    purpose="CHANGE"
                    phone={phone}
                    onPhoneChange={(next) => {
                      setPhone(next);
                      setPhoneDone(false);
                    }}
                    isVerified={phoneTicket !== null}
                    onVerified={setPhoneTicket}
                    onReset={() => setPhoneTicket(null)}
                  />
                  {phoneError ? <FormAlert>{phoneError}</FormAlert> : null}
                  {phoneDone ? <FormNotice>휴대폰 번호를 바꿨습니다.</FormNotice> : null}
                  <div className="flex justify-center">
                    <Button
                      disabled={phoneTicket === null}
                      isLoading={isPhoneBusy}
                      onClick={() => void changePhone()}
                    >
                      휴대폰 번호 변경
                    </Button>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </AuthFrame>
  );
}

export function ContactEmailVerify({ token }: { token: string | null }) {
  const queryClient = useQueryClient();
  const [ticket, setTicket] = useState<string | null>(null);
  const [status, setStatus] = useState<"verifying" | "ready" | "failed" | "done">(
    token ? "verifying" : "failed",
  );
  const [failMessage, setFailMessage] = useState(
    "인증 링크가 올바르지 않습니다. 설정에서 새 링크를 받아 주세요.",
  );
  const pendingEmail = usePendingContactEmail();
  const [emailInput, setEmail] = useState<string | null>(null);
  const email = emailInput ?? pendingEmail;
  const [emailError, setEmailError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);
  const verified = useRef<string | null>(null);

  useEffect(() => {
    if (!token || verified.current === token) return;
    verified.current = token;
    window.history.replaceState(null, "", "/settings/contact/verify-email");
    verifyContactEmail(token)
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
            href="/settings/contact"
            className="text-caption font-semibold text-primary hover:underline"
          >
            이메일·휴대폰 변경으로 돌아가기
          </Link>
        </div>
      </AuthFrame>
    );
  }
  if (status === "done") {
    return (
      <AuthFrame title="이메일을 바꿨습니다" width="sm">
        <div className="flex flex-col gap-4">
          <FormNotice>
            이전 이메일로 변경 알림을 보냈습니다. 다음 로그인부터 새 이메일을 쓰세요.
          </FormNotice>
          <Link
            href="/settings/contact"
            className="text-caption font-semibold text-primary hover:underline"
          >
            이메일·휴대폰 변경으로 돌아가기
          </Link>
        </div>
      </AuthFrame>
    );
  }

  async function submit() {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError("인증한 새 이메일 주소를 입력해 주세요.");
      return;
    }
    if (!ticket) return;
    setIsBusy(true);
    setFormError(undefined);
    try {
      await changeContact({ email: email.trim(), verifiedTicket: ticket });
      savePendingContactEmail("");
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
      setStatus("done");
    } catch (caught) {
      if (
        caught instanceof ApiError &&
        (caught.code === "TOKEN_EXPIRED" || caught.code === "TOKEN_INVALID")
      ) {
        setFailMessage(
          "인증 시간이 지났거나 입력한 주소가 인증한 주소와 다릅니다. 새 링크를 받아 주세요.",
        );
        setStatus("failed");
        return;
      }
      setFormError(
        describeAuthError(caught, "이메일을 바꾸지 못했습니다. 잠시 뒤에 다시 시도해 주세요."),
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <AuthFrame
      title="이메일 변경 확인"
      description="새 주소 인증을 마쳤습니다. 변경할 주소를 확인해 주세요."
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
          label="새 이메일"
          value={email}
          onValueChange={(next) => {
            setEmail(next);
            setEmailError(undefined);
          }}
          inputMode="email"
          autoComplete="email"
          error={emailError}
        />
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        <Button type="submit" fullWidth isLoading={isBusy}>
          이메일 변경
        </Button>
      </form>
    </AuthFrame>
  );
}
