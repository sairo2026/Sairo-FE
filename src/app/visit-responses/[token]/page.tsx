import type { Metadata } from "next";
import { VisitResponsePage } from "@/features/visit-response";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "임장 일정 응답 | 사이로" };

export default async function VisitResponseRoute({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="flex flex-1 justify-center bg-white px-5 py-10 sm:px-8">
      <div className="w-full max-w-[480px]">
        <VisitResponsePage token={token} />
      </div>
    </main>
  );
}
