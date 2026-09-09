import type { Metadata } from "next";
import { KakaoLoginButton } from "@/features/auth/components/kakao-login-button";

export const metadata: Metadata = {
  title: "로그인 | 사이로",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const hasAuthFailed = error === "auth_failed";

  return (
    <main className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-sm rounded-3xl bg-white p-10 shadow-sm">
        <div className="flex flex-col items-center gap-16">
          <div aria-hidden className="h-16 w-16 rounded-2xl bg-neutral-200" />
          <div className="w-full">
            {hasAuthFailed ? (
              <p role="alert" className="mb-4 text-center text-sm text-red-600">
                카카오 로그인에 실패했습니다. 다시 시도해주세요.
              </p>
            ) : null}
            <KakaoLoginButton />
          </div>
        </div>
      </div>
    </main>
  );
}
