import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "사이로",
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-white px-6 py-16 text-center">
      <div aria-hidden className="h-16 w-16 rounded-2xl bg-neutral-200" />
      <h1 className="text-2xl font-semibold">사이로</h1>
      <p className="text-base leading-relaxed text-slate-600">
        정식 출시를 준비하고 있습니다.
        <br />
        준비가 완료되면 이곳에서 만나보실 수 있습니다.
      </p>
    </main>
  );
}
