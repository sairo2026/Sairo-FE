import { notFound } from "next/navigation";
import {
  LegalDocumentScreen,
  legalKindFromPolicy,
} from "@/features/billing/components/legal-document-screen";
import { PublicBusinessFooter } from "@/features/billing/components/public-business-footer";
import { PublicSiteLayout } from "@/shared/layouts/layouts";

export default async function Page({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const legalKind = legalKindFromPolicy(kind.toUpperCase());
  if (!legalKind) notFound();
  return (
    <PublicSiteLayout footer={<PublicBusinessFooter />}>
      <LegalDocumentScreen kind={legalKind} />
    </PublicSiteLayout>
  );
}
