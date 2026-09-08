export const propertyDealTypes = ["MONTHLY", "JEONSE", "SALE"] as const;
export type PropertyDealType = (typeof propertyDealTypes)[number];

export type PropertySummary = {
  propertyId: number;
  propertyName: string | null;
  address: string;
  addressDetail: string | null;
  dealType: PropertyDealType;
};

export type PropertyDetail = PropertySummary & { createdAt: string };
export type DuplicateProperty = Omit<PropertySummary, "dealType">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isDealType(value: unknown): value is PropertyDealType {
  return propertyDealTypes.some((dealType) => dealType === value);
}

function parseSummary(value: unknown): PropertySummary {
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

export function parsePropertyList(value: unknown): PropertySummary[] {
  if (!isRecord(value) || !Array.isArray(value.properties)) {
    throw new Error("매물 목록 응답 형식이 올바르지 않습니다.");
  }
  return value.properties.map(parseSummary);
}

export function parsePropertyDetail(value: unknown): PropertyDetail {
  const summary = parseSummary(value);
  if (!isRecord(value) || typeof value.createdAt !== "string") {
    throw new Error("매물 상세 응답 형식이 올바르지 않습니다.");
  }
  return { ...summary, createdAt: value.createdAt };
}

export function parseDuplicateProperties(value: unknown): DuplicateProperty[] {
  if (!isRecord(value) || !Array.isArray(value.duplicateProperties)) {
    throw new Error("중복 주소 응답 형식이 올바르지 않습니다.");
  }
  return value.duplicateProperties.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.propertyId !== "number" ||
      typeof item.address !== "string" ||
      !isNullableString(item.addressDetail) ||
      !isNullableString(item.propertyName)
    ) {
      throw new Error("중복 매물 응답 형식이 올바르지 않습니다.");
    }
    return {
      propertyId: item.propertyId,
      address: item.address,
      addressDetail: item.addressDetail,
      propertyName: item.propertyName,
    };
  });
}
