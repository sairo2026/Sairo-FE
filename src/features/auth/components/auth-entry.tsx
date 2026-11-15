import Link from "next/link";
import { BrandLogo } from "@/shared/components/ui/brand-logo";
import { Card } from "@/shared/components/ui/card";
import { FormAlert } from "@/shared/components/feedback/form-frame";
import { CookieNotice } from "@/shared/legal/cookie-notice";
import { KAKAO_LINK_NOTICE } from "../model/legal-copy";

const ENTRY_ERRORS: Record<string, string> = {
  auth_failed: "카카오 로그인에 실패했습니다. 다시 시도해주세요.",
};

export function AuthEntry({
  mode,
  errorCode,
  next,
}: {
  mode: "login" | "signup";
  errorCode?: string;
  next?: string;
}) {
  const isLogin = mode === "login";
  const errorMessage = errorCode ? ENTRY_ERRORS[errorCode] : undefined;
  const emailHref = isLogin
    ? `/login/email${next ? `?next=${encodeURIComponent(next)}` : ""}`
    : "/signup/email";
  return (
    <div className="flex flex-1 items-center justify-center bg-surface px-4 py-16">
      <Card tone="elevated" className="w-full max-w-[460px]">
        <div className="flex flex-col items-center gap-10">
          <BrandLogo variant="vertical" className="w-48" />
          <div className="mx-auto flex w-full max-w-[360px] flex-col gap-3">
            {errorMessage ? <FormAlert>{errorMessage}</FormAlert> : null}
            <a
              href="/api/auth/kakao/start"
              className="flex h-14 w-full items-center justify-center rounded-xl bg-[#FEE500] text-h2 font-semibold text-ink transition hover:brightness-95 active:brightness-90"
            >
              카카오로 시작하기
            </a>
            <Link
              href={emailHref}
              className="flex h-14 w-full items-center justify-center rounded-xl bg-primary-soft text-h2 font-semibold text-primary transition-colors hover:bg-primary-line active:bg-primary-line"
            >
              이메일로 시작하기
            </Link>
            {isLogin ? null : <p className="mt-1 text-caption text-ink-2">{KAKAO_LINK_NOTICE}</p>}
          </div>
          <p className="text-caption text-ink-2">
            {isLogin ? (
              <>
                아직 계정이 없나요?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-primary hover:text-primary-hover hover:underline active:text-primary-pressed"
                >
                  회원가입
                </Link>
              </>
            ) : (
              <>
                이미 계정이 있나요?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-primary hover:text-primary-hover hover:underline active:text-primary-pressed"
                >
                  로그인
                </Link>
              </>
            )}
          </p>
          <CookieNotice />
        </div>
      </Card>
    </div>
  );
}
