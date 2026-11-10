import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { ImportUploadScreen } from "@/features/migration/components/import-upload-screen";

export const metadata: Metadata = { title: "데이터 이전 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="import">
      <ImportUploadScreen />
    </OfficeAccessShell>
  );
}
