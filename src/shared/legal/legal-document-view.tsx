"use client";

import { useMemo } from "react";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { PageHeader } from "@/shared/components/ui/page-header";
import { LegalMarkdown, legalTocEntries, prepareLegalBlocks } from "./legal-markdown";
import type { LegalDocument } from "./registry";
import { buildLegalValues, useLegalCompanyInfo } from "./use-legal-values";

function useDocumentBlocks(document: LegalDocument, effectiveDate?: string) {
  const company = useLegalCompanyInfo();
  return useMemo(
    () =>
      prepareLegalBlocks(
        document.body,
        buildLegalValues(document.version, company.data, effectiveDate),
      ),
    [document, company.data, effectiveDate],
  );
}

export function LegalDocumentView({
  document,
  effectiveDate,
}: {
  document: LegalDocument;
  effectiveDate?: string;
}) {
  const blocks = useDocumentBlocks(document, effectiveDate);
  const toc = legalTocEntries(blocks);
  return (
    <article>
      <PageHeader title={document.title} description={document.summary} />
      {toc.length > 1 ? (
        <nav
          aria-label={`${document.title} 목차`}
          className="mt-2 rounded-card-flat border border-line bg-surface px-6 py-5"
        >
          <p className="mb-3 text-body font-semibold text-ink">목차</p>
          <ol className="grid grid-cols-1 gap-x-8 gap-y-1 text-caption sm:grid-cols-2">
            {toc.map((entry) => (
              <li key={entry.id}>
                <a href={`#${entry.id}`} className="text-ink-2 hover:text-primary hover:underline">
                  {entry.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="mt-6">
        <LegalMarkdown blocks={blocks} />
      </div>
    </article>
  );
}

export function LegalDocumentModal({
  document,
  isOpen,
  onClose,
  effectiveDate,
}: {
  document: LegalDocument;
  isOpen: boolean;
  onClose: () => void;
  effectiveDate?: string;
}) {
  const blocks = useDocumentBlocks(document, effectiveDate);
  return (
    <Modal
      isOpen={isOpen}
      title={document.title}
      onClose={onClose}
      size="wide"
      footer={<Button onClick={onClose}>닫기</Button>}
    >
      <LegalMarkdown blocks={blocks} isCompact />
    </Modal>
  );
}
