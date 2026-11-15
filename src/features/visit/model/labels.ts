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
  TIME_COLLECTING: "rose",
  COORDINATABLE: "orange",
  FINAL_CONFIRMATION_REQUIRED: "lime",
  APPLYING: "teal",
  CONFIRMED: "mint",
  RESCHEDULE_REQUIRED: "violet",
  VISIT_COMPLETED: "gray",
  VISIT_INCOMPLETE: "silver",
  CANCELLED: "crimson",
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

/** 확정된 방문 묶음·항목의 상태. 홈의 조율 현황과 같은 문구·색(확정 완료 초록, 재조율 필요 빨강, 취소 회색)을 쓴다. */
export const PUBLIC_VISIT_STATE_LABEL = {
  VALID: COORDINATION_STATUS_LABEL.CONFIRMED,
  CANCELLED: COORDINATION_STATUS_LABEL.CANCELLED,
  RESCHEDULE_REQUIRED: COORDINATION_STATUS_LABEL.RESCHEDULE_REQUIRED,
  SUPERSEDED: "대체됨",
} as const;

export const PUBLIC_VISIT_STATE_TONE: Record<keyof typeof PUBLIC_VISIT_STATE_LABEL, BadgeTone> = {
  VALID: COORDINATION_STATUS_TONE.CONFIRMED,
  CANCELLED: COORDINATION_STATUS_TONE.CANCELLED,
  RESCHEDULE_REQUIRED: COORDINATION_STATUS_TONE.RESCHEDULE_REQUIRED,
  SUPERSEDED: "gray",
};

export const REVIEW_ANSWER_LABEL = {
  YES: "예",
  NO: "아니오",
  SKIP: "답하지 않음",
} as const;

export const REVIEW_QUESTIONS = [
  {
    key: "punctuality",
    label: "약속한 방문 시각에 맞춰 방문을 시작했나요",
  },
  {
    key: "advanceContact",
    label: "방문 전에 방문 확인이나 변경·지연에 대한 연락이 있었나요",
  },
  {
    key: "asRequested",
    label: "신청한 인원·소요시간·요청사항에 맞게 진행됐나요",
  },
] as const;

export const APPROVER_REVIEW_STATUS_LABEL = {
  NONE: "미입력",
  SUBMITTED: "입력됨",
  WITHDRAWN: "철회됨",
  LOCKED: "잠김",
} as const;

export const RECEIVED_REVIEW_STATUS_LABEL = {
  ACTIVE: "유지",
  DISPUTED: "이의 처리 중",
  REMOVED: "삭제됨",
} as const;

export const DISPUTE_STATUS_LABEL = {
  OPEN: "처리 중",
  UPHELD: "평가 유지",
  REMOVED: "평가 삭제",
} as const;

export const DISPUTE_REASON_LABEL = {
  FACT_INCORRECT: "사실과 다름",
  WRONG_TARGET: "다른 방문이나 다른 중개사에 대한 평가",
  OTHER: "기타",
} as const;

export type LinkValidity = "ACTIVE" | "EXPIRED" | "REVOKED";

export const LINK_VALIDITY_LABEL: Record<LinkValidity, string> = {
  ACTIVE: "사용 가능",
  EXPIRED: "만료됨",
  REVOKED: "폐기됨",
};

export const LINK_VALIDITY_TONE: Record<LinkValidity, BadgeTone> = {
  ACTIVE: "green",
  EXPIRED: "gray",
  REVOKED: "red",
};

/** 링크 원문은 서버에 해시로만 남아 다시 볼 수 없으므로 발급 시각 정보만으로 상태를 판단한다. */
export function linkValidity(
  link: { expiresAt: string; revokedAt?: string | null },
  now: number,
): LinkValidity {
  if (link.revokedAt) return "REVOKED";
  return Date.parse(link.expiresAt) > now ? "ACTIVE" : "EXPIRED";
}

export const LINK_STATE_LABEL = {
  LINKED: "연결됨",
  PENDING_CONFIRM: "연결 제안",
} as const;

export const BULK_FAILURE_LABEL: Record<string, string> = {
  NOT_LINKED: "연결된 출입승인이 아닙니다.",
  NOT_PRIMARY: "대표 승인자 출입승인이 아닙니다.",
  APPROVAL_INACTIVE: "유효하지 않은 출입승인입니다.",
  OFFICE_RESTRICTED: "사무소 상태 때문에 적용할 수 없습니다.",
  INVALID_CONDITION: "조건 값이 올바르지 않습니다.",
};

export const RESCHEDULE_TRIGGER_TEXT: Record<string, string> = {
  SCHEDULE_CHANGED: "일정이 바뀌었습니다.",
  ACCESS_REVOKED: "출입승인이 철회되었습니다.",
  OCCUPANT_CHANGED: "점유자 정보가 바뀌었습니다.",
  ASSIGNEE_HANDOVER: "담당이 바뀌어 일정을 다시 조율해야 합니다.",
};
