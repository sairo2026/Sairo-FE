import type { Metadata } from "next";
import Link from "next/link";
import { PublicBusinessFooter } from "@/features/billing/components/public-business-footer";
import { BrandLogo } from "@/shared/components/ui/brand-logo";

export const metadata: Metadata = {
  title: "사이로",
  robots: { index: false, follow: false },
};

const GUIDE_LINK_CLASS =
  "inline-flex min-h-12 items-center justify-center rounded-control border border-primary bg-primary-soft px-6 text-body font-semibold text-primary hover:bg-primary-line";

export default function ComingSoonPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-surface text-ink">
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="flex w-full max-w-lg flex-col items-center gap-8 rounded-card border border-line bg-white px-6 py-12 text-center sm:px-10">
          <BrandLogo variant="vertical" className="w-40" />
          <div className="flex flex-col gap-4">
            <h1 className="break-keep text-h1 font-bold text-ink">정식 출시를 준비하고 있습니다</h1>
            <p className="break-keep text-body text-ink-2">
              사이로는 매물, 고객, 방문 조율, 계약, 월말결산을 하나로 잇는 공인중개사무소 업무 운영
              소프트웨어입니다. 준비가 완료되면 이곳에서 만나보실 수 있습니다.
            </p>
          </div>
          <nav aria-label="공개 안내" className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/pricing" className={GUIDE_LINK_CLASS}>
              요금 안내
            </Link>
            <Link href="/legal" className={GUIDE_LINK_CLASS}>
              약관과 정책
            </Link>
          </nav>
        </div>
      </main>
      <footer className="border-t border-line bg-white px-4 py-8 sm:px-8">
        <PublicBusinessFooter />
      </footer>
    </div>
  );
}
