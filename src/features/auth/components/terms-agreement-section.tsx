"use client";

import { useState } from "react";
import type { TermsCatalogResponse } from "@/lib/api/contracts/auth.schema";
import { TermsItem } from "@/shared/components/ui/select-field";
import { LegalDocumentModal } from "@/shared/legal/legal-document-view";
import { findLegalDocumentByTermsCode } from "@/shared/legal/registry";
import type { LegalDocument } from "@/shared/legal/registry";
import { COLLECTION_TABLE_COPY, PRIVACY_NOTICE_COPY, SIGNUP_TERMS_COPY } from "../model/legal-copy";

export type TermsCatalogItem = TermsCatalogResponse["items"][number];
export type TermsSelection = Record<string, boolean>;

export const MARKETING_TERMS_CODE = "MARKETING";
export const TOS_TERMS_CODE = "TOS";
export const PRIVACY_TERMS_CODE = "PRIVACY";

const DISPLAY_ORDER = [TOS_TERMS_CODE, PRIVACY_TERMS_CODE, MARKETING_TERMS_CODE];

function displayRank(code: string): number {
  const index = DISPLAY_ORDER.indexOf(code);
  return index === -1 ? DISPLAY_ORDER.length : index;
}

export function visibleTerms(
  items: TermsCatalogItem[],
  hasLoginEmail: boolean,
): TermsCatalogItem[] {
  return items
    .filter((item) => hasLoginEmail || item.termsCode !== MARKETING_TERMS_CODE)
    .sort((a, b) => displayRank(a.termsCode) - displayRank(b.termsCode));
}

export function isAgreementItem(item: TermsCatalogItem): boolean {
  return item.category !== "NOTICE";
}

export function areRequiredTermsAgreed(items: TermsCatalogItem[], selection: TermsSelection) {
  return items.filter((item) => item.required).every((item) => selection[item.termsCode] === true);
}

function labelFor(item: TermsCatalogItem): string {
  if (item.termsCode === TOS_TERMS_CODE) return SIGNUP_TERMS_COPY.tosLabel;
  if (item.termsCode === PRIVACY_TERMS_CODE) return SIGNUP_TERMS_COPY.privacyLabel;
  if (item.termsCode === MARKETING_TERMS_CODE) return SIGNUP_TERMS_COPY.marketingLabel;
  return item.title;
}

function fullTextName(item: TermsCatalogItem): string {
  return findLegalDocumentByTermsCode(item.termsCode)?.title ?? item.title;
}

function ChangedBadge() {
  return (
    <span className="rounded-small bg-tag-amber px-2 py-0.5 text-caption font-semibold text-tag-amber-ink">
      {SIGNUP_TERMS_COPY.changedBadge}
    </span>
  );
}

export function TermsAgreementSection({
  items,
  selection,
  onChange,
  error,
  changedCodes = [],
  hasLoginEmail = true,
}: {
  items: TermsCatalogItem[];
  selection: TermsSelection;
  onChange: (next: TermsSelection) => void;
  error?: string;
  changedCodes?: string[];
  hasLoginEmail?: boolean;
}) {
  const [openDocument, setOpenDocument] = useState<LegalDocument | null>(null);

  function openFullText(item: TermsCatalogItem) {
    const document = findLegalDocumentByTermsCode(item.termsCode);
    if (document) setOpenDocument(document);
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-body font-semibold text-ink">
        {SIGNUP_TERMS_COPY.sectionTitle}
      </legend>
      {items.map((item) => {
        const hasBody = findLegalDocumentByTermsCode(item.termsCode) !== undefined;
        const isChanged = changedCodes.includes(item.termsCode) && !selection[item.termsCode];
        if (!isAgreementItem(item)) {
          return (
            <div key={item.termsCode} className="flex items-center justify-between gap-3">
              <p className="text-body text-ink">{labelFor(item)}</p>
              <FullTextLink item={item} hasBody={hasBody} onOpen={openFullText} />
            </div>
          );
        }
        return (
          <div key={item.termsCode} className="flex flex-col gap-1">
            <TermsItem
              label={labelFor(item)}
              isRequired={item.required}
              checked={selection[item.termsCode] === true}
              onCheckedChange={(checked) => onChange({ ...selection, [item.termsCode]: checked })}
              href={hasBody ? undefined : item.documentUrl}
              onViewFull={hasBody ? () => openFullText(item) : undefined}
              viewFullLabel={`${fullTextName(item)} 전문 보기`}
            />
            <p className="flex items-center gap-2 pl-8 text-caption text-ink-2">
              {SIGNUP_TERMS_COPY.versionCaption(item.version)}
              {isChanged ? <ChangedBadge /> : null}
            </p>
            {item.termsCode === MARKETING_TERMS_CODE ? (
              <p className="pl-8 text-caption text-ink-2">{SIGNUP_TERMS_COPY.marketingSummary}</p>
            ) : null}
          </div>
        );
      })}
      {!hasLoginEmail ? (
        <p className="text-caption text-ink-2">{SIGNUP_TERMS_COPY.noEmailMarketingNotice}</p>
      ) : null}
      <p className="text-caption text-ink-2">{PRIVACY_NOTICE_COPY.notice}</p>
      <p className="text-caption text-ink-2">{SIGNUP_TERMS_COPY.footerNotice}</p>
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
      {openDocument ? (
        <LegalDocumentModal document={openDocument} isOpen onClose={() => setOpenDocument(null)} />
      ) : null}
    </fieldset>
  );
}

function FullTextLink({
  item,
  hasBody,
  onOpen,
}: {
  item: TermsCatalogItem;
  hasBody: boolean;
  onOpen: (item: TermsCatalogItem) => void;
}) {
  if (hasBody) {
    return (
      <button
        type="button"
        onClick={() => onOpen(item)}
        aria-label={`${fullTextName(item)} 전문 보기`}
        className="shrink-0 text-caption text-ink-2 underline"
      >
        전문 보기
      </button>
    );
  }
  return (
    <a
      href={item.documentUrl}
      target="_blank"
      rel="noreferrer"
      className="shrink-0 text-caption text-ink-2 underline"
    >
      전문 보기
    </a>
  );
}

export function CollectionNoticeTable() {
  return (
    <section aria-label={COLLECTION_TABLE_COPY.title} className="flex flex-col gap-3">
      <h3 className="text-body font-semibold text-ink">{COLLECTION_TABLE_COPY.title}</h3>
      <p className="text-caption text-ink-2">{COLLECTION_TABLE_COPY.intro}</p>
      <div className="overflow-x-auto rounded-control border border-line">
        <table className="w-full min-w-[28rem] border-collapse text-left text-caption">
          <thead className="bg-surface">
            <tr>
              {COLLECTION_TABLE_COPY.columns.map((column) => (
                <th key={column} scope="col" className="px-3 py-2 font-semibold text-ink">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COLLECTION_TABLE_COPY.rows.map((row) => (
              <tr key={row[0]} className="border-t border-line align-top">
                {row.map((cell, index) => (
                  <td key={index} className="px-3 py-2 text-ink-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-caption text-ink-2">{COLLECTION_TABLE_COPY.footer}</p>
    </section>
  );
}
