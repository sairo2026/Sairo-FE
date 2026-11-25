import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/shared/components/ui/brand-logo";
import { InstallAction } from "./install-action";

export const metadata: Metadata = {
  title: "PC에 설치해 사용하기",
  description: "Windows PC에서 사이로를 웹 또는 설치형 앱 창으로 이용하는 방법입니다.",
};

export default function InstallPage() {
  return (
    <main className="min-h-screen bg-surface px-4 py-10 text-ink sm:py-16">
      <div className="mx-auto max-w-3xl rounded-card border border-line bg-white px-6 py-10 sm:px-10">
        <Link href="/" aria-label="사이로 첫 화면">
          <BrandLogo className="w-28" />
        </Link>
        <h1 className="mt-8 break-keep text-h1 font-bold">사이로를 PC에서 이용하세요</h1>
        <p className="mt-3 break-keep text-body text-ink-2">
          웹에서 바로 사용하거나, Windows PC에 설치해 독립된 앱 창에서 사용할 수 있습니다.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <section className="rounded-card-flat border border-line p-5" aria-labelledby="web-title">
            <h2 id="web-title" className="text-h2 font-semibold">
              웹으로 이용하기
            </h2>
            <p className="mt-3 text-body text-ink-2">
              Chrome 또는 Edge에서 로그인해 바로 업무를 이어가세요.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex min-h-12 items-center font-semibold text-primary underline underline-offset-4"
            >
              웹에서 로그인하기
            </Link>
          </section>
          <section className="rounded-card-flat border border-line p-5" aria-labelledby="app-title">
            <h2 id="app-title" className="text-h2 font-semibold">
              PC에 설치해 사용하기
            </h2>
            <p className="mt-3 text-body text-ink-2">
              Chrome·Edge의 설치 기능을 사용합니다. 별도 설치 파일은 필요하지 않습니다.
            </p>
            <div className="mt-5">
              <InstallAction />
            </div>
          </section>
        </div>
        <p className="mt-6 break-keep text-caption text-ink-2">
          앱 창도 같은 사이로 웹 서비스에 연결됩니다. 로그인, 카카오 인증, 카드 등록에는 인터넷
          연결이 필요하며 업무 데이터는 PC에 오프라인 저장하지 않습니다.
        </p>
      </div>
    </main>
  );
}
