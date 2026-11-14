"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type {
  ApproverOtpSendRequest,
  ApproverSessionResponse,
} from "@/lib/api/contracts/visit.schema";
import { ApiError } from "@/shared/api/client";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { Button } from "@/shared/components/ui/button";
import { TextField } from "@/shared/components/ui/text-field";
import { sendApproverOtp, verifyApproverOtp } from "../api/review.api";
import { describeVisitError, fieldErrorMap } from "../model/messages";

export const OTP_LENGTH = 6;
export const OTP_MAX_ATTEMPTS = 5;
export const PHONE_ACCOUNT_LATER_NOTICE =
  "번호 인증 계정은 문자 인증이 추후 제공될 예정이라 아직 이용할 수 없습니다. 승인자 링크로 조건 입력, 신청 비교와 선택, 확정 일정 확인은 그대로 할 수 있습니다.";

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function ApproverOtpForm({
  purpose,
  linkToken,
  noticeVersion,
  submitLabel,
  onVerified,
}: {
  purpose: ApproverOtpSendRequest["purpose"];
  linkToken?: string | null;
  noticeVersion?: string | null;
  submitLabel: string;
  onVerified: (session: ApproverSessionResponse) => void;
}) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [expiresIn, setExpiresIn] = useState(0);
  const [resendIn, setResendIn] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(OTP_MAX_ATTEMPTS);
  const [phoneError, setPhoneError] = useState<string>();
  const [codeError, setCodeError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [rateLimit, setRateLimit] = useState<number>();
  const [smsUnavailable, setSmsUnavailable] = useState(false);

  useEffect(() => {
    if (!sent) return;
    const timer = setInterval(() => {
      setExpiresIn((value) => Math.max(0, value - 1));
      setResendIn((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [sent]);

  function failure(caught: unknown, fallback: string) {
    if (caught instanceof ApiError && caught.status === 429) {
      setRateLimit(caught.retryAfterSeconds ?? 60);
    }
    return describeVisitError(caught, fallback);
  }

  const send = useMutation({
    mutationFn: () =>
      sendApproverOtp({
        purpose,
        phone: phone.replace(/-/g, ""),
        linkToken: linkToken ?? null,
      }),
    onSuccess: (result) => {
      setSent(true);
      setExpiresIn(result.expiresInSeconds);
      setResendIn(result.resendAfterSeconds);
      setAttemptsLeft(OTP_MAX_ATTEMPTS);
      setCode("");
      setFormError(undefined);
      setCodeError(undefined);
      setRateLimit(undefined);
    },
    onError: (caught) => {
      if (caught instanceof ApiError && caught.code === "SMS_UNAVAILABLE") {
        setSmsUnavailable(true);
        return;
      }
      const mapped = fieldErrorMap(caught);
      if (mapped.phone) setPhoneError(mapped.phone);
      setFormError(failure(caught, "인증번호를 보내지 못했습니다. 다시 시도해 주세요."));
    },
  });

  const verify = useMutation({
    mutationFn: () =>
      verifyApproverOtp({
        purpose,
        phone: phone.replace(/-/g, ""),
        code,
        linkToken: linkToken ?? null,
        acknowledgedNoticeVersion: purpose === "CLAIM" ? (noticeVersion ?? null) : null,
      }),
    onSuccess: onVerified,
    onError: (caught) => {
      if (caught instanceof ApiError && caught.code === "VERIFICATION_CODE_INVALID") {
        setAttemptsLeft((value) => Math.max(0, value - 1));
      }
      setFormError(failure(caught, "인증번호를 확인하지 못했습니다. 다시 시도해 주세요."));
    },
  });

  function sendCode() {
    setFormError(undefined);
    if (!/^01\d{8,9}$/.test(phone.replace(/-/g, ""))) {
      setPhoneError("휴대폰 번호를 숫자로 정확히 입력해 주세요.");
      return;
    }
    setPhoneError(undefined);
    send.mutate();
  }

  function submit() {
    setFormError(undefined);
    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) {
      setCodeError(`인증번호 ${OTP_LENGTH}자리를 입력해 주세요.`);
      return;
    }
    setCodeError(undefined);
    if (purpose === "CLAIM" && !noticeVersion) {
      setFormError("개인정보 안내를 불러오지 못했습니다. 링크 화면을 새로 열어 주세요.");
      return;
    }
    verify.mutate();
  }

  if (smsUnavailable) {
    return <FormNotice>{PHONE_ACCOUNT_LATER_NOTICE}</FormNotice>;
  }

  const blocked = attemptsLeft <= 0 || (rateLimit !== undefined && rateLimit > 0);

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <TextField
        label="휴대폰 번호"
        kind="tel"
        value={phone}
        onValueChange={setPhone}
        error={phoneError}
        actionLabel={sent ? "재발송" : "인증번호 받기"}
        onAction={sendCode}
        isActionDisabled={send.isPending || (sent && resendIn > 0)}
        timerText={sent && resendIn > 0 ? `${resendIn}초 뒤 재발송` : undefined}
      />
      {sent ? (
        <TextField
          label="인증번호 6자리"
          value={code}
          inputMode="numeric"
          maxLength={OTP_LENGTH}
          onValueChange={(value) => setCode(value.replace(/\D/g, ""))}
          error={codeError}
          timerText={expiresIn > 0 ? formatRemaining(expiresIn) : "유효 시간이 지났습니다"}
          hint={`남은 입력 횟수 ${attemptsLeft}회`}
        />
      ) : null}
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      {rateLimit !== undefined ? (
        <FormNotice>
          요청이 많아 잠시 뒤 다시 시도할 수 있습니다. 약 {rateLimit}초 뒤에 시도해 주세요.
        </FormNotice>
      ) : null}
      {attemptsLeft <= 0 ? (
        <FormNotice>입력 횟수를 모두 사용했습니다. 인증번호를 다시 받아 주세요.</FormNotice>
      ) : null}
      {sent ? (
        <div>
          <Button
            type="submit"
            isLoading={verify.isPending}
            disabled={blocked && attemptsLeft <= 0}
          >
            {submitLabel}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
