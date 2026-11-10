"use client";

import { useState } from "react";
import { ApiError } from "@/shared/api/client";
import { TextField } from "@/shared/components/ui/text-field";
import { sendPhoneVerification, verifyPhone } from "../api/account.api";
import { formatClock, useCountdown } from "../hooks/use-countdown";
import { describeAuthError } from "@/shared/lib/api-messages";

const PHONE_PATTERN = /^01\d-\d{3,4}-\d{4}$/;
const CODE_LENGTH = 6;
const CODE_VALID_SECONDS = 300;

export type PhoneVerificationFieldProps = {
  label?: string;
  purpose: "SIGNUP" | "CHANGE";
  phone: string;
  onPhoneChange: (phone: string) => void;
  isVerified: boolean;
  onVerified: (ticket: string) => void;
  onReset: () => void;
};

export function PhoneVerificationField({
  label = "휴대폰 번호 인증",
  purpose,
  phone,
  onPhoneChange,
  isVerified,
  onVerified,
  onReset,
}: PhoneVerificationFieldProps) {
  const [isSent, setIsSent] = useState(false);
  const [code, setCode] = useState("");
  const [phoneError, setPhoneError] = useState<string>();
  const [codeError, setCodeError] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);
  const resend = useCountdown();
  const expiry = useCountdown();

  function changePhone(next: string) {
    onPhoneChange(next);
    setPhoneError(undefined);
    if (isSent || isVerified) {
      setIsSent(false);
      setCode("");
      setCodeError(undefined);
      expiry.start(0);
      onReset();
    }
  }

  async function send() {
    if (!PHONE_PATTERN.test(phone)) {
      setPhoneError("휴대폰 번호를 010-0000-0000 형식으로 입력해 주세요.");
      return;
    }
    setIsBusy(true);
    setPhoneError(undefined);
    setCodeError(undefined);
    setCode("");
    try {
      const result = await sendPhoneVerification({ phone, purpose });
      setIsSent(true);
      resend.start(result.resendAfterSeconds);
      expiry.start(CODE_VALID_SECONDS);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429 && error.retryAfterSeconds) {
        resend.start(error.retryAfterSeconds);
      }
      setPhoneError(describeAuthError(error, "인증번호를 보내지 못했습니다. 다시 시도해 주세요."));
    } finally {
      setIsBusy(false);
    }
  }

  async function confirm() {
    if (code.length !== CODE_LENGTH) {
      setCodeError("인증번호 6자리를 입력해 주세요.");
      return;
    }
    setIsBusy(true);
    setCodeError(undefined);
    try {
      const result = await verifyPhone({ phone, purpose, code });
      expiry.start(0);
      onVerified(result.verifiedPhoneTicket);
    } catch (error) {
      if (error instanceof ApiError && error.code === "TOKEN_INVALID") {
        setCodeError("인증번호를 5회 틀렸거나 사용할 수 없습니다. 새 인증번호를 받아 주세요.");
        setIsSent(false);
        setCode("");
        expiry.start(0);
      } else if (error instanceof ApiError && error.code === "TOKEN_EXPIRED") {
        setCodeError("인증 시간이 지났습니다. 새 인증번호를 받아 주세요.");
        setIsSent(false);
        setCode("");
      } else {
        setCodeError(
          describeAuthError(error, "인증번호를 확인하지 못했습니다. 다시 시도해 주세요."),
        );
      }
    } finally {
      setIsBusy(false);
    }
  }

  const sendLabel = isSent ? "재발송" : "인증번호 받기";
  const resendNote =
    resend.remaining > 0 ? `${resend.remaining}초 뒤 재발송할 수 있습니다.` : undefined;

  return (
    <div className="flex flex-col gap-3">
      <TextField
        label={label}
        kind="tel"
        value={phone}
        onValueChange={changePhone}
        placeholder="010-0000-0000"
        autoComplete="tel"
        maxLength={13}
        actionLabel={isVerified ? undefined : sendLabel}
        onAction={() => void send()}
        isActionDisabled={isBusy || resend.remaining > 0}
        error={phoneError}
        statusText={isVerified ? "인증이 완료되었습니다." : resendNote}
        required
      />
      {isSent && !isVerified ? (
        <TextField
          label="인증번호"
          kind="number"
          value={code}
          onValueChange={(next) => {
            setCode(next.slice(0, CODE_LENGTH));
            setCodeError(undefined);
          }}
          placeholder="6자리 숫자"
          autoComplete="one-time-code"
          actionLabel="확인"
          onAction={() => void confirm()}
          isActionDisabled={isBusy}
          timerText={expiry.remaining > 0 ? formatClock(expiry.remaining) : undefined}
          error={codeError}
          hint="인증번호는 5분 동안 유효하며 5회 틀리면 새로 받아야 합니다."
        />
      ) : null}
      {!isSent && !isVerified && codeError ? (
        <p role="alert" className="text-caption text-danger">
          {codeError}
        </p>
      ) : null}
    </div>
  );
}
