import Link from "next/link";
import { BrandLogo } from "@/shared/components/ui/brand-logo";
import { Card } from "@/shared/components/ui/card";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { CookieNotice } from "@/shared/legal/cookie-notice";
import { KAKAO_LINK_NOTICE, KAKAO_LINK_SUMMARY } from "../model/legal-copy";
import { breakSentences } from "@/shared/lib/sentences";

const ENTRY_ERRORS: Record<string, string> = {
  auth_failed: "카카오 로그인에 실패했습니다. 다시 시도해 주세요.",
};

const ENTRY_NOTICES: Record<string, string> = {
  withdrawn: "회원 탈퇴가 완료되었습니다. 그동안 사이로를 이용해 주셔서 감사합니다.",
};

export function AuthEntry({
  mode,
  errorCode,
  noticeCode,
  next,
}: {
  mode: "login" | "signup";
  errorCode?: string;
  noticeCode?: string;
  next?: string;
}) {
  const isLogin = mode === "login";
  const errorMessage = errorCode ? ENTRY_ERRORS[errorCode] : undefined;
  const noticeMessage = noticeCode ? ENTRY_NOTICES[noticeCode] : undefined;
  const emailHref = isLogin
    ? `/login/email${next ? `?next=${encodeURIComponent(next)}` : ""}`
    : "/signup/email";
  return (
    <main className="flex flex-1 items-center justify-center bg-surface px-4 py-16">
      <Card tone="elevated" className="min-h-[451px] w-full max-w-[460px]">
        <div className="flex flex-col items-center gap-8">
          <BrandLogo variant="vertical" className="w-48" />
          <div className="text-center">
            <h1 className="text-h1 font-bold text-ink">{isLogin ? "로그인" : "회원가입"}</h1>
            <p className="mt-4 text-body text-ink-2">
              {isLogin
                ? "사이로 계정으로 로그인해 업무를 이어가세요."
                : "계정을 만들고 부동산 업무 관리를 시작하세요."}
            </p>
          </div>
          <div className="mx-auto flex w-full max-w-[360px] flex-col gap-3">
            {errorMessage ? <FormAlert>{errorMessage}</FormAlert> : null}
            {noticeMessage && !errorMessage ? <FormNotice>{noticeMessage}</FormNotice> : null}
            <a
              href="/api/auth/kakao/start"
              className="flex h-12 w-full items-center justify-center rounded-control bg-[#ffee52] px-10 text-body font-semibold text-ink transition hover:brightness-95 active:brightness-90"
            >
              카카오로 시작하기
            </a>
            <p className="text-center text-caption text-ink-2">
              {isLogin
                ? "처음 이용하는 카카오 계정은 회원가입으로 안내합니다."
                : "이미 가입한 카카오 계정은 로그인됩니다."}
            </p>
            <Link
              href={emailHref}
              className="flex h-12 w-full items-center justify-center rounded-control bg-primary-soft px-10 text-body font-semibold text-ink transition-colors hover:bg-primary-line active:bg-primary-line"
            >
              {isLogin ? "이메일로 로그인하기" : "이메일로 회원가입하기"}
            </Link>
            {isLogin ? null : (
              <div className="mt-1 space-y-3">
                <p className="text-caption text-ink-2">{KAKAO_LINK_SUMMARY}</p>
                <details className="rounded-control border border-line bg-surface px-4 py-3">
                  <summary className="cursor-pointer text-body font-medium text-ink">
                    카카오 계정 연결·해제 안내 자세히 보기
                  </summary>
                  <p className="mt-3 whitespace-pre-line text-caption text-ink-2">
                    {breakSentences(KAKAO_LINK_NOTICE)}
                  </p>
                </details>
              </div>
            )}
          </div>
          <p className="text-caption text-ink-2">
            {isLogin ? (
              <>
                아직 계정이 없으신가요?{" "}
                <Link href="/signup" className="font-semibold text-primary clickable-link">
                  회원가입
                </Link>
              </>
            ) : (
              <>
                이미 계정이 있으신가요?{" "}
                <Link href="/login" className="font-semibold text-primary clickable-link">
                  로그인
                </Link>
              </>
            )}
          </p>
          <CookieNotice />
        </div>
      </Card>
    </main>
  );
}
