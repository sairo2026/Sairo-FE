export const coordinationDealTypes = ["MONTHLY", "JEONSE", "SALE"] as const;
export type CoordinationDealType = (typeof coordinationDealTypes)[number];

export const coordinationStatuses = [
  "TENANT_CHECKING",
  "BUYER_DELIVERY_REQUIRED",
  "BUYER_CHECKING",
  "FINAL_CONFIRMATION_REQUIRED",
  "SCHEDULE_CONFIRMED",
  "VISIT_COMPLETED",
] as const;
export type CoordinationStatus = (typeof coordinationStatuses)[number];

export const customerResponseResults = [
  "WAITING",
  "AVAILABLE_SUBMITTED",
  "NONE_AVAILABLE",
  "EXPIRED",
  "CONFIRMED",
  "NOT_SELECTED",
] as const;
export type CustomerResponseResult = (typeof customerResponseResults)[number];

export const customerResponseRoles = ["TENANT", "BUYER"] as const;
export type CustomerResponseRole = (typeof customerResponseRoles)[number];

export type CoordinationProperty = {
  propertyId: number;
  propertyName: string | null;
  address: string;
  addressDetail: string | null;
  dealType: CoordinationDealType;
};

export type CoordinationCreateResult = {
  coordinationId: number;
  status: string;
  tenantResponseId: number;
  customerLinkUrl: string;
  linkExpiresAt: string;
};

export type BuyerLinkCreateResult = {
  buyerResponseId: number;
  customerLinkUrl: string;
  linkExpiresAt: string;
  coordinationStatus: string;
};

export type CoordinationStatusCounts = {
  tenantChecking: number;
  buyerDeliveryRequired: number;
  buyerChecking: number;
  finalConfirmationRequired: number;
  scheduleConfirmed: number;
  visitCompleted: number;
};

export type CoordinationListItem = {
  coordinationId: number;
  propertyAddress: string;
  tenantName: string;
  tenantPhone: string;
  visitScheduledAt: string | null;
  status: CoordinationStatus;
};

export type CoordinationListResult = {
  statusCounts: CoordinationStatusCounts;
  coordinations: CoordinationListItem[];
};

export type CoordinationCandidateTimeItem = {
  candidateTimeId: number;
  startsAt: string;
};

export type CoordinationCustomerResponseItem = {
  responseId: number;
  role: CustomerResponseRole;
  name: string | null;
  phone: string | null;
  result: CustomerResponseResult;
  offeredCandidateIds: number[];
  selectedCandidateIds: number[];
  submittedAt: string | null;
  customerLinkUrl: string | null;
  linkExpiresAt: string | null;
};

export type CoordinationDetailResult = {
  coordinationId: number;
  property: {
    propertyId: number;
    address: string;
    addressDetail: string | null;
    propertyName: string | null;
    dealType: CoordinationDealType;
  };
  status: CoordinationStatus;
  createdAt: string;
  scheduledAt: string | null;
  confirmedAt: string | null;
  candidateTimes: CoordinationCandidateTimeItem[];
  tenantResponse: CoordinationCustomerResponseItem;
  buyerResponses: CoordinationCustomerResponseItem[];
};

export type HomeSummaryResult = {
  todayVisitCount: number;
  inProgressCoordinationCount: number;
  contractExpiringD90Count: number;
  coordinationStatusCounts: CoordinationStatusCounts;
};

export type ResponseRestartResult = {
  customerLinkUrl: string;
  linkExpiresAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isDealType(value: unknown): value is CoordinationDealType {
  return coordinationDealTypes.some((dealType) => dealType === value);
}

function isCoordinationStatus(value: unknown): value is CoordinationStatus {
  return coordinationStatuses.some((status) => status === value);
}

function isCustomerResponseResult(value: unknown): value is CustomerResponseResult {
  return customerResponseResults.some((result) => result === value);
}

function isCustomerResponseRole(value: unknown): value is CustomerResponseRole {
  return customerResponseRoles.some((role) => role === value);
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

export function parseCoordinationProperty(value: unknown): CoordinationProperty {
  if (
    !isRecord(value) ||
    typeof value.propertyId !== "number" ||
    !isNullableString(value.propertyName) ||
    typeof value.address !== "string" ||
    !isNullableString(value.addressDetail) ||
    !isDealType(value.dealType)
  ) {
    throw new Error("매물 응답 형식이 올바르지 않습니다.");
  }
  return {
    propertyId: value.propertyId,
    propertyName: value.propertyName,
    address: value.address,
    addressDetail: value.addressDetail,
    dealType: value.dealType,
  };
}

export function parseCoordinationCreateResult(value: unknown): CoordinationCreateResult {
  if (
    !isRecord(value) ||
    typeof value.coordinationId !== "number" ||
    typeof value.status !== "string" ||
    typeof value.tenantResponseId !== "number" ||
    typeof value.customerLinkUrl !== "string" ||
    typeof value.linkExpiresAt !== "string"
  ) {
    throw new Error("임장 조율 생성 응답 형식이 올바르지 않습니다.");
  }
  return {
    coordinationId: value.coordinationId,
    status: value.status,
    tenantResponseId: value.tenantResponseId,
    customerLinkUrl: value.customerLinkUrl,
    linkExpiresAt: value.linkExpiresAt,
  };
}

export function parseBuyerLinkCreateResult(value: unknown): BuyerLinkCreateResult {
  if (
    !isRecord(value) ||
    typeof value.buyerResponseId !== "number" ||
    typeof value.customerLinkUrl !== "string" ||
    typeof value.linkExpiresAt !== "string" ||
    typeof value.coordinationStatus !== "string"
  ) {
    throw new Error("구매자용 링크 생성 응답 형식이 올바르지 않습니다.");
  }
  return {
    buyerResponseId: value.buyerResponseId,
    customerLinkUrl: value.customerLinkUrl,
    linkExpiresAt: value.linkExpiresAt,
    coordinationStatus: value.coordinationStatus,
  };
}

function parseStatusCounts(value: unknown): CoordinationStatusCounts {
  if (
    !isRecord(value) ||
    typeof value.tenantChecking !== "number" ||
    typeof value.buyerDeliveryRequired !== "number" ||
    typeof value.buyerChecking !== "number" ||
    typeof value.finalConfirmationRequired !== "number" ||
    typeof value.scheduleConfirmed !== "number" ||
    typeof value.visitCompleted !== "number"
  ) {
    throw new Error("조율현황 건수 응답 형식이 올바르지 않습니다.");
  }
  return {
    tenantChecking: value.tenantChecking,
    buyerDeliveryRequired: value.buyerDeliveryRequired,
    buyerChecking: value.buyerChecking,
    finalConfirmationRequired: value.finalConfirmationRequired,
    scheduleConfirmed: value.scheduleConfirmed,
    visitCompleted: value.visitCompleted,
  };
}

function parseListItem(value: unknown): CoordinationListItem {
  if (
    !isRecord(value) ||
    typeof value.coordinationId !== "number" ||
    typeof value.propertyAddress !== "string" ||
    typeof value.tenantName !== "string" ||
    typeof value.tenantPhone !== "string" ||
    !isNullableString(value.visitScheduledAt) ||
    !isCoordinationStatus(value.status)
  ) {
    throw new Error("임장 조율 목록 항목 응답 형식이 올바르지 않습니다.");
  }
  return {
    coordinationId: value.coordinationId,
    propertyAddress: value.propertyAddress,
    tenantName: value.tenantName,
    tenantPhone: value.tenantPhone,
    visitScheduledAt: value.visitScheduledAt,
    status: value.status,
  };
}

export function parseCoordinationListResult(value: unknown): CoordinationListResult {
  if (!isRecord(value) || !Array.isArray(value.coordinations)) {
    throw new Error("임장 조율 목록 응답 형식이 올바르지 않습니다.");
  }
  return {
    statusCounts: parseStatusCounts(value.statusCounts),
    coordinations: value.coordinations.map(parseListItem),
  };
}

function parseCandidateTimeItem(value: unknown): CoordinationCandidateTimeItem {
  if (
    !isRecord(value) ||
    typeof value.candidateTimeId !== "number" ||
    typeof value.startsAt !== "string"
  ) {
    throw new Error("후보 시간 응답 형식이 올바르지 않습니다.");
  }
  return { candidateTimeId: value.candidateTimeId, startsAt: value.startsAt };
}

function parseCustomerResponseItem(value: unknown): CoordinationCustomerResponseItem {
  if (
    !isRecord(value) ||
    typeof value.responseId !== "number" ||
    !isCustomerResponseRole(value.role) ||
    !isNullableString(value.name) ||
    !isNullableString(value.phone) ||
    !isCustomerResponseResult(value.result) ||
    !isNumberArray(value.offeredCandidateIds) ||
    !isNumberArray(value.selectedCandidateIds) ||
    !isNullableString(value.submittedAt) ||
    !isNullableString(value.customerLinkUrl) ||
    !isNullableString(value.linkExpiresAt)
  ) {
    throw new Error("고객 응답 항목 응답 형식이 올바르지 않습니다.");
  }
  return {
    responseId: value.responseId,
    role: value.role,
    name: value.name,
    phone: value.phone,
    result: value.result,
    offeredCandidateIds: value.offeredCandidateIds,
    selectedCandidateIds: value.selectedCandidateIds,
    submittedAt: value.submittedAt,
    customerLinkUrl: value.customerLinkUrl,
    linkExpiresAt: value.linkExpiresAt,
  };
}

export function parseCoordinationDetailResult(value: unknown): CoordinationDetailResult {
  if (
    !isRecord(value) ||
    typeof value.coordinationId !== "number" ||
    !isRecord(value.property) ||
    typeof value.property.propertyId !== "number" ||
    typeof value.property.address !== "string" ||
    !isNullableString(value.property.addressDetail) ||
    !isNullableString(value.property.propertyName) ||
    !isDealType(value.property.dealType) ||
    !isCoordinationStatus(value.status) ||
    typeof value.createdAt !== "string" ||
    !isNullableString(value.scheduledAt) ||
    !isNullableString(value.confirmedAt) ||
    !Array.isArray(value.candidateTimes) ||
    value.tenantResponse === undefined ||
    !Array.isArray(value.buyerResponses)
  ) {
    throw new Error("임장 조율 상세 응답 형식이 올바르지 않습니다.");
  }
  return {
    coordinationId: value.coordinationId,
    property: {
      propertyId: value.property.propertyId,
      address: value.property.address,
      addressDetail: value.property.addressDetail,
      propertyName: value.property.propertyName,
      dealType: value.property.dealType,
    },
    status: value.status,
    createdAt: value.createdAt,
    scheduledAt: value.scheduledAt,
    confirmedAt: value.confirmedAt,
    candidateTimes: value.candidateTimes.map(parseCandidateTimeItem),
    tenantResponse: parseCustomerResponseItem(value.tenantResponse),
    buyerResponses: value.buyerResponses.map(parseCustomerResponseItem),
  };
}

export function parseHomeSummaryResult(value: unknown): HomeSummaryResult {
  if (
    !isRecord(value) ||
    typeof value.todayVisitCount !== "number" ||
    typeof value.inProgressCoordinationCount !== "number" ||
    typeof value.contractExpiringD90Count !== "number"
  ) {
    throw new Error("홈 요약 응답 형식이 올바르지 않습니다.");
  }
  return {
    todayVisitCount: value.todayVisitCount,
    inProgressCoordinationCount: value.inProgressCoordinationCount,
    contractExpiringD90Count: value.contractExpiringD90Count,
    coordinationStatusCounts: parseStatusCounts(value.coordinationStatusCounts),
  };
}

export function parseResponseRestartResult(value: unknown): ResponseRestartResult {
  if (
    !isRecord(value) ||
    typeof value.customerLinkUrl !== "string" ||
    typeof value.linkExpiresAt !== "string"
  ) {
    throw new Error("고객 응답 재시작 응답 형식이 올바르지 않습니다.");
  }
  return { customerLinkUrl: value.customerLinkUrl, linkExpiresAt: value.linkExpiresAt };
}
