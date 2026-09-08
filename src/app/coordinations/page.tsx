import type { Metadata } from "next";
import { CoordinationList } from "@/features/coordination";
import { OfficeShell } from "@/shared/components/office-shell";

export const metadata: Metadata = { title: "임장 조율 | 사이로" };

export default function CoordinationsPage() {
  return (
    <OfficeShell active="coordinations">
      <CoordinationList />
    </OfficeShell>
  );
}
