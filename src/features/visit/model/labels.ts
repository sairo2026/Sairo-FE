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

export const TRUST_STATE_LABEL = {
  NO_DATA: "자료 없음",
  INSUFFICIENT: "표본 부족",
  AVAILABLE: "요약 가능",
} as const;

export const TRUST_BAND_LABEL = {
  HIGH: "대부분 지킴",
  MID: "일부 지킴",
  LOW: "지키지 않았다는 응답이 많음",
} as const;

export const TRUST_INDICATOR_LABEL = {
  PUNCTUALITY: "약속한 시각에 방문 시작",
  ADVANCE_CONTACT: "방문 전 확인·변경 연락",
  AS_REQUESTED: "신청한 인원·시간·요청사항대로 진행",
} as const;

export const APPLICANT_RELATION_LABEL = {
  OWNER_OFFICE: "매물을 가진 사무소",
  GRANTED_OFFICE: "허용받은 사무소",
} as const;

export const REVALIDATION_FAILURE_LABEL: Record<string, string> = {
  WINDOW_MISMATCH: "승인자 가능 시간과 맞지 않습니다.",
  MIN_GAP: "다른 방문과의 최소 간격을 지키지 못합니다.",
  MAX_VISITS_PER_DAY: "하루 최대 방문 횟수를 넘습니다.",
  SINGLE_VISIT_MAX: "1회 허용 시간을 넘습니다.",
  VALIDITY_PERIOD: "조건 적용 기간 밖입니다.",
  GRANT_INACTIVE: "신청 허용이 회수되었거나 만료되었습니다.",
  SCHEDULE_CONFLICT: "같은 시간대에 다른 일정이 있습니다.",
  TRAVEL_INFEASIBLE: "앞뒤 방문과의 이동시간이 부족합니다.",
};

export const CANCEL_REASON_CODES = [
  "USER_CANCEL",
  "APPROVER_REASON",
  "CUSTOMER_REASON",
  "OTHER",
] as const;

export const CANCEL_REASON_LABEL = {
  USER_CANCEL: "직원 취소",
  APPROVER_REASON: "승인자 사유",
  CUSTOMER_REASON: "고객 사유",
  OTHER: "기타",
} as const;

export const NOTICE_METHOD_LABEL = {
  KAKAO: "카카오톡",
  SMS: "문자",
  PHONE: "전화",
  IN_PERSON: "직접 전달",
  EMAIL: "이메일",
} as const;

export const NOTICE_RECIPIENT_LABEL = {
  CUSTOMER: "고객",
  APPROVER: "출입 승인자",
  OTHER: "현장에서 만난 상대",
} as const;

export const LEGAL_ROLE_LABEL = {
  REPRESENTATIVE_AGENT: "대표 공인중개사",
  AFFILIATED_AGENT: "소속공인중개사",
  ASSISTANT: "중개보조원",
} as const;

export const PUBLIC_VISIT_STATE_LABEL = {
  VALID: "확정",
  CANCELLED: "취소",
  RESCHEDULE_REQUIRED: "재조율 필요",
  SUPERSEDED: "대체됨",
} as const;
