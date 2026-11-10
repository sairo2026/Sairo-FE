import { MARKETING_BODY } from "./documents/marketing";
import { PRIVACY_BODY } from "./documents/privacy";
import { PROCESSING_OUTSOURCING_BODY } from "./documents/processing-outsourcing";
import { REFUND_BODY } from "./documents/refund";
import { SUBSCRIPTION_TERMS_BODY } from "./documents/subscription-terms";
import { TERMS_BODY } from "./documents/terms";

export type LegalDocumentSlug =
  | "terms"
  | "privacy"
  | "refund-policy"
  | "subscription-terms"
  | "processing-outsourcing"
  | "marketing";

export type LegalDocument = {
  slug: LegalDocumentSlug;
  title: string;
  summary: string;
  version: string;
  body: string;
  termsCode?: string;
  policyKind?: string;
};

export const LEGAL_DOCUMENT_VERSION = "1.0";

export const LEGAL_DOCUMENTS: readonly LegalDocument[] = [
  {
    slug: "terms",
    title: "이용약관",
    summary: "사무소가 사이로를 이용하는 조건과 회사와 사무소의 권리와 의무입니다.",
    version: LEGAL_DOCUMENT_VERSION,
    body: TERMS_BODY,
    termsCode: "TOS",
    policyKind: "TERMS",
  },
  {
    slug: "privacy",
    title: "개인정보처리방침",
    summary: "사이로가 처리하는 개인정보의 항목, 목적, 보유 기간과 정보주체의 권리입니다.",
    version: LEGAL_DOCUMENT_VERSION,
    body: PRIVACY_BODY,
    termsCode: "PRIVACY",
    policyKind: "PRIVACY",
  },
  {
    slug: "refund-policy",
    title: "환불정책",
    summary: "해지와 환불의 대상, 금액 계산, 신청과 처리 방법입니다.",
    version: LEGAL_DOCUMENT_VERSION,
    body: REFUND_BODY,
    policyKind: "REFUND",
  },
  {
    slug: "subscription-terms",
    title: "구독·결제 약관",
    summary: "월 선불 자동결제 구독의 요금, 결제, 해지와 가격 변경 조건입니다.",
    version: LEGAL_DOCUMENT_VERSION,
    body: SUBSCRIPTION_TERMS_BODY,
    termsCode: "SUBSCRIPTION_PURCHASE",
  },
  {
    slug: "processing-outsourcing",
    title: "개인정보 처리위탁 안내",
    summary: "사무소가 입력한 정보의 처리위탁 조건과 수탁사 목록입니다.",
    version: LEGAL_DOCUMENT_VERSION,
    body: PROCESSING_OUTSOURCING_BODY,
    policyKind: "PROCESSING_OUTSOURCING",
  },
  {
    slug: "marketing",
    title: "이메일 공지·혜택 안내 수신 동의",
    summary: "선택 동의의 수집 항목, 보유 기간, 철회 방법입니다.",
    version: LEGAL_DOCUMENT_VERSION,
    body: MARKETING_BODY,
    termsCode: "MARKETING",
  },
];

export function findLegalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((document) => document.slug === slug);
}

export function findLegalDocumentByTermsCode(termsCode: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((document) => document.termsCode === termsCode);
}

const POLICY_KIND_ALIASES: Readonly<Record<string, LegalDocumentSlug>> = {
  SUBPROCESSORS: "processing-outsourcing",
};

export function findLegalDocumentByPolicyKind(kind: string): LegalDocument | undefined {
  const normalized = kind.toUpperCase();
  const alias = POLICY_KIND_ALIASES[normalized];
  if (alias) return findLegalDocument(alias);
  return LEGAL_DOCUMENTS.find((document) => document.policyKind === normalized);
}

export function legalDocumentPath(slug: LegalDocumentSlug): string {
  return `/legal/${slug}`;
}
