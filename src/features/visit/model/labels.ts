import type { BadgeTone } from "@/shared/components/ui/badge";

export const COORDINATION_STATUSES = [
  "TIME_COLLECTING",
  "COORDINATABLE",
  "FINAL_CONFIRMATION_REQUIRED",
  "APPLYING",
  "CONFIRMED",
  "RESCHEDULE_REQUIRED",
  "VISIT_COMPLETED",
  "VISIT_INCOMPLETE",
  "CANCELLED",
] as const;
export type CoordinationStatus = (typeof COORDINATION_STATUSES)[number];

export const COORDINATION_STATUS_LABEL: Record<CoordinationStatus, string> = {
  TIME_COLLECTING: "시간 수집 중",
  COORDINATABLE: "조율 가능",
  FINAL_CONFIRMATION_REQUIRED: "최종 확정 필요",
  APPLYING: "신청 진행",
  CONFIRMED: "확정 완료",
  RESCHEDULE_REQUIRED: "재조율 필요",
  VISIT_COMPLETED: "방문 완료",
  VISIT_INCOMPLETE: "미방문 종료",
  CANCELLED: "취소",
};

export const COORDINATION_STATUS_TONE: Record<CoordinationStatus, BadgeTone> = {
  TIME_COLLECTING: "gray",
  COORDINATABLE: "blue",
  FINAL_CONFIRMATION_REQUIRED: "yellow",
  APPLYING: "teal",
  CONFIRMED: "green",
  RESCHEDULE_REQUIRED: "red",
  VISIT_COMPLETED: "green",
  VISIT_INCOMPLETE: "amber",
  CANCELLED: "gray",
};

export function isCoordinationStatus(value: string): value is CoordinationStatus {
  return (COORDINATION_STATUSES as readonly string[]).includes(value);
}

export function statusLabel(value: string): string {
  return isCoordinationStatus(value) ? COORDINATION_STATUS_LABEL[value] : value;
}

export function statusTone(value: string): BadgeTone {
  return isCoordinationStatus(value) ? COORDINATION_STATUS_TONE[value] : "gray";
}

export const NEXT_ACTION_HASH: Partial<Record<CoordinationStatus, string>> = {
  COORDINATABLE: "#schedule",
  FINAL_CONFIRMATION_REQUIRED: "#requests",
  APPLYING: "#requests",
  RESCHEDULE_REQUIRED: "#schedule",
};

export const APPROVER_TYPE_LABEL = {
  OCCUPANT: "점유자",
  OWNER: "소유자",
  DELEGATE: "위임받은 관리인",
} as const;

export const APPROVAL_ROLE_LABEL = {
  PRIMARY: "대표 승인자",
  CO_APPROVER: "공동 승인자",
} as const;

export const APPROVAL_SOURCE_LABEL = { DIRECT: "승인자 본인", PROXY: "중개사 대리 입력" } as const;

export const GRANT_STATE_LABEL = { ACTIVE: "적용 중", EXPIRED: "만료", REVOKED: "회수" } as const;
export const GRANT_STATE_TONE: Record<keyof typeof GRANT_STATE_LABEL, BadgeTone> = {
  ACTIVE: "green",
  EXPIRED: "gray",
  REVOKED: "red",
};

export const CONFLICT_TYPE_LABEL = {
  MANAGER_OVERLAP: "담당자 일정과 겹침",
  CUSTOMER_OVERLAP: "고객 일정과 겹침",
  PROPERTY_OVERLAP: "매물 방문과 겹침",
} as const;

export const ITEM_RESULT_LABEL = {
  SCHEDULED: "예정",
  COMPLETED: "방문 완료",
  NO_SHOW: "불참",
  CANCELLED: "취소",
} as const;

export const MAX_CANDIDATES = 20;
export const MAX_PERIOD_DAYS = 30;

export function labelOf<T extends string>(map: Record<T, string>, key: string): string {
  return (map as Record<string, string>)[key] ?? key;
}
