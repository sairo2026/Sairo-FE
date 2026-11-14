import type { BadgeTone } from "@/shared/components/ui/badge";

type Labeled = { label: string; tone: BadgeTone };

export const SUBSCRIPTION_STATUS: Record<string, Labeled> = {
  PRE_PAYMENT: { label: "결제 전", tone: "amber" },
  TRIAL: { label: "무료 이용 중", tone: "teal" },
  ACTIVE: { label: "구독 중", tone: "green" },
  PAST_DUE_GRACE: { label: "미납 유예", tone: "amber" },
  PAST_DUE_RESTRICTED: { label: "미납 제한", tone: "red" },
  SUSPENDED: { label: "인증 중단", tone: "red" },
  ENDED: { label: "종료", tone: "gray" },
};

export const INVOICE_STATUS: Record<string, Labeled> = {
  UNBILLED: { label: "미청구", tone: "gray" },
  PROCESSING: { label: "처리 중", tone: "blue" },
  VERIFYING: { label: "확인 중", tone: "amber" },
  PAID: { label: "성공", tone: "green" },
  FAILED: { label: "실패", tone: "red" },
  PARTIALLY_REFUNDED: { label: "일부 환불", tone: "teal" },
  FULLY_REFUNDED: { label: "전액 환불", tone: "teal" },
  CANCELLED: { label: "취소", tone: "gray" },
};

export const REFUND_STATUS: Record<string, Labeled> = {
  RECEIVED: { label: "접수", tone: "blue" },
  REVIEWING: { label: "검토 중", tone: "blue" },
  PROCESSING: { label: "환불 처리 중", tone: "blue" },
  APPROVED: { label: "승인", tone: "teal" },
  REJECTED: { label: "거절", tone: "red" },
  VERIFYING: { label: "확인 중", tone: "amber" },
  COMPLETED: { label: "환불 완료", tone: "green" },
  FAILED: { label: "환불 실패", tone: "red" },
};

export const REFUND_REASONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "CANCELLATION", label: "해지" },
  { value: "AUTH_SUSPENSION", label: "인증 중단" },
  { value: "DUPLICATE_CHARGE", label: "중복 결제" },
  { value: "INCORRECT_CHARGE", label: "잘못된 청구" },
  { value: "SERVICE_FAILURE", label: "서비스 장애" },
  { value: "LATE_APPROVAL", label: "승인 지연" },
  { value: "POLICY_COMPENSATION", label: "정책 보상" },
];

export const ATTEMPT_RESULT: Record<string, string> = {
  PROCESSING: "처리 중",
  VERIFYING: "확인 중",
  SUCCESS: "성공",
  FAILED: "실패",
};

export const FAILURE_CATEGORY: Record<string, string> = {
  INSUFFICIENT_FUNDS: "한도 초과",
  CARD_UNUSABLE: "카드 정지·만료",
  TIMEOUT: "기타",
  OTHER: "기타",
};

export const TAX_TYPES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "GENERAL", label: "일반" },
  { value: "SIMPLIFIED", label: "간이" },
  { value: "EXEMPT", label: "면세" },
  { value: "UNKNOWN", label: "모름" },
];

export const TAX_DOCUMENT_STATUS: Record<string, string> = {
  NOT_REQUIRED: "발급 대상 아님",
  PENDING: "발급 대기",
  ISSUED: "발급됨",
  ISSUE_FAILED: "발급 실패",
  AMENDED: "수정 발급",
  CANCELLED: "취소",
};

export const NOTICE_DECISION: Record<string, string> = {
  PENDING: "응답 대기",
  AGREED: "동의함",
  DECLINED: "거절함",
  NOT_REQUIRED: "응답 불필요",
  ENDED_NO_CONSENT: "미동의로 종료",
};

export const PLAN_LABEL: Record<string, string> = {
  SOLO: "1인",
  TEAM: "다인",
  ENTERPRISE: "기업",
};

export function labelOf<T extends Record<string, unknown>>(map: T, key: string | null | undefined) {
  return key && key in map ? (map[key] as T[string]) : undefined;
}

export function isMissing(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}
