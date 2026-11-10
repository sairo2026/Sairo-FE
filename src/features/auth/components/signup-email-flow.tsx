"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Button } from "@/shared/components/ui/button";
import { TextField } from "@/shared/components/ui/text-field";
import { countCodePoints } from "@/shared/lib/format";
import {
  fetchSignupTerms,
  sendSignupEmailVerification,
  signupWithEmail,
  verifySignupEmail,
} from "../api/account.api";
import { authContextQueryKey } from "../hooks/use-auth-context";
import { useCountdown } from "../hooks/use-countdown";
import { describeAuthError } from "../model/auth-messages";
import { landingPathFor } from "../model/landing";
import {
  PASSWORD_STRENGTH_LABEL,
  passwordStrength,
  validatePasswordInput,
} from "../model/password-policy";
import { clearSignupDraft, saveSignupDraft, useSignupDraft } from "../model/signup-draft";
import { AuthFrame, FormAlert, FormNotice } from "./auth-frame";
import { ExistingAccountNotice } from "./existing-account-notice";
import { PhoneVerificationField } from "./phone-verification-field";
import {
  TermsAgreementSection,
  areRequiredTermsAgreed,
  visibleTerms,
} from "./terms-agreement-section";
import type { TermsSelection } from "./terms-agreement-section";
import { TermsVersionChangedDialog } from "./terms-version-changed-dialog";
import type { ChangedTerm } from "./terms-version-changed-dialog";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX = 100;
const termsQueryKey = ["auth", "terms", "SIGNUP"] as const;

type Step = "info" | "password";
type TokenState = "none" | "verifying" | "failed";

function readChangedTerms(error: ApiError, titles: Record<string, string>): ChangedTerm[] {
  const raw = error.details.changedItems ?? [];
  return raw.map((item) => {
    const termsCode = typeof item.termsCode === "string" ? item.termsCode : "";
    return {
      termsCode,
      title: titles[termsCode] ?? termsCode,
      changeSummary: typeof item.changeSummary === "string" ? item.changeSummary : null,
      documentUrl: typeof item.documentUrl === "string" ? item.documentUrl : null,
    };
  });
}

export function SignupEmailFlow({ token }: { token?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const termsQuery = useQuery({
    queryKey: termsQueryKey,
    queryFn: fetchSignupTerms,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const [step, setStep] = useState<Step>("info");
  const draft = useSignupDraft();
  const [nameInput, setName] = useState<string | null>(null);
  const [emailInput, setEmail] = useState<string | null>(null);
  const [phoneInput, setPhone] = useState<string | null>(null);
  const name = nameInput ?? draft.name;
  const email = emailInput ?? draft.email;
  const phone = phoneInput ?? draft.phone;
  const [emailTicket, setEmailTicket] = useState<string | null>(null);
  const [phoneTicket, setPhoneTicket] = useState<string | null>(null);
  const [selection, setSelection] = useState<TermsSelection>({});
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [tokenState, setTokenState] = useState<TokenState>(token ? "verifying" : "none");
  const [tokenMessage, setTokenMessage] = useState<string>();
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [emailError, setEmailError] = useState<string>();
  const [isEmailRegistered, setIsEmailRegistered] = useState(false);
  const [nameError, setNameError] = useState<string>();
  const [termsError, setTermsError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [confirmError, setConfirmError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [changedTerms, setChangedTerms] = useState<ChangedTerm[] | null>(null);
  const [isConflict, setIsConflict] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const resend = useCountdown();
  const verifiedToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token || verifiedToken.current === token) return;
    verifiedToken.current = token;
    window.history.replaceState(null, "", "/signup/verify-email");
    verifySignupEmail(token)
      .then((result) => {
        setEmailTicket(result.verifiedEmailTicket);
        setTokenState("none");
      })
      .catch((error: unknown) => {
        setTokenState("failed");
        setTokenMessage(
          describeAuthError(
            error,
            "이메일 인증 링크를 확인하지 못했습니다. 새 링크를 받아 주세요.",
          ),
        );
      });
  }, [token]);

  useEffect(() => {
    if (name || email || phone) saveSignupDraft({ name, email, phone });
  }, [name, email, phone]);

  if (isConflict && (emailTicket || phoneTicket)) {
    return (
      <ExistingAccountNotice
        verifiedEmailTicket={emailTicket ?? undefined}
        verifiedPhoneTicket={phoneTicket ?? undefined}
        onBack={() => {
          setIsConflict(false);
          setStep("info");
        }}
      />
    );
  }

  if (tokenState === "verifying") return <PageSkeleton label="이메일 인증을 확인하는 중입니다." />;
  if (termsQuery.isPending) return <PageSkeleton label="약관을 불러오는 중입니다." />;
  if (termsQuery.isError) {
    return (
      <ErrorScreen
        kind={toErrorScreenKind(termsQuery.error)}
        traceId={termsQuery.error instanceof ApiError ? termsQuery.error.traceId : undefined}
        onRetry={() => void termsQuery.refetch()}
      />
    );
  }

  const terms = visibleTerms([...termsQuery.data.items], true);
  if (terms.length === 0) {
    return (
      <AuthFrame title="회원가입" width="sm">
        <EmptyState
          title="지금은 가입할 수 없습니다"
          description="적용 중인 약관을 찾지 못했습니다. 잠시 뒤에 다시 시도해 주세요."
          action={<Button onClick={() => void termsQuery.refetch()}>다시 불러오기</Button>}
        />
      </AuthFrame>
    );
  }
  const titles = Object.fromEntries(terms.map((item) => [item.termsCode, item.title]));

  async function sendEmailLink() {
    if (!EMAIL_PATTERN.test(email)) {
      setEmailError("이메일 주소를 올바르게 입력해 주세요.");
      return;
    }
    setIsBusy(true);
    setEmailError(undefined);
    setIsEmailRegistered(false);
    try {
      const result = await sendSignupEmailVerification(email.trim());
      setEmailLinkSent(true);
      resend.start(result.resendAfterSeconds);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429 && error.retryAfterSeconds) {
        resend.start(error.retryAfterSeconds);
      }
      setIsEmailRegistered(error instanceof ApiError && error.code === "EMAIL_ALREADY_REGISTERED");
      setEmailError(describeAuthError(error, "인증 링크를 보내지 못했습니다. 다시 시도해 주세요."));
    } finally {
      setIsBusy(false);
    }
  }

  function goToPassword() {
    let isValid = true;
    const trimmed = name.trim();
    if (trimmed === "" || countCodePoints(trimmed) > NAME_MAX) {
      setNameError(`이름을 1자 이상 ${NAME_MAX}자 이하로 입력해 주세요.`);
      isValid = false;
    } else {
      setNameError(undefined);
    }
    if (!emailTicket) {
      setEmailError("이메일 인증을 완료해 주세요.");
      isValid = false;
    }
    if (!phoneTicket) isValid = false;
    if (!areRequiredTermsAgreed(terms, selection)) {
      setTermsError("필수 약관에 모두 동의해 주세요.");
      isValid = false;
    } else {
      setTermsError(undefined);
    }
    if (!phoneTicket && isValid === false && emailTicket) {
      setSubmitError("휴대폰 번호 인증을 완료해 주세요.");
    } else {
      setSubmitError(undefined);
    }
    if (isValid) setStep("password");
  }

  async function submit() {
    const passwordProblem = validatePasswordInput(password);
    setPasswordError(passwordProblem ?? undefined);
    const mismatch = password !== confirm ? "비밀번호가 일치하지 않습니다." : undefined;
    setConfirmError(mismatch);
    if (passwordProblem || mismatch || !emailTicket || !phoneTicket) return;

    setIsBusy(true);
    setSubmitError(undefined);
    try {
      const agreedTerms = terms
        .filter((item) => selection[item.termsCode])
        .map((item) => ({ termsCode: item.termsCode, version: item.version }));
      const result = await signupWithEmail({
        verifiedEmailTicket: emailTicket,
        verifiedPhoneTicket: phoneTicket,
        password,
        displayName: name.trim(),
        agreedTerms,
      });
      clearSignupDraft();
      await queryClient.invalidateQueries({ queryKey: authContextQueryKey });
      router.replace(landingPathFor(result));
    } catch (error) {
      await handleSubmitError(error);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSubmitError(error: unknown) {
    if (error instanceof ApiError) {
      if (error.code === "TERMS_VERSION_CHANGED") {
        const changed = readChangedTerms(error, titles);
        const changedCodes = new Set(changed.map((item) => item.termsCode));
        setSelection((current) =>
          Object.fromEntries(Object.entries(current).filter(([code]) => !changedCodes.has(code))),
        );
        setChangedTerms(changed);
        setStep("info");
        await termsQuery.refetch();
        return;
      }
      if (error.code === "EMAIL_ALREADY_REGISTERED" || error.code === "PHONE_ALREADY_REGISTERED") {
        setIsConflict(true);
        return;
      }
      if (error.code === "TOKEN_EXPIRED" || error.code === "TOKEN_INVALID") {
        setEmailTicket(null);
        setPhoneTicket(null);
        setStep("info");
        setSubmitError(
          "인증 시간이 지났거나 인증 정보가 올바르지 않습니다. 이메일과 휴대폰 인증을 다시 해 주세요.",
        );
        return;
      }
      const fieldErrors = error.fieldErrors ?? [];
      const passwordField = fieldErrors.find((item) => item.field === "password");
      if (passwordField) {
        setPasswordError(passwordField.message);
        return;
      }
      if (fieldErrors.some((item) => item.field === "displayName")) {
        setNameError("이름을 확인해 주세요.");
        setStep("info");
        return;
      }
    }
    setSubmitError(describeAuthError(error, "가입하지 못했습니다. 잠시 뒤에 다시 시도해 주세요."));
  }

  const strength = passwordStrength(password);

  return (
    <>
      <AuthFrame title={step === "info" ? "기본 가입 정보 입력" : "비밀번호 설정"}>
        {tokenState === "failed" ? (
          <div className="mb-4">
            <FormAlert>{tokenMessage}</FormAlert>
          </div>
        ) : null}
        {step === "info" ? (
          <form
            noValidate
            className="flex flex-col gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              goToPassword();
            }}
          >
            <TextField
              label="이름"
              value={name}
              onValueChange={(next) => {
                setName(next);
                setNameError(undefined);
              }}
              autoComplete="name"
              error={nameError}
              required
            />
            <div className="flex flex-col gap-2">
              <TextField
                label="이메일 인증"
                value={email}
                onValueChange={(next) => {
                  setEmail(next);
                  setEmailError(undefined);
                  setIsEmailRegistered(false);
                  if (emailTicket) setEmailTicket(null);
                  setEmailLinkSent(false);
                }}
                inputMode="email"
                autoComplete="email"
                placeholder="email@email.com"
                actionLabel={emailTicket ? undefined : emailLinkSent ? "재발송" : "인증 링크 받기"}
                onAction={() => void sendEmailLink()}
                isActionDisabled={isBusy || resend.remaining > 0}
                error={emailError}
                statusText={
                  emailTicket
                    ? "인증이 완료되었습니다."
                    : emailLinkSent
                      ? resend.remaining > 0
                        ? `인증 링크를 보냈습니다. 링크는 30분 동안 한 번만 사용할 수 있고, ${resend.remaining}초 뒤 재발송할 수 있습니다.`
                        : "인증 링크를 보냈습니다. 메일의 링크를 열어 인증을 마쳐 주세요. 링크는 30분 동안 한 번만 사용할 수 있습니다."
                      : undefined
                }
                hint="링크는 30분 동안 한 번만 사용할 수 있고, 다시 보내면 이전 링크는 사라집니다."
                required
              />
              {isEmailRegistered ? (
                <p className="text-caption text-ink-2">
                  <Link href="/login/email" className="font-semibold text-primary hover:underline">
                    이메일로 로그인
                  </Link>
                  {" 또는 "}
                  <Link
                    href="/password/forgot"
                    className="font-semibold text-primary hover:underline"
                  >
                    비밀번호 찾기
                  </Link>
                </p>
              ) : null}
            </div>
            <PhoneVerificationField
              purpose="SIGNUP"
              phone={phone}
              onPhoneChange={setPhone}
              isVerified={phoneTicket !== null}
              onVerified={setPhoneTicket}
              onReset={() => setPhoneTicket(null)}
            />
            <TermsAgreementSection
              items={terms}
              selection={selection}
              onChange={(next) => {
                setSelection(next);
                setTermsError(undefined);
              }}
              error={termsError}
              notice="개인정보처리방침은 열람 고지로 제공하며, 선택 항목은 동의하지 않아도 가입할 수 있습니다."
            />
            {submitError ? <FormAlert>{submitError}</FormAlert> : null}
            <div className="flex justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex h-12 min-w-[120px] items-center justify-center rounded-control bg-primary-soft px-10 font-medium text-ink-2 hover:bg-primary-line"
              >
                취소
              </Link>
              <Button type="submit">다음</Button>
            </div>
          </form>
        ) : (
          <form
            noValidate
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <FormNotice>
              비밀번호는 8자 이상 12자 이하로 만들어 주세요. 공백도 사용할 수 있습니다.
            </FormNotice>
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
              required
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
              required
            />
            {submitError ? <FormAlert>{submitError}</FormAlert> : null}
            <div className="flex justify-center gap-3">
              <Button variant="cancel" onClick={() => setStep("info")}>
                이전
              </Button>
              <Button type="submit" isLoading={isBusy}>
                가입하기
              </Button>
            </div>
          </form>
        )}
      </AuthFrame>
      {changedTerms ? (
        <TermsVersionChangedDialog items={changedTerms} onConfirm={() => setChangedTerms(null)} />
      ) : null}
    </>
  );
}
