import type { ApiError } from "@/shared/api/client";

export const SCHEDULE_BLOCKED_COPY =
  "일정을 구성하지 못했습니다. 승인자 조건이 등록되지 않았거나 적용 기간이 끝난 매물이 있거나, 고객이 가능한 시간 안에 방문이 들어가지 않습니다. 아래에서 매물별로 확인해 주세요.";

export type BlockedReason =
  "SERVER_REPORTED" | "CONDITION_MISSING" | "CONDITION_EXPIRED" | "UNKNOWN";

export const BLOCKED_REASON_LABEL: Record<BlockedReason, string> = {
  SERVER_REPORTED: "이 매물 때문에 일정을 저장하지 못했습니다",
  CONDITION_MISSING: "승인자 조건 미등록",
  CONDITION_EXPIRED: "승인자 조건 적용 기간 만료",
  UNKNOWN: "승인자 조건 등록 여부를 확인해 주세요",
};

/** 서버가 일정 저장 실패 응답에 원인 후보 번호를 담아 주면 읽는다. 담아 주지 않으면 빈 목록이다. */
export function blockedCandidateIds(error: ApiError): number[] {
  const ids = error.details.candidatePropertyIds;
  return Array.isArray(ids) ? ids.filter((id) => Number.isSafeInteger(id)) : [];
}

export type GrantCondition = {
  propertyId: number;
  conditionRegistered: boolean;
  conditionAppliesUntil?: string | null;
};

export function blockedReasonOf(
  candidate: { candidatePropertyId: number; propertyId: number; crossOffice: boolean },
  options: { serverIds: number[]; grants: GrantCondition[] | undefined; now: number },
): BlockedReason {
  if (options.serverIds.includes(candidate.candidatePropertyId)) return "SERVER_REPORTED";
  if (!candidate.crossOffice) return "UNKNOWN";
  const grant = options.grants?.find((item) => item.propertyId === candidate.propertyId);
  if (!grant) return "UNKNOWN";
  if (!grant.conditionRegistered) return "CONDITION_MISSING";
  if (grant.conditionAppliesUntil && Date.parse(grant.conditionAppliesUntil) <= options.now) {
    return "CONDITION_EXPIRED";
  }
  return "UNKNOWN";
}
