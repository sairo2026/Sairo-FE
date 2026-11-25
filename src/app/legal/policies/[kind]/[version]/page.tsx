import { notFound, redirect } from "next/navigation";
import { LegalDocumentScreen } from "@/features/billing/components/legal-document-screen";
import { PublicBusinessFooterServer } from "@/features/billing/components/public-business-footer.server";
import { PublicSiteLayout } from "@/shared/layouts/layouts";
import { findLegalDocumentByPolicyKind } from "@/shared/legal/registry";

export default async function Page({
  params,
}: {
  params: Promise<{ kind: string; version: string }>;
}) {
  const { kind, version } = await params;
  if (kind.toUpperCase() === "PRICING") redirect("/pricing");
  const document = findLegalDocumentByPolicyKind(kind);
  if (!document) notFound();
  const previousVersion =
    document.version === version
      ? undefined
      : document.previous?.version === version
        ? version
        : notFound();
  return (
    <PublicSiteLayout footer={<PublicBusinessFooterServer />}>
      <LegalDocumentScreen slug={document.slug} previousVersion={previousVersion} />
    </PublicSiteLayout>
  );
}
