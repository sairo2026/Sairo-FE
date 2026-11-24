"use client";

import { useState } from "react";
import type { TermsCatalogResponse } from "@/lib/api/contracts/auth.schema";
import { Checkbox, TermsItem } from "@/shared/components/ui/select-field";
import { TableScroll } from "@/shared/components/ui/table-scroll";
import { LegalDocumentModal } from "@/shared/legal/legal-document-view";
import {
  findLegalDocumentByTermsCode,
  findLegalDocumentByTermsCodeAndVersion,
} from "@/shared/legal/registry";
import type { LegalDocument } from "@/shared/legal/registry";
import { COLLECTION_TABLE_COPY, PRIVACY_NOTICE_COPY, SIGNUP_TERMS_COPY } from "../model/legal-copy";
import { breakSentences } from "@/shared/lib/sentences";

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

export function areRequiredTermsAgreed(
  items: TermsCatalogItem[],
  selection: TermsSelection,
  hasLoginEmail = true,
) {
  return (
    !hasBlockingTermsVersionMismatch(items, hasLoginEmail) &&
    visibleTerms(items, hasLoginEmail).every(
      (item) => !item.required || selection[item.termsCode] === true,
    )
  );
}

export function hasBlockingTermsVersionMismatch(
  items: TermsCatalogItem[],
  hasLoginEmail = true,
): boolean {
  return visibleTerms(items, hasLoginEmail).some(
    (item) => (item.required || item.category === "NOTICE") && isLocalVersionUnavailable(item),
  );
}

function isLocalVersionUnavailable(item: TermsCatalogItem): boolean {
  return (
    findLegalDocumentByTermsCode(item.termsCode) !== undefined &&
    findLegalDocumentByTermsCodeAndVersion(item.termsCode, item.version) === undefined
  );
}

export function selectedSignupAgreements(
  items: TermsCatalogItem[],
  selection: TermsSelection,
  hasLoginEmail = true,
) {
  return visibleTerms(items, hasLoginEmail)
    .filter(
      (item) =>
        isAgreementItem(item) &&
        selection[item.termsCode] === true &&
        !isLocalVersionUnavailable(item),
    )
    .map((item) => ({ termsCode: item.termsCode, version: item.version }));
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
    const document = findLegalDocumentByTermsCodeAndVersion(item.termsCode, item.version);
    if (document) setOpenDocument(document);
  }

  const visibleItems = visibleTerms(items, hasLoginEmail);
  const blockingVersionMismatch = hasBlockingTermsVersionMismatch(items, hasLoginEmail);
  const optionalVersionMismatch = visibleItems.some(
    (item) => !item.required && item.category !== "NOTICE" && isLocalVersionUnavailable(item),
  );
  const requiredItems = visibleItems.filter((item) => isAgreementItem(item) && item.required);
  const isAllRequiredChecked =
    requiredItems.length > 0 &&
    !blockingVersionMismatch &&
    requiredItems.every((item) => selection[item.termsCode] === true);

  function toggleRequired(checked: boolean) {
    const next = { ...selection };
    for (const item of requiredItems) {
      if (!isLocalVersionUnavailable(item)) next[item.termsCode] = checked;
    }
    onChange(next);
  }

  return (
    <fieldset className="min-w-0 flex flex-col gap-3">
      <legend className="mb-5 text-h2 font-semibold text-black">
        {SIGNUP_TERMS_COPY.sectionTitle}
      </legend>
      <div className="flex flex-col">
        {requiredItems.length > 0 ? (
          <Checkbox
            variant="form"
            checked={isAllRequiredChecked}
            disabled={blockingVersionMismatch}
            onCheckedChange={toggleRequired}
            className="font-medium"
            label={<span className="text-primary">{SIGNUP_TERMS_COPY.selectAllRequiredLabel}</span>}
          />
        ) : null}
        {visibleItems.map((item) => {
          const hasBody =
            findLegalDocumentByTermsCodeAndVersion(item.termsCode, item.version) !== undefined;
          const versionUnavailable = isLocalVersionUnavailable(item);
          const isChanged = changedCodes.includes(item.termsCode) && !selection[item.termsCode];
          if (!isAgreementItem(item)) {
            return (
              <div key={item.termsCode} className="flex items-center justify-between gap-3">
                <p className="text-body text-ink">{labelFor(item)}</p>
                {versionUnavailable ? null : (
                  <FullTextLink item={item} hasBody={hasBody} onOpen={openFullText} />
                )}
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
                disabled={versionUnavailable}
                href={!versionUnavailable && !hasBody ? item.documentUrl : undefined}
                onViewFull={hasBody ? () => openFullText(item) : undefined}
                viewFullLabel={`${fullTextName(item)} 전문 보기`}
              />
              <p className="flex items-center gap-2 pl-10 text-caption text-ink-2">
                {SIGNUP_TERMS_COPY.versionCaption(item.version)}
                {isChanged ? <ChangedBadge /> : null}
              </p>
              {item.termsCode === MARKETING_TERMS_CODE ? (
                <p className="whitespace-pre-line pl-10 text-caption text-ink-2">
                  {breakSentences(SIGNUP_TERMS_COPY.marketingSummary)}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      {!hasLoginEmail ? (
        <p className="text-caption text-ink-2">{SIGNUP_TERMS_COPY.noEmailMarketingNotice}</p>
      ) : null}
      <p className="text-caption text-ink-2">{PRIVACY_NOTICE_COPY.notice}</p>
      {blockingVersionMismatch ? (
        <p role="alert" className="text-caption text-danger">
          {SIGNUP_TERMS_COPY.versionMismatchError}
        </p>
      ) : null}
      {optionalVersionMismatch ? (
        <p role="status" className="text-caption text-ink-2">
          선택 동의의 현재 본문을 확인할 수 없어 선택할 수 없습니다. 가입은 계속할 수 있습니다.
        </p>
      ) : null}
      <p className="text-caption text-ink-2">
        {visibleItems.some((item) => isAgreementItem(item) && !item.required)
          ? SIGNUP_TERMS_COPY.footerNotice
          : SIGNUP_TERMS_COPY.requiredOnlyNotice}
      </p>
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
      {openDocument ? (
        <LegalDocumentModal
          document={openDocument}
          title={openDocument.slug === "terms" ? "서비스 이용 약관 동의" : undefined}
          isOpen
          onClose={() => setOpenDocument(null)}
        />
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
        className="shrink-0 text-caption text-ink-2 underline clickable-link"
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
      className="shrink-0 text-caption text-ink-2 underline clickable-link"
    >
      전문 보기
    </a>
  );
}

export function CollectionNoticeTable() {
  return (
    <section aria-label={COLLECTION_TABLE_COPY.title}>
      <h2 className="sr-only">{COLLECTION_TABLE_COPY.title}</h2>
      <details className="rounded-control border border-line bg-surface px-4 py-3">
        <summary className="cursor-pointer text-body font-semibold text-ink">
          {COLLECTION_TABLE_COPY.title} 자세히 보기
        </summary>
        <p className="mt-3 text-caption text-ink-2">{COLLECTION_TABLE_COPY.intro}</p>
        <TableScroll
          label={COLLECTION_TABLE_COPY.title}
          className="mt-3 rounded-control border border-line bg-white"
        >
          <table className="w-full min-w-[28rem] border-collapse text-left text-caption">
            <caption className="sr-only">{COLLECTION_TABLE_COPY.title}</caption>
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
        </TableScroll>
        <p className="mt-3 text-caption text-ink-2">{COLLECTION_TABLE_COPY.footer}</p>
      </details>
    </section>
  );
}
