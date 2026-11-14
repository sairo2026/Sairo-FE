import type { BadgeTone } from "@/shared/components/ui/badge";

type Labeled = { label: string; tone: BadgeTone };

export const INQUIRY_CATEGORIES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "SIGNUP", label: "가입" },
  { value: "AUTH", label: "인증" },
  { value: "BUSINESS", label: "업무" },
  { value: "BILLING", label: "결제" },
  { value: "MIGRATION", label: "이전" },
  { value: "PRIVACY", label: "개인정보" },
  { value: "BUG", label: "오류" },
  { value: "ENTERPRISE", label: "기업 도입" },
];

export function categoryLabel(value: string): string {
  return INQUIRY_CATEGORIES.find((item) => item.value === value)?.label ?? value;
}

export const INQUIRY_STATUS: Record<string, Labeled> = {
  OPEN: { label: "접수", tone: "blue" },
  ASSIGNED: { label: "처리 중", tone: "blue" },
  WAITING_FOR_CUSTOMER: { label: "보완 대기", tone: "amber" },
  ANSWERED: { label: "답변됨", tone: "teal" },
  CLOSED: { label: "완료", tone: "gray" },
};

export const SCAN_STATUS: Record<string, string> = {
  PENDING: "검사 중",
  CLEAN: "검사 완료",
  REJECTED: "거부됨",
};

export const ENTERPRISE_STATUS: Record<string, Labeled> = {
  RECEIVED: { label: "접수", tone: "blue" },
  ASSIGNED: { label: "담당 배정", tone: "blue" },
  CONSULTING: { label: "상담 중", tone: "blue" },
  QUOTED: { label: "견적 도착", tone: "amber" },
  ACCEPTED: { label: "견적 수락", tone: "teal" },
  REJECTED: { label: "견적 거절", tone: "gray" },
  CONTRACTED: { label: "계약 완료", tone: "green" },
  CLOSED: { label: "종료", tone: "gray" },
};

export const ATTACHMENT_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"] as const;
export const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;
export const ATTACHMENT_MAX_COUNT = 10;
export const INQUIRY_CONTENT_MAX = 2000;

export const POLICY_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "이용약관", href: "/legal/terms" },
  { label: "개인정보처리방침", href: "/legal/privacy" },
  { label: "처리위탁 조건", href: "/legal/processing-outsourcing" },
  { label: "구독·결제 약관", href: "/legal/subscription-terms" },
  { label: "환불정책", href: "/legal/refund-policy" },
];

export const PRIVACY_REQUEST_TYPES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "ACCESS", label: "열람" },
  { value: "CORRECTION", label: "정정" },
  { value: "DELETION", label: "삭제" },
  { value: "SUSPENSION", label: "처리정지" },
  { value: "WITHDRAWAL", label: "동의 철회" },
  { value: "PORTABILITY", label: "이전" },
];

export function privacyTypeLabel(value: string): string {
  return PRIVACY_REQUEST_TYPES.find((item) => item.value === value)?.label ?? value;
}

export const PRIVACY_STATUS: Record<string, Labeled> = {
  RECEIVED: { label: "접수", tone: "blue" },
  FORWARDED: { label: "사무소 전달", tone: "blue" },
  WAITING_FOR_INFO: { label: "보완 대기", tone: "amber" },
  REVIEWING: { label: "검토 중", tone: "blue" },
  APPROVED: { label: "승인", tone: "teal" },
  PARTIALLY_RESTRICTED: { label: "일부 제한", tone: "amber" },
  EXECUTING: { label: "처리 중", tone: "blue" },
  COMPLETED: { label: "완료", tone: "green" },
  REJECTED: { label: "거절", tone: "red" },
};

export const IDENTITY_STATUS: Record<string, Labeled> = {
  PENDING: { label: "본인 확인 중", tone: "amber" },
  VERIFIED: { label: "본인 확인됨", tone: "green" },
  FAILED: { label: "본인 확인 실패", tone: "red" },
};
