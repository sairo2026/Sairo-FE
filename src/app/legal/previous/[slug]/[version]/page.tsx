import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocumentScreen } from "@/features/billing/components/legal-document-screen";
import { PublicBusinessFooterServer } from "@/features/billing/components/public-business-footer.server";
import { PublicSiteLayout } from "@/shared/layouts/layouts";
import { findPreviousLegalDocument } from "@/shared/legal/registry";
import type { LegalDocumentSlug } from "@/shared/legal/registry";
import { NOINDEX_ROBOTS } from "@/shared/lib/site-metadata";

export const metadata: Metadata = {
  title: "이전 약관",
  description: "사이로의 이전 시행 약관과 정책 안내입니다.",
  robots: NOINDEX_ROBOTS,
};

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; version: string }>;
}) {
  const { slug, version } = await params;
  const document = findPreviousLegalDocument(slug, version);
  if (!document) notFound();
  return (
    <PublicSiteLayout footer={<PublicBusinessFooterServer />}>
      <LegalDocumentScreen slug={slug as LegalDocumentSlug} previousVersion={version} />
    </PublicSiteLayout>
  );
}
