import type { BadgeTone } from "@/shared/components/ui/badge";

export const CUSTOMER_ROLES = ["DEMAND", "OWNER", "OCCUPANT", "OTHER"] as const;
export type CustomerRole = (typeof CUSTOMER_ROLES)[number];

export const CUSTOMER_ROLE_LABEL: Record<CustomerRole, string> = {
  DEMAND: "수요 고객",
  OWNER: "소유자",
  OCCUPANT: "점유자",
  OTHER: "기타",
};

export const CUSTOMER_ROLE_TONE: Record<CustomerRole, BadgeTone> = {
  DEMAND: "blue",
  OWNER: "green",
  OCCUPANT: "teal",
  OTHER: "gray",
};

export const PROCESSING_BASES = [
  "CONSENT",
  "CONTRACT_PERFORMANCE",
  "LEGAL_OBLIGATION",
  "LEGITIMATE_INTEREST",
  "OTHER_LAW",
] as const;

export const PROCESSING_BASIS_LABEL: Record<string, string> = {
  CONSENT: "동의",
  CONTRACT_PERFORMANCE: "계약 이행",
  LEGAL_OBLIGATION: "법령상 의무",
  LEGITIMATE_INTEREST: "정당한 이익",
  OTHER_LAW: "그 밖의 법령 근거",
  UNSPECIFIED: "미지정(이전 데이터)",
};

export const CUSTOMER_STATUS_LABEL = {
  ACTIVE: "사용 중",
  ARCHIVED: "보관됨",
  MERGED: "병합됨",
} as const;

export const CONSULTATION_TYPES = ["FIRST_INQUIRY", "FOLLOWUP"] as const;
export type ConsultationType = (typeof CONSULTATION_TYPES)[number];

export const CONSULTATION_TYPE_LABEL: Record<ConsultationType, string> = {
  FIRST_INQUIRY: "최초문의",
  FOLLOWUP: "후속상담",
};

export const RELATION_ROLE_LABEL = {
  OWNER: "소유",
  OCCUPANT: "점유",
  INTEREST: "관심",
} as const;

export const DEAL_TYPES = ["SALE", "JEONSE", "MONTHLY"] as const;
export type DealType = (typeof DEAL_TYPES)[number];

export const DEAL_TYPE_LABEL: Record<DealType, string> = {
  SALE: "매매",
  JEONSE: "전세",
  MONTHLY: "월세",
};

export const CONTRACT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "초안",
  SIGNED: "체결",
  ENDED: "종료",
  TERMINATED: "해지",
  CANCELLED: "취소",
  VOID: "무효",
};

export const COORDINATION_STATUS_LABEL: Record<string, string> = {
  TIME_COLLECTING: "시간 수집 중",
  COORDINATABLE: "조율 가능",
  FINAL_CONFIRMATION_REQUIRED: "최종 확인 필요",
  APPLYING: "신청 중",
  CONFIRMED: "확정",
  RESCHEDULE_REQUIRED: "재조율 필요",
  VISIT_COMPLETED: "방문 완료",
  VISIT_INCOMPLETE: "방문 미완료",
  CANCELLED: "취소",
};

export const TASK_STATUS_LABEL: Record<string, string> = {
  TODO: "할 일",
  DONE: "완료",
  CANCELLED: "취소",
};

export function labelOf(map: Readonly<Record<string, string>>, key: string | null | undefined) {
  if (key === null || key === undefined) return "-";
  return map[key] ?? key;
}

export function isCustomerRole(value: string): value is CustomerRole {
  return (CUSTOMER_ROLES as readonly string[]).includes(value);
}

export function isDealType(value: string): value is DealType {
  return (DEAL_TYPES as readonly string[]).includes(value);
}
