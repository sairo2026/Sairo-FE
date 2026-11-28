"use client";

import Link from "next/link";
import { PageHeader } from "@/shared/components/ui/page-header";
import { LegalDocumentView } from "@/shared/legal/legal-document-view";
import {
  LEGAL_DOCUMENTS,
  findLegalDocument,
  findPreviousLegalDocument,
  legalDocumentPath,
  previousLegalDocumentPath,
} from "@/shared/legal/registry";
import type { LegalDocumentSlug } from "@/shared/legal/registry";

export function LegalDocumentScreen({
  slug,
  previousVersion,
}: {
  slug: LegalDocumentSlug;
  previousVersion?: string;
}) {
  const current = findLegalDocument(slug);
  const document = previousVersion ? findPreviousLegalDocument(slug, previousVersion) : current;
  if (!current || !document) return null;
  return (
    <div className="flex flex-col gap-10">
      <div>
        {previousVersion ? (
          <p className="mb-4 rounded-card-flat border border-line bg-surface px-6 py-4 text-body text-ink-2">
            이 문서는 시행 버전 {previousVersion}입니다.{" "}
            <Link href={legalDocumentPath(slug)} className="text-primary underline">
              다른 버전 {current.version} 보기
            </Link>
          </p>
        ) : current.previous ? (
          <p className="mb-4 rounded-card-flat border border-line bg-surface px-6 py-4 text-body text-ink-2">
            시행 버전 {current.version}은 {current.effectiveDate}부터 시행합니다.{" "}
            <Link
              href={previousLegalDocumentPath(slug, current.previous.version)}
              className="text-primary underline"
            >
              다른 버전 {current.previous.version} 보기
            </Link>
          </p>
        ) : null}
        <LegalDocumentView document={document} />
      </div>
      <nav aria-label="다른 약관과 정책" className="border-t border-line pt-6">
        <p className="mb-3 text-caption font-semibold text-ink">다른 약관과 정책</p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-caption text-ink-2">
          {LEGAL_DOCUMENTS.filter((item) => item.slug !== slug).map((item) => (
            <li key={item.slug}>
              <Link href={legalDocumentPath(item.slug)} className="hover:text-primary">
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function LegalIndexScreen() {
  return (
    <div>
      <PageHeader
        title="약관과 정책"
        description="사이로 서비스 이용과 개인정보 처리, 구독과 환불에 관한 약관과 정책입니다."
      />
      <ul className="mt-2 flex flex-col gap-3">
        {LEGAL_DOCUMENTS.map((item) => (
          <li key={item.slug}>
            <Link
              href={legalDocumentPath(item.slug)}
              className="block rounded-card-flat border border-line bg-white px-6 py-5 hover:border-primary"
            >
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-h3 font-semibold text-ink">{item.title}</span>
                <span className="text-caption text-ink-2">시행 버전 {item.version}</span>
              </span>
              <span className="mt-1 block text-body text-ink-2">{item.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
