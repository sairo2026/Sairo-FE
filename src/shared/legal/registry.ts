import { MARKETING_BODY } from "./documents/marketing";
import { PRIVACY_BODY } from "./documents/privacy";
import { PROCESSING_OUTSOURCING_BODY } from "./documents/processing-outsourcing";
import { REFUND_BODY } from "./documents/refund";
import { SUBSCRIPTION_TERMS_BODY } from "./documents/subscription-terms";
import { PRIVACY_BODY_1_0 } from "./documents/previous/privacy-1-0";
import { REFUND_BODY_1_0 } from "./documents/previous/refund-1-0";
import { SUBSCRIPTION_TERMS_BODY_1_0 } from "./documents/previous/subscription-terms-1-0";
import { TERMS_BODY_1_0 } from "./documents/previous/terms-1-0";
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
  /** 화면에 표시하는 시행일이다. 서버 약관 카탈로그의 효력 시각과 같은 날짜를 적는다. */
  effectiveDate?: string;
  /** 직전 시행 버전의 본문이다. 시행 버전이 바뀐 문서만 가진다. */
  previous?: { version: string; body: string };
  termsCode?: string;
  policyKind?: string;
};

export const LEGAL_DOCUMENT_VERSION = "1.0";

export const LEGAL_DOCUMENTS: readonly LegalDocument[] = [
  {
    slug: "terms",
    title: "이용약관",
    summary: "사무소가 사이로를 이용하는 조건과 회사와 사무소의 권리와 의무입니다.",
    version: "1.1",
    body: TERMS_BODY,
    effectiveDate: "2026년 12월 16일",
    previous: { version: "1.0", body: TERMS_BODY_1_0 },
    termsCode: "TOS",
    policyKind: "TERMS",
  },
  {
    slug: "privacy",
    title: "개인정보처리방침",
    summary: "사이로가 처리하는 개인정보의 항목, 목적, 보유 기간과 정보주체의 권리입니다.",
    version: "1.1",
    body: PRIVACY_BODY,
    effectiveDate: "2026년 12월 16일",
    previous: { version: "1.0", body: PRIVACY_BODY_1_0 },
    termsCode: "PRIVACY",
    policyKind: "PRIVACY",
  },
  {
    slug: "refund-policy",
    title: "환불정책",
    summary: "해지와 환불의 대상, 금액 계산, 신청과 처리 방법입니다.",
    version: "1.1",
    body: REFUND_BODY,
    effectiveDate: "2026년 11월 23일",
    previous: { version: "1.0", body: REFUND_BODY_1_0 },
    policyKind: "REFUND",
  },
  {
    slug: "subscription-terms",
    title: "구독·결제 약관",
    summary: "월 선불 자동결제 구독의 요금, 결제, 해지와 가격 변경 조건입니다.",
    version: "1.1",
    body: SUBSCRIPTION_TERMS_BODY,
    effectiveDate: "2026년 12월 16일",
    previous: { version: "1.0", body: SUBSCRIPTION_TERMS_BODY_1_0 },
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

/** 서버가 동의 대상으로 제시한 버전과 같은 본문만 보여준다. */
export function findLegalDocumentByTermsCodeAndVersion(
  termsCode: string,
  version: string,
): LegalDocument | undefined {
  const current = findLegalDocumentByTermsCode(termsCode);
  if (!current) return undefined;
  return current.version === version ? current : findPreviousLegalDocument(current.slug, version);
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

export function previousLegalDocumentPath(slug: LegalDocumentSlug, version: string): string {
  return `/legal/previous/${slug}/${version}`;
}

/** 직전 시행 버전을 현재 문서와 같은 형태로 돌려준다. 시행일은 알 수 없어 비운다. */
export function findPreviousLegalDocument(
  slug: string,
  version: string,
): LegalDocument | undefined {
  const current = findLegalDocument(slug);
  if (!current?.previous || current.previous.version !== version) return undefined;
  return {
    ...current,
    title: `${current.title} (시행 버전 ${version})`,
    version: current.previous.version,
    body: current.previous.body,
    effectiveDate: undefined,
    previous: undefined,
  };
}
