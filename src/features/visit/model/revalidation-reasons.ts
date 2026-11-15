/**
 * 백엔드 재검증·신청 점검이 내는 사유 코드(ApproverConditionEvaluator, VisitRequestChecker,
 * VisitFeasibility, ApproverSelectionExecutor)를 사용자 문구와 다음 행동으로 바꾼다.
 * 코드 목록이 바뀌면 revalidation-reasons.test.ts의 백엔드 코드 목록과 함께 고친다.
 */

export const REVALIDATION_REASON_CODES = [
  "DEPUTY_VISIT_LOCKED",
  "CONDITION_EXPIRED",
  "CONDITION_CHANGED",
  "NO_PERMISSION",
  "WINDOW_MISMATCH",
  "MAX_VISITS_PER_DAY",
  "MIN_GAP",
  "MIN_LEAD",
  "SINGLE_VISIT_MAX",
  "CUSTOMER_CONFLICT",
  "BROKER_CONFLICT",
  "PROPERTY_CONFLICT",
  "TRAVEL_CONFLICT",
] as const;

export type RevalidationReasonCode = (typeof REVALIDATION_REASON_CODES)[number];

export type ReasonCopy = { reason: string; nextStep: string };

const RETRY_WITH_NEW_SLOT =
  "조율 상세의 일정 구성을 다시 저장해 새 신청 가능 구간을 받은 뒤, 그 구간 안에서 새 신청을 내 주세요.";
const ADJUST_SCHEDULE = "고객이나 담당자의 일정을 조정하거나 다른 구간을 골라 새 신청을 내 주세요.";

export const BROKER_REASON_COPY: Record<RevalidationReasonCode, ReasonCopy> = {
  DEPUTY_VISIT_LOCKED: {
    reason: "중개보조원 인원 한도를 넘어 방문 업무가 잠겨 있습니다.",
    nextStep: "인원 구성을 바로잡은 뒤 다시 조율해 주세요.",
  },
  CONDITION_EXPIRED: {
    reason: "승인자 조건의 적용 기간이 끝났습니다.",
    nextStep: "승인자가 조건을 다시 등록한 뒤 새 신청을 내 주세요.",
  },
  CONDITION_CHANGED: {
    reason: "신청한 뒤 승인자 조건이 바뀌어 새 조건을 지키지 못했습니다.",
    nextStep: RETRY_WITH_NEW_SLOT,
  },
  NO_PERMISSION: {
    reason: "이 매물에 신청할 권한이 더 이상 유효하지 않습니다.",
    nextStep: "매물을 가진 사무소에 신청 허용 상태를 문의해 주세요.",
  },
  WINDOW_MISMATCH: {
    reason: "승인자가 허용한 시간대가 아닙니다.",
    nextStep: RETRY_WITH_NEW_SLOT,
  },
  MAX_VISITS_PER_DAY: {
    reason: "하루 최대 방문 횟수를 넘습니다.",
    nextStep: RETRY_WITH_NEW_SLOT,
  },
  MIN_GAP: {
    reason: "다른 방문과의 최소 간격을 지키지 못합니다.",
    nextStep: RETRY_WITH_NEW_SLOT,
  },
  MIN_LEAD: {
    reason: "최소 사전 신청 시간보다 늦게 신청했습니다.",
    nextStep: RETRY_WITH_NEW_SLOT,
  },
  SINGLE_VISIT_MAX: {
    reason: "1회 허용 시간을 넘습니다.",
    nextStep: RETRY_WITH_NEW_SLOT,
  },
  CUSTOMER_CONFLICT: {
    reason: "고객의 다른 확정 방문과 겹칩니다.",
    nextStep: ADJUST_SCHEDULE,
  },
  BROKER_CONFLICT: {
    reason: "담당 중개사의 다른 확정 방문과 겹칩니다.",
    nextStep: ADJUST_SCHEDULE,
  },
  PROPERTY_CONFLICT: {
    reason: "같은 매물에 이미 확정된 방문과 겹칩니다.",
    nextStep: ADJUST_SCHEDULE,
  },
  TRAVEL_CONFLICT: {
    reason: "앞뒤 방문과의 이동시간이 부족합니다.",
    nextStep: ADJUST_SCHEDULE,
  },
};

export const GENERIC_BROKER_REASON: ReasonCopy = {
  reason: "재검증에 실패해 신청을 확정하지 못했습니다.",
  nextStep: RETRY_WITH_NEW_SLOT,
};

/** 승인자에게는 중개사·고객·다른 방문 사정이 드러나는 사유를 하나의 일반 표현으로 묶어 보인다. */
export const APPROVER_UNDISCLOSED_REASON_CODES: readonly string[] = [
  "CUSTOMER_CONFLICT",
  "BROKER_CONFLICT",
  "PROPERTY_CONFLICT",
  "TRAVEL_CONFLICT",
];

export const APPROVER_UNDISCLOSED_REASON =
  "다른 일정과 겹치거나 신청 쪽 사정으로 확정하지 못했습니다. 신청은 종결되었으며 중개사가 다시 조율합니다.";

export const GENERIC_APPROVER_REASON = "재검증에 실패해 신청을 확정하지 못했습니다.";

const APPROVER_REASON_COPY: Record<string, string> = {
  CONDITION_EXPIRED: "조건의 적용 기간이 끝나 확정하지 못했습니다. 조건을 다시 등록해 주세요.",
  CONDITION_CHANGED: "신청한 뒤 조건이 바뀌어 새 조건에 맞지 않아 확정하지 못했습니다.",
  NO_PERMISSION: "신청한 사무소의 신청 권한이 유효하지 않아 확정하지 못했습니다.",
  WINDOW_MISMATCH: "가능한 시간대가 아니어서 확정하지 못했습니다.",
  MAX_VISITS_PER_DAY: "하루 최대 방문 횟수를 넘어 확정하지 못했습니다.",
  MIN_GAP: "방문 간 최소 간격을 지키지 못해 확정하지 못했습니다.",
  MIN_LEAD: "최소 사전 신청 시간을 지키지 못해 확정하지 못했습니다.",
  SINGLE_VISIT_MAX: "1회 허용 시간을 넘어 확정하지 못했습니다.",
};

function isReasonCode(code: string): code is RevalidationReasonCode {
  return (REVALIDATION_REASON_CODES as readonly string[]).includes(code);
}

export function brokerReasonCopy(code: string | null | undefined): ReasonCopy {
  return code && isReasonCode(code) ? BROKER_REASON_COPY[code] : GENERIC_BROKER_REASON;
}

const DETAIL_PREFIX = "위반한 규칙:";

/** 서버가 `위반한 규칙: A, B` 형태로 내리는 재검증 상세에서 알려진 코드만 뽑는다. */
export function parseViolatedCodes(detail: string | null | undefined): RevalidationReasonCode[] {
  if (!detail || !detail.startsWith(DETAIL_PREFIX)) return [];
  const codes = detail
    .slice(DETAIL_PREFIX.length)
    .split(",")
    .map((item) => item.trim())
    .filter(isReasonCode);
  return [...new Set(codes)];
}

/** 중개사에게 보일 재검증 실패 사유 목록. 첫 항목이 대표 사유다. */
export function brokerFailureReasons(
  code: string | null | undefined,
  detail?: string | null,
): ReasonCopy[] {
  const codes = [code, ...parseViolatedCodes(detail)].filter(
    (item): item is string => typeof item === "string" && item !== "",
  );
  const known = [...new Set(codes)].filter(isReasonCode);
  return known.length === 0
    ? [GENERIC_BROKER_REASON]
    : known.map((item) => BROKER_REASON_COPY[item]);
}

/** 승인자에게 보일 재검증 실패 사유 문장 목록. 원문 상세와 영문 코드는 절대 싣지 않는다. */
export function approverFailureLines(
  code: string | null | undefined,
  detail?: string | null,
): string[] {
  const codes = [code, ...parseViolatedCodes(detail)].filter(
    (item): item is string => typeof item === "string" && item !== "",
  );
  const lines: string[] = [];
  for (const item of new Set(codes)) {
    const line = APPROVER_UNDISCLOSED_REASON_CODES.includes(item)
      ? APPROVER_UNDISCLOSED_REASON
      : item === "DEPUTY_VISIT_LOCKED"
        ? GENERIC_APPROVER_REASON
        : APPROVER_REASON_COPY[item];
    if (line && !lines.includes(line)) lines.push(line);
  }
  return lines.length === 0 ? [GENERIC_APPROVER_REASON] : lines;
}

export const REQUEST_CLOSE_REASON_COPY: Record<string, string> = {
  START_PASSED: "희망 시작 시각이 지나 종결되었습니다.",
  CONDITION_EXPIRED: "승인자 조건의 적용 기간이 끝나 종결되었습니다.",
  GRANT_REVOKED: "신청 허용이 회수되어 종결되었습니다.",
  GRANT_EXPIRED: "신청 허용이 만료되어 종결되었습니다.",
};

export const TIME_CLOSED_REASON_COPY =
  "같은 매물의 다른 신청이 확정되어 시간이 마감되었습니다. 필요하면 새 신청을 내 주세요.";

/**
 * 신청 행에 보일 종결 사유. 서버 사유 문자열 가운데 알려진 코드만 문구로 바꾸고
 * 시스템이 만든 내부 문장은 상태별 고정 문구로 대신한다.
 */
export function describeRequestStatusReason(
  status: string,
  reason: string | null | undefined,
): string | undefined {
  if (status === "REVALIDATION_FAILED") return brokerReasonCopy(reason).reason;
  if (status === "TIME_CLOSED") return TIME_CLOSED_REASON_COPY;
  if (status === "EXPIRED" || status === "CANCELLED") {
    return reason ? REQUEST_CLOSE_REASON_COPY[reason] : undefined;
  }
  if (status === "WITHDRAWN") return reason ? reason : undefined;
  return undefined;
}
