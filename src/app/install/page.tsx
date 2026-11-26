import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/shared/components/ui/brand-logo";
import { InstallAction } from "./install-action";

export const metadata: Metadata = {
  title: "사이로 시작하기",
  description: "사이로를 PC에 설치하거나 웹에서 바로 이용하세요.",
};

export default function InstallPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-8 text-ink">
      <div className="w-full max-w-xl rounded-card border border-line bg-white px-6 py-8 sm:px-10 sm:py-10">
        <Link href="/" aria-label="사이로 첫 화면">
          <BrandLogo className="w-28" />
        </Link>

        <h1 className="mt-8 break-keep text-h1 font-bold">사이로 시작하기</h1>
        <p className="mt-3 break-keep text-body text-ink-2">
          PC에 앱으로 설치하거나, 설치 없이 웹에서 바로 이용하세요.
        </p>

        <section
          className="mt-8 rounded-card-flat border border-line bg-surface p-5 sm:p-6"
          aria-labelledby="install-title"
        >
          <h2 id="install-title" className="text-h2 font-semibold">
            PC에 설치하기
          </h2>
          <p className="mt-2 break-keep text-body text-ink-2">
            설치 파일 없이 Chrome·Edge에서 앱 창으로 이용해요.
          </p>
          <div className="mt-5">
            <InstallAction />
          </div>
        </section>

        <section className="mt-8" aria-labelledby="web-title">
          <h2 id="web-title" className="text-body font-semibold">
            설치 없이 웹에서 바로 이용하기
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-control border border-primary px-5 text-body font-semibold text-primary hover:bg-surface"
            >
              로그인하러 가기
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center justify-center rounded-control border border-line px-5 text-body font-semibold text-ink hover:bg-surface"
            >
              회원가입하러 가기
            </Link>
          </div>
        </section>

        <p className="mt-7 break-keep text-caption text-ink-2">
          앱과 웹 모두 인터넷 연결이 필요합니다.
        </p>
      </div>
    </main>
  );
}
