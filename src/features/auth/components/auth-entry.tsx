import Link from "next/link";
import { Card } from "@/shared/components/ui/card";
import { FormAlert } from "./auth-frame";

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
      <Card className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-10">
          <p className="text-h1 font-bold text-primary">사이로</p>
          <div className="flex w-full flex-col gap-3">
            {errorMessage ? <FormAlert>{errorMessage}</FormAlert> : null}
            <a
              href="/api/auth/kakao/start"
              className="flex h-14 w-full items-center justify-center rounded-control bg-[#FEE500] text-body font-semibold text-ink transition hover:brightness-95"
            >
              카카오로 시작하기
            </a>
            <Link
              href={emailHref}
              className="flex h-14 w-full items-center justify-center rounded-control border border-line bg-white text-body font-semibold text-ink hover:border-primary hover:text-primary"
            >
              이메일로 계속하기
            </Link>
          </div>
          <p className="text-caption text-ink-2">
            {isLogin ? (
              <>
                아직 계정이 없나요?{" "}
                <Link href="/signup" className="font-semibold text-primary hover:underline">
                  회원가입
                </Link>
              </>
            ) : (
              <>
                이미 계정이 있나요?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  로그인
                </Link>
              </>
            )}
          </p>
        </div>
      </Card>
    </div>
  );
}
