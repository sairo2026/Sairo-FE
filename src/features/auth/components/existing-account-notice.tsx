"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { Button } from "@/shared/components/ui/button";
import { fetchRecoveryOptions } from "../api/account.api";
import { AuthFrame, FormNotice } from "@/shared/components/feedback/form-frame";

const METHOD_LABEL: Record<string, string> = { EMAIL: "이메일", KAKAO: "카카오" };

export function ExistingAccountNotice({
  verifiedEmailTicket,
  verifiedPhoneTicket,
  onBack,
}: {
  verifiedEmailTicket?: string;
  verifiedPhoneTicket?: string;
  onBack: () => void;
}) {
  const query = useQuery({
    queryKey: ["auth", "recovery", Boolean(verifiedEmailTicket), Boolean(verifiedPhoneTicket)],
    queryFn: () => fetchRecoveryOptions({ verifiedEmailTicket, verifiedPhoneTicket }),
    gcTime: 0,
    retry: false,
  });

  if (query.isPending) return <PageSkeleton label="기존 계정을 확인하는 중입니다." />;
  if (query.isError) {
    return (
      <ErrorScreen kind={toErrorScreenKind(query.error)} onRetry={() => void query.refetch()} />
    );
  }

  const { existingAccountFound, availableLoginMethods, passwordResetAvailable } = query.data;
  const methods = availableLoginMethods.map((method) => METHOD_LABEL[method] ?? method);

  return (
    <AuthFrame
      variant="form"
      title={existingAccountFound ? "이미 가입된 계정이 있습니다" : "계정을 찾지 못했습니다"}
      description={
        existingAccountFound
          ? "확인한 이메일 또는 휴대폰 번호로 가입한 계정이 있습니다. 새로 가입하지 않고 기존 계정으로 로그인해 주세요."
          : "확인한 정보로 가입한 계정은 없습니다. 입력한 내용을 다시 확인해 주세요."
      }
    >
      <div className="flex flex-col items-center gap-6">
        {existingAccountFound && methods.length > 0 ? (
          <FormNotice>로그인 방식: {methods.join(", ")}</FormNotice>
        ) : null}
        <div className="flex flex-col items-center gap-3">
          {existingAccountFound ? (
            <>
              {availableLoginMethods.includes("EMAIL") ? (
                <Link
                  href="/login/email"
                  className="inline-flex h-12 w-[230px] items-center justify-center rounded-control bg-primary px-10 font-bold text-white hover:bg-primary-hover"
                >
                  이메일로 로그인
                </Link>
              ) : null}
              {availableLoginMethods.includes("KAKAO") ? (
                <a
                  href="/api/auth/kakao/start"
                  className="inline-flex h-12 w-[230px] items-center justify-center rounded-control bg-[#ffee52] px-10 font-semibold text-ink transition hover:brightness-95 active:brightness-90"
                >
                  카카오로 로그인
                </a>
              ) : null}
            </>
          ) : null}
          <Button variant="cancel" isWide onClick={onBack}>
            가입 화면으로 돌아가기
          </Button>
        </div>
        {existingAccountFound && passwordResetAvailable ? (
          <p className="text-caption text-ink-2">
            비밀번호를 잊으셨나요?{" "}
            <Link href="/password/forgot" className="text-primary underline">
              비밀번호 찾기
            </Link>
          </p>
        ) : null}
      </div>
    </AuthFrame>
  );
}
