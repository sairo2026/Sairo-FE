"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Button } from "@/shared/components/ui/button";
import { TextField } from "@/shared/components/ui/text-field";
import { countCodePoints } from "@/shared/lib/format";
import { fetchMe, fetchSignupTerms, signupWithKakao } from "../api/account.api";
import { authContextQueryKey } from "../hooks/use-auth-context";
import { describeAuthError } from "@/shared/lib/api-messages";
import { landingPathFor } from "../model/landing";
import { AuthFrame, FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { ExistingAccountNotice } from "./existing-account-notice";
import { PhoneVerificationField } from "./phone-verification-field";
import {
  CollectionNoticeTable,
  TermsAgreementSection,
  areRequiredTermsAgreed,
  visibleTerms,
} from "./terms-agreement-section";
import type { TermsSelection } from "./terms-agreement-section";
import {
  KAKAO_EXTRA_INFO_NOTICE,
  KAKAO_LINK_NOTICE,
  PHONE_VERIFICATION_NOTICE,
  SIGNUP_TERMS_COPY,
} from "../model/legal-copy";
import { TermsVersionChangedDialog } from "./terms-version-changed-dialog";
import type { ChangedTerm } from "./terms-version-changed-dialog";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX = 100;

export function KakaoSignupForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const meQuery = useQuery({ queryKey: ["auth", "me"], queryFn: fetchMe, retry: false });
  const termsQuery = useQuery({
    queryKey: ["auth", "terms", "SIGNUP"],
    queryFn: fetchSignupTerms,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const [nameInput, setNameInput] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [phoneTicket, setPhoneTicket] = useState<string | null>(null);
  const [referenceEmail, setReferenceEmail] = useState("");
  const [selection, setSelection] = useState<TermsSelection>({});
  const [nameError, setNameError] = useState<string>();
  const [emailError, setEmailError] = useState<string>();
  const [termsError, setTermsError] = useState<string>();
  const [phoneError, setPhoneError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [changedTerms, setChangedTerms] = useState<ChangedTerm[] | null>(null);
  const [changedCodes, setChangedCodes] = useState<string[]>([]);
  const [isConflict, setIsConflict] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const isUnauthenticated = meQuery.error instanceof ApiError && meQuery.error.status === 401;
  useEffect(() => {
    if (isUnauthenticated) router.replace("/login");
  }, [isUnauthenticated, router]);

  const name = nameInput ?? meQuery.data?.displayName ?? "";

  if (isConflict && phoneTicket) {
    return (
      <ExistingAccountNotice
        verifiedPhoneTicket={phoneTicket}
        onBack={() => {
          setIsConflict(false);
          setPhoneTicket(null);
        }}
      />
    );
  }

  if (meQuery.isPending || isUnauthenticated)
    return <PageSkeleton label="가입 정보를 확인하는 중입니다." />;
  if (meQuery.isError) {
    return (
      <ErrorScreen
        kind={toErrorScreenKind(meQuery.error)}
        traceId={meQuery.error instanceof ApiError ? meQuery.error.traceId : undefined}
        onRetry={() => void meQuery.refetch()}
      />
    );
  }
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

  const terms = visibleTerms([...termsQuery.data.items], false);
  if (terms.length === 0) {
    return (
      <AuthFrame title="카카오로 가입" width="sm">
        <EmptyState
          title="지금은 가입할 수 없습니다"
          description="적용 중인 약관을 찾지 못했습니다. 잠시 뒤에 다시 시도해 주세요."
          action={<Button onClick={() => void termsQuery.refetch()}>다시 불러오기</Button>}
        />
      </AuthFrame>
    );
  }
  const titles = Object.fromEntries(terms.map((item) => [item.termsCode, item.title]));

  async function submit() {
    let isValid = true;
    const trimmed = name.trim();
    if (trimmed === "" || countCodePoints(trimmed) > NAME_MAX) {
      setNameError(`이름을 1자 이상 ${NAME_MAX}자 이하로 입력해 주세요.`);
      isValid = false;
    }
    if (referenceEmail.trim() !== "" && !EMAIL_PATTERN.test(referenceEmail.trim())) {
      setEmailError("이메일 주소를 올바르게 입력해 주세요.");
      isValid = false;
    }
    if (!phoneTicket) {
      setPhoneError("휴대폰 번호 인증을 완료해 주세요.");
      isValid = false;
    }
    if (!areRequiredTermsAgreed(terms, selection)) {
      setTermsError(SIGNUP_TERMS_COPY.requiredError);
      isValid = false;
    }
    if (!isValid || !phoneTicket) return;

    setIsBusy(true);
    setSubmitError(undefined);
    try {
      const result = await signupWithKakao({
        displayName: trimmed,
        verifiedPhoneTicket: phoneTicket,
        kakaoReferenceEmail: referenceEmail.trim() === "" ? null : referenceEmail.trim(),
        agreedTerms: terms
          .filter((item) => selection[item.termsCode])
          .map((item) => ({ termsCode: item.termsCode, version: item.version })),
      });
      await queryClient.invalidateQueries({ queryKey: authContextQueryKey });
      router.replace(landingPathFor(result));
    } catch (error) {
      await handleError(error);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleError(error: unknown) {
    if (error instanceof ApiError) {
      if (error.code === "TERMS_VERSION_CHANGED") {
        const changed: ChangedTerm[] = (error.details.changedItems ?? []).map((item) => {
          const termsCode = typeof item.termsCode === "string" ? item.termsCode : "";
          return {
            termsCode,
            title: titles[termsCode] ?? termsCode,
            changeSummary: typeof item.changeSummary === "string" ? item.changeSummary : null,
            documentUrl: typeof item.documentUrl === "string" ? item.documentUrl : null,
          };
        });
        const changedCodes = new Set(changed.map((item) => item.termsCode));
        setSelection((current) =>
          Object.fromEntries(Object.entries(current).filter(([code]) => !changedCodes.has(code))),
        );
        setChangedTerms(changed);
        setChangedCodes(changed.map((item) => item.termsCode));
        await termsQuery.refetch();
        return;
      }
      if (error.code === "PHONE_ALREADY_REGISTERED") {
        setIsConflict(true);
        return;
      }
      if (error.code === "TOKEN_EXPIRED" || error.code === "TOKEN_INVALID") {
        setPhoneTicket(null);
        setPhoneError("인증 시간이 지났습니다. 휴대폰 번호를 다시 인증해 주세요.");
        return;
      }
    }
    setSubmitError(describeAuthError(error, "가입하지 못했습니다. 잠시 뒤에 다시 시도해 주세요."));
  }

  return (
    <>
      <AuthFrame title="카카오로 가입" description={KAKAO_EXTRA_INFO_NOTICE}>
        <form
          noValidate
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <TextField
            label="이름"
            value={name}
            onValueChange={(next) => {
              setNameInput(next);
              setNameError(undefined);
            }}
            autoComplete="name"
            error={nameError}
            required
          />
          <div className="flex flex-col gap-2">
            <PhoneVerificationField
              purpose="SIGNUP"
              phone={phone}
              onPhoneChange={(next) => {
                setPhone(next);
                setPhoneError(undefined);
              }}
              isVerified={phoneTicket !== null}
              onVerified={(ticket) => {
                setPhoneTicket(ticket);
                setPhoneError(undefined);
              }}
              onReset={() => setPhoneTicket(null)}
            />
            {phoneError ? (
              <p role="alert" className="text-caption text-danger">
                {phoneError}
              </p>
            ) : null}
            <p className="text-caption text-ink-2">{PHONE_VERIFICATION_NOTICE}</p>
          </div>
          <TextField
            label="참고 이메일 (선택)"
            value={referenceEmail}
            onValueChange={(next) => {
              setReferenceEmail(next);
              setEmailError(undefined);
            }}
            inputMode="email"
            autoComplete="email"
            placeholder="email@email.com"
            error={emailError}
            hint="인증하지 않으며 로그인에는 쓰이지 않습니다."
          />
          <TermsAgreementSection
            items={terms}
            selection={selection}
            onChange={(next) => {
              setSelection(next);
              setTermsError(undefined);
            }}
            error={termsError}
            changedCodes={changedCodes}
            hasLoginEmail={false}
          />
          <CollectionNoticeTable />
          {submitError ? <FormAlert>{submitError}</FormAlert> : null}
          <FormNotice>
            카카오 계정과 같은 이메일이 있어도 기존 이메일 계정과 합쳐지지 않습니다.
          </FormNotice>
          <p className="text-caption text-ink-2">{KAKAO_LINK_NOTICE}</p>
          <div className="flex justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-12 min-w-[120px] items-center justify-center rounded-control bg-primary-soft px-10 font-medium text-ink-2 hover:bg-primary-line"
            >
              취소
            </Link>
            <Button type="submit" isLoading={isBusy}>
              가입하기
            </Button>
          </div>
        </form>
      </AuthFrame>
      {changedTerms ? (
        <TermsVersionChangedDialog items={changedTerms} onConfirm={() => setChangedTerms(null)} />
      ) : null}
    </>
  );
}
