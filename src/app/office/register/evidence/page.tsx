import type { Metadata } from "next";
import { AccountScreenFrame } from "@/features/auth/components/account-screen-frame";
import { OfficeEvidenceScreen } from "@/features/office/components/office-evidence-screen";

export const metadata: Metadata = { title: "증빙 업로드 | 사이로" };

type Props = {
  searchParams: Promise<{ registrationId?: string; entity?: string; warning?: string }>;
};

function parseId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export default async function Page({ searchParams }: Props) {
  const { registrationId, entity, warning } = await searchParams;
  return (
    <AccountScreenFrame>
      <OfficeEvidenceScreen
        registrationId={parseId(registrationId)}
        entity={entity === "CORPORATION" ? "CORPORATION" : "INDIVIDUAL"}
        warning={warning ?? null}
      />
    </AccountScreenFrame>
  );
}
