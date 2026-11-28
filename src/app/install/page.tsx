import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/shared/components/ui/brand-logo";
import { InstallAction } from "./install-action";

export const metadata: Metadata = {
  title: "사이로 시작하기",
  description: "사이로를 PC에 설치하거나 웹에서 바로 이용할 수 있습니다.",
};

export default function InstallPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-8 text-ink">
      <div className="w-full max-w-xl rounded-card border border-line bg-white px-6 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/welcome" aria-label="사이로 첫 화면">
            <BrandLogo className="w-28" />
          </Link>
          <Link
            href="/welcome"
            className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap text-caption font-medium text-ink-2 hover:text-primary focus-visible:rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span aria-hidden="true">←</span>
            처음 화면으로 돌아가기
          </Link>
        </div>

        <h1 className="mt-8 break-keep text-h1 font-bold">사이로 시작하기</h1>

        <section
          className="mt-8 rounded-card-flat border border-line bg-surface p-5 sm:p-6"
          aria-labelledby="install-title"
        >
          <h2 id="install-title" className="text-h3 font-semibold">
            PC에 설치하기
          </h2>
          <p className="mt-4 break-keep text-body text-ink-2">
            Chrome·Edge에서 설치하면 앱 창으로 열립니다.
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
