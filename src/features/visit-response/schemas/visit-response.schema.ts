export const visitResponseDealTypes = ["MONTHLY", "JEONSE", "SALE"] as const;
export type VisitResponseDealType = (typeof visitResponseDealTypes)[number];

export const visitResponseRoles = ["TENANT", "BUYER"] as const;
export type VisitResponseRole = (typeof visitResponseRoles)[number];

export const visitResponseResults = [
  "WAITING",
  "AVAILABLE_SUBMITTED",
  "NONE_AVAILABLE",
  "EXPIRED",
  "CONFIRMED",
  "NOT_SELECTED",
] as const;
export type VisitResponseResult = (typeof visitResponseResults)[number];

export type VisitResponsePropertySummary = {
  address: string;
  propertyName: string | null;
  dealType: VisitResponseDealType;
};

export type VisitResponseCandidateTime = {
  candidateTimeId: number;
  startsAt: string;
};

export type PublicVisitResponse = {
  officeName: string;
  propertySummary: VisitResponsePropertySummary;
  role: VisitResponseRole;
  result: VisitResponseResult;
  candidateTimes: VisitResponseCandidateTime[];
  selectedCandidateIds: number[];
  scheduledAt: string | null;
  expiresAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isDealType(value: unknown): value is VisitResponseDealType {
  return visitResponseDealTypes.some((dealType) => dealType === value);
}

function isRole(value: unknown): value is VisitResponseRole {
  return visitResponseRoles.some((role) => role === value);
}

function isResult(value: unknown): value is VisitResponseResult {
  return visitResponseResults.some((result) => result === value);
}

function parsePropertySummary(value: unknown): VisitResponsePropertySummary {
  if (
    !isRecord(value) ||
    typeof value.address !== "string" ||
    !isNullableString(value.propertyName) ||
    !isDealType(value.dealType)
  ) {
    throw new Error("매물 요약 응답 형식이 올바르지 않습니다.");
  }
  return { address: value.address, propertyName: value.propertyName, dealType: value.dealType };
}

function parseCandidateTimes(value: unknown): VisitResponseCandidateTime[] {
  if (!Array.isArray(value)) {
    throw new Error("후보시간 응답 형식이 올바르지 않습니다.");
  }
  return value.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.candidateTimeId !== "number" ||
      typeof item.startsAt !== "string"
    ) {
      throw new Error("후보시간 응답 형식이 올바르지 않습니다.");
    }
    return { candidateTimeId: item.candidateTimeId, startsAt: item.startsAt };
  });
}

function parseSelectedCandidateIds(value: unknown): number[] {
  if (!Array.isArray(value) || !value.every((item): item is number => typeof item === "number")) {
    throw new Error("선택된 후보시간 응답 형식이 올바르지 않습니다.");
  }
  return value;
}

export function parsePublicVisitResponse(value: unknown): PublicVisitResponse {
  if (
    !isRecord(value) ||
    typeof value.officeName !== "string" ||
    !isRole(value.role) ||
    !isResult(value.result) ||
    !isNullableString(value.scheduledAt) ||
    typeof value.expiresAt !== "string"
  ) {
    throw new Error("공개 응답 조회 형식이 올바르지 않습니다.");
  }
  return {
    officeName: value.officeName,
    propertySummary: parsePropertySummary(value.propertySummary),
    role: value.role,
    result: value.result,
    candidateTimes: parseCandidateTimes(value.candidateTimes),
    selectedCandidateIds: parseSelectedCandidateIds(value.selectedCandidateIds),
    scheduledAt: value.scheduledAt,
    expiresAt: value.expiresAt,
  };
}
