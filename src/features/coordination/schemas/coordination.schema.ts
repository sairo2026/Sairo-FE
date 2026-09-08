export const coordinationDealTypes = ["MONTHLY", "JEONSE", "SALE"] as const;
export type CoordinationDealType = (typeof coordinationDealTypes)[number];

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isDealType(value: unknown): value is CoordinationDealType {
  return coordinationDealTypes.some((dealType) => dealType === value);
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
