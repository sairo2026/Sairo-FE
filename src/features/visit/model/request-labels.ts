import type { BadgeTone } from "@/shared/components/ui/badge";

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  PENDING: "신청 대기",
  SELECTED: "선택됨",
  CONFIRMED: "확정",
  REVALIDATION_FAILED: "재검증 실패",
  TIME_CLOSED: "시간 마감",
  EXPIRED: "기간 만료",
  WITHDRAWN: "신청 철회",
  CANCELLED: "확정 취소",
};

export const REQUEST_STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: "blue",
  SELECTED: "teal",
  CONFIRMED: "green",
  REVALIDATION_FAILED: "red",
  TIME_CLOSED: "amber",
  EXPIRED: "gray",
  WITHDRAWN: "gray",
  CANCELLED: "gray",
};

export const REQUEST_STATUS_FILTERS = [
  "PENDING",
  "CONFIRMED",
  "REVALIDATION_FAILED",
  "TIME_CLOSED",
  "EXPIRED",
  "WITHDRAWN",
  "CANCELLED",
] as const;

export const REQUEST_KIND_LABEL: Record<string, string> = {
  NEW: "신규 신청",
  CHANGE: "변경 신청",
};

export const NOTICE_TYPE_LABEL: Record<string, string> = {
  TIME_CLOSED: "시간 마감",
  SELECTED: "선택됨",
  REVALIDATION_FAILED: "재검증 실패",
  CONFIRMED: "확정",
  CONDITION_CHANGE_IMPACT: "조건 변경 영향",
  REAPPROVAL_REQUESTED: "재승인 요청",
  SLOT_REOPENED: "빈자리 재개방",
  GRANT_REVOKED: "허용 회수로 신청 종결",
};

export const NOTICE_TYPE_DESCRIPTION: Record<string, string> = {
  TIME_CLOSED:
    "같은 매물에서 방문 구간이 겹치거나 방문 간 최소 간격을 지키지 못하는 다른 신청이 확정되어 마감되었습니다. 자동으로 승격되지 않습니다.",
  SELECTED: "승인자가 이 신청을 선택했습니다. 최신 조건과 일정 충돌을 재검증하는 중입니다.",
  REVALIDATION_FAILED:
    "재검증에 실패해 신청이 종결되었습니다. 같은 매물의 신청 가능 구간은 조율 상세에서 다시 받아 새 신청을 내 주세요.",
  CONFIRMED: "신청이 확정되었습니다. 확정된 방문은 조율 상세에서 확인할 수 있습니다.",
  CONDITION_CHANGE_IMPACT:
    "승인자 조건이 바뀌어 확정 방문에 영향이 생겼습니다. 변경이 필요한 방문의 변경안을 확인해 주세요.",
  REAPPROVAL_REQUESTED: "변경 신청이 접수되어 승인자의 재승인을 기다립니다.",
  SLOT_REOPENED:
    "확정 방문이 취소되거나 변경되어 빈자리가 생겼습니다. 자동으로 승격되지 않으므로 필요하면 새 신청을 내 주세요.",
  GRANT_REVOKED: "신청 허용이 회수되어 대기 중이던 신청이 종결되었습니다.",
};

export const GRANT_SCOPE_LABEL: Record<string, string> = {
  OFFICE: "사무소 전체",
  MEMBER: "특정 중개사",
};

export const CLOSE_REASON_LABEL: Record<string, string> = {
  START_PASSED: "희망 시작 시각 경과",
  CONDITION_EXPIRED: "승인자 조건 기간 만료",
  GRANT_REVOKED: "허용 회수",
  GRANT_EXPIRED: "허용 만료",
};

export const ACTIVE_REQUEST_STATUSES: readonly string[] = ["PENDING", "SELECTED"];

export const REQUEST_RULE_LABEL: Record<string, string> = {
  CUSTOMER_AVAILABILITY: "고객이 가능하다고 한 시간이 아닙니다.",
  WINDOW_MISMATCH: "승인자가 허용한 시간대가 아닙니다.",
  MAX_VISITS_PER_DAY: "하루 최대 방문 횟수를 넘습니다.",
  MIN_GAP: "다른 방문과의 최소 간격을 지키지 못합니다.",
  MIN_LEAD: "최소 사전 신청 시간보다 늦게 신청했습니다.",
  SINGLE_VISIT_MAX: "1회 허용 시간을 넘습니다.",
  VALIDITY_PERIOD: "승인자 조건의 적용 기간 밖입니다.",
};

export const REQUEST_NOT_RESERVATION_NOTICE =
  "겹치는 승인 대기 신청은 함께 존재할 수 있으며 확정 예약이나 점유가 아닙니다.";
