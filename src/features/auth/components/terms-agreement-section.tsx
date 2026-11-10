"use client";

import type { TermsCatalogResponse } from "@/lib/api/contracts/auth.schema";
import { Checkbox, TermsItem } from "@/shared/components/ui/select-field";

export type TermsCatalogItem = TermsCatalogResponse["items"][number];
export type TermsSelection = Record<string, boolean>;

export const MARKETING_TERMS_CODE = "MARKETING";

export function visibleTerms(
  items: TermsCatalogItem[],
  hasLoginEmail: boolean,
): TermsCatalogItem[] {
  return items
    .filter((item) => hasLoginEmail || item.termsCode !== MARKETING_TERMS_CODE)
    .sort((a, b) => Number(b.required) - Number(a.required));
}

export function areRequiredTermsAgreed(items: TermsCatalogItem[], selection: TermsSelection) {
  return items.filter((item) => item.required).every((item) => selection[item.termsCode] === true);
}

export function TermsAgreementSection({
  items,
  selection,
  onChange,
  error,
  notice,
}: {
  items: TermsCatalogItem[];
  selection: TermsSelection;
  onChange: (next: TermsSelection) => void;
  error?: string;
  notice?: string;
}) {
  const isAllChecked = items.length > 0 && items.every((item) => selection[item.termsCode]);
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-body font-semibold text-ink">이용 약관 동의</legend>
      <Checkbox
        label={<span className="font-semibold text-primary">약관 전체 동의</span>}
        checked={isAllChecked}
        onCheckedChange={(checked) =>
          onChange(Object.fromEntries(items.map((item) => [item.termsCode, checked])))
        }
      />
      {items.map((item) => (
        <TermsItem
          key={item.termsCode}
          label={item.title}
          isRequired={item.required}
          checked={selection[item.termsCode] === true}
          onCheckedChange={(checked) => onChange({ ...selection, [item.termsCode]: checked })}
          href={item.documentUrl}
        />
      ))}
      {notice ? <p className="text-caption text-ink-2">{notice}</p> : null}
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
