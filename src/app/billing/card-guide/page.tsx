import type { Metadata } from "next";
import { OfficeAccessGate } from "@/features/auth/components/office-access-gate";
import { CardGuideScreen } from "@/features/billing/components/card-guide-screen";

export const metadata: Metadata = { title: "카드 등록 안내 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessGate>
      <CardGuideScreen />
    </OfficeAccessGate>
  );
}
