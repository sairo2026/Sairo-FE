import type { Metadata } from "next";
import { Card } from "@/shared/components/ui/card";

export const metadata: Metadata = { title: "운영자 로그인 | 사이로" };

export default function OpsLoginPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-24">
      <Card>
        <h1 className="text-h1 font-bold text-ink">운영자 로그인</h1>
        <p className="mt-3 text-body text-ink-2">
          운영자 계정은 카카오 인증 뒤 2차 인증을 거칩니다.
        </p>
        <a
          href="/api/ops/auth/kakao/start"
          className="mt-6 inline-flex h-12 items-center rounded-control bg-primary px-10 font-bold text-white hover:bg-primary-hover"
        >
          카카오로 시작
        </a>
      </Card>
    </main>
  );
}
