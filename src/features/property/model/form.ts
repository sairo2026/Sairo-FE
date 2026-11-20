import type {
  PropertyCreateRequest,
  PropertyDetailResponse,
  PropertyFieldDefinitionListResponse,
  PropertyOfferCreateRequest,
  PropertyUpdateRequest,
} from "@/lib/api/contracts/property.schema";
import { countCodePoints, TEXT_LIMITS } from "@/shared/lib/format";
import { htmlMarkupError } from "@/shared/lib/html-markup";
import { objectParticle, topicParticle } from "@/shared/lib/korean";
import { isDealType } from "./labels";
import type { DealType } from "./labels";

export type FieldDefinition = PropertyFieldDefinitionListResponse["items"][number];

export type PropertyFormValues = {
  name: string;
  categoryId: string;
  address: string;
  addressDetail: string;
  managingMembershipId: string;
  exclusiveAreaSqm: string;
  supplyAreaSqm: string;
  landAreaSqm: string;
  grossFloorAreaSqm: string;
  moveInDate: string;
  moveInNegotiable: boolean;
  maintenanceFeeAmount: string;
  maintenanceFeeItems: string;
  occupancyStatus: string;
  description: string;
  memo: string;
  referenceLeaseEndDate: string;
  referenceLeaseEndSource: string;
  duplicateOverrideReason: string;
  dealType: DealType;
  salePrice: string;
  depositAmount: string;
  monthlyRentAmount: string;
};

export type PropertyFormField = keyof PropertyFormValues;
export type PropertyFormErrors = Partial<Record<PropertyFormField, string>>;

export const EMPTY_PROPERTY_FORM: PropertyFormValues = {
  name: "",
  categoryId: "",
  address: "",
  addressDetail: "",
  managingMembershipId: "",
  exclusiveAreaSqm: "",
  supplyAreaSqm: "",
  landAreaSqm: "",
  grossFloorAreaSqm: "",
  moveInDate: "",
  moveInNegotiable: false,
  maintenanceFeeAmount: "",
  maintenanceFeeItems: "",
  occupancyStatus: "UNKNOWN",
  description: "",
  memo: "",
  referenceLeaseEndDate: "",
  referenceLeaseEndSource: "",
  duplicateOverrideReason: "",
  dealType: "MONTHLY",
  salePrice: "",
  depositAmount: "",
  monthlyRentAmount: "",
};

const ADDRESS_MAX = 200;
const DETAIL_MAX = 100;
const SOURCE_MAX = 100;
const ITEMS_MAX = 200;

function text(value: string | null | undefined): string {
  return value ?? "";
}

function numberText(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

const ACTIVE_OFFER_STATUSES: readonly string[] = ["AVAILABLE", "NEGOTIATING"];

/** 거래 제안 중 진행 중인 첫 번째 제안. 수정 화면에서 거래유형과 가격을 보여줄 때 쓴다. */
export function activeOfferOf(detail: PropertyDetailResponse) {
  return detail.offers.find((offer) => ACTIVE_OFFER_STATUSES.includes(offer.status)) ?? null;
}

export function formFromDetail(detail: PropertyDetailResponse): PropertyFormValues {
  const offer = activeOfferOf(detail);
  return {
    name: detail.name,
    categoryId: String(detail.categoryId),
    address: text(detail.address),
    addressDetail: text(detail.addressDetail),
    managingMembershipId: numberText(detail.managingMembershipId),
    exclusiveAreaSqm: numberText(detail.exclusiveAreaSqm),
    supplyAreaSqm: numberText(detail.supplyAreaSqm),
    landAreaSqm: numberText(detail.landAreaSqm),
    grossFloorAreaSqm: numberText(detail.grossFloorAreaSqm),
    moveInDate: text(detail.moveInDate),
    moveInNegotiable: detail.moveInNegotiable,
    maintenanceFeeAmount: numberText(detail.maintenanceFeeAmount),
    maintenanceFeeItems: text(detail.maintenanceFeeItems),
    occupancyStatus: detail.occupancyStatus,
    description: text(detail.description),
    memo: text(detail.memo),
    referenceLeaseEndDate: text(detail.referenceLeaseEndDate),
    referenceLeaseEndSource: text(detail.referenceLeaseEndSource),
    duplicateOverrideReason: "",
    dealType: offer && isDealType(offer.dealType) ? offer.dealType : "MONTHLY",
    salePrice: numberText(offer?.salePrice),
    depositAmount: numberText(offer?.depositAmount),
    monthlyRentAmount: numberText(offer?.monthlyRentAmount),
  };
}

function isPositiveDecimal(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value) && Number(value) > 0;
}

function lengthError(label: string, value: string, max: number): string | undefined {
  return countCodePoints(value.trim()) > max
    ? `${topicParticle(label)} ${max}자 이하로 입력해 주세요.`
    : undefined;
}

const AMOUNT_PATTERN = /^\d+$/;
const AMOUNT_MAX_DIGITS = 15;

function amountError(label: string, value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") {
    return `${topicParticle(label)} 0 이상의 정수(원)로 입력해 주세요. 해당 금액이 없으면 0을 입력해 주세요.`;
  }
  if (!AMOUNT_PATTERN.test(trimmed) || trimmed.length > AMOUNT_MAX_DIGITS) {
    return `${topicParticle(label)} 0 이상의 정수(원)로 입력해 주세요.`;
  }
  return undefined;
}

/** 가격은 비워 둘 수 있고, 하나라도 적으면 거래유형에 필요한 금액을 모두 받는다. */
export function hasOfferPrice(values: PropertyFormValues): boolean {
  return (
    values.salePrice.trim() !== "" ||
    values.depositAmount.trim() !== "" ||
    values.monthlyRentAmount.trim() !== ""
  );
}

function validateOfferFields(values: PropertyFormValues): PropertyFormErrors {
  const errors: PropertyFormErrors = {};
  if (!hasOfferPrice(values)) return errors;
  if (values.dealType === "SALE") {
    errors.salePrice = amountError("매매가", values.salePrice);
  } else {
    errors.depositAmount = amountError(
      values.dealType === "JEONSE" ? "전세 보증금" : "보증금",
      values.depositAmount,
    );
  }
  if (values.dealType === "MONTHLY") {
    errors.monthlyRentAmount = amountError("월세", values.monthlyRentAmount);
  }
  return errors;
}

/** 입력한 가격이 있으면 새 거래 제안 요청을, 없으면 null을 돌려준다. */
export function toOfferRequest(values: PropertyFormValues): PropertyOfferCreateRequest | null {
  if (!hasOfferPrice(values)) return null;
  return {
    dealType: values.dealType,
    salePrice: values.dealType === "SALE" ? Number(values.salePrice) : null,
    depositAmount: values.dealType === "SALE" ? null : Number(values.depositAmount),
    monthlyRentAmount: values.dealType === "MONTHLY" ? Number(values.monthlyRentAmount) : null,
    premiumAmount: null,
  };
}

export type PropertyValidationOptions = {
  requireCategory: boolean;
  activate: boolean;
  /** 이미 진행 중인 제안이 있으면 거래유형과 가격은 거래 제안 탭에서 바꾸므로 검증하지 않는다. */
  checkOffer?: boolean;
};

export function validatePropertyForm(
  values: PropertyFormValues,
  options: PropertyValidationOptions,
): PropertyFormErrors {
  const errors: PropertyFormErrors = {};
  const name = values.name.trim();
  if (name === "") errors.name = `${objectParticle("매물명")} 입력해 주세요.`;
  else errors.name = lengthError("매물명", name, TEXT_LIMITS.title) ?? htmlMarkupError(name);
  if (options.requireCategory && values.categoryId === "") {
    errors.categoryId = "카테고리를 선택해 주세요.";
  }
  if (options.activate) {
    if (values.address.trim() === "") errors.address = "활성 등록에는 주소가 필요합니다.";
    if (values.managingMembershipId === "") {
      errors.managingMembershipId = "활성 등록에는 담당 공인중개사가 필요합니다.";
    }
  }
  errors.address ??= lengthError("주소", values.address, ADDRESS_MAX);
  errors.addressDetail = lengthError("상세 주소", values.addressDetail, DETAIL_MAX);
  const areaFields = [
    ["exclusiveAreaSqm", "전용면적"],
    ["supplyAreaSqm", "공급면적"],
    ["landAreaSqm", "대지면적"],
    ["grossFloorAreaSqm", "연면적"],
  ] as const;
  for (const [field, label] of areaFields) {
    const value = values[field].trim();
    if (value !== "" && !isPositiveDecimal(value)) {
      errors[field] = `${topicParticle(label)} 0보다 큰 숫자로 입력해 주세요.`;
    }
  }
  const fee = values.maintenanceFeeAmount.trim();
  if (fee !== "" && !/^\d+$/.test(fee)) {
    errors.maintenanceFeeAmount = "관리비는 0 이상의 정수로 입력해 주세요.";
  }
  errors.maintenanceFeeItems = lengthError(
    "관리비 포함 항목",
    values.maintenanceFeeItems,
    ITEMS_MAX,
  );
  errors.description =
    lengthError("설명", values.description, TEXT_LIMITS.bodyMemo) ??
    htmlMarkupError(values.description);
  errors.memo =
    lengthError("메모", values.memo, TEXT_LIMITS.bodyMemo) ?? htmlMarkupError(values.memo);
  const hasLeaseDate = values.referenceLeaseEndDate !== "";
  const hasLeaseSource = values.referenceLeaseEndSource.trim() !== "";
  if (hasLeaseDate && !hasLeaseSource) {
    errors.referenceLeaseEndSource = "참고 만기일의 확인 출처를 입력해 주세요.";
  }
  if (!hasLeaseDate && hasLeaseSource) {
    errors.referenceLeaseEndDate = "확인 출처를 입력했다면 참고 만기일도 입력해 주세요.";
  }
  errors.referenceLeaseEndSource ??= lengthError(
    "확인 출처",
    values.referenceLeaseEndSource,
    SOURCE_MAX,
  );
  if (options.checkOffer !== false) Object.assign(errors, validateOfferFields(values));
  if (values.moveInNegotiable && values.moveInDate !== "") {
    errors.moveInDate = "입주 가능일을 협의로 정하면 날짜를 비워 주세요.";
  }
  return Object.fromEntries(
    Object.entries(errors).filter(([, message]) => message !== undefined),
  ) as PropertyFormErrors;
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function nullableNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

export function toCreateRequest(values: PropertyFormValues): PropertyCreateRequest {
  return {
    name: values.name.trim(),
    categoryId: Number(values.categoryId),
    address: nullable(values.address),
    addressDetail: nullable(values.addressDetail),
    managingMembershipId: nullableNumber(values.managingMembershipId),
    exclusiveAreaSqm: nullableNumber(values.exclusiveAreaSqm),
    supplyAreaSqm: nullableNumber(values.supplyAreaSqm),
    landAreaSqm: nullableNumber(values.landAreaSqm),
    grossFloorAreaSqm: nullableNumber(values.grossFloorAreaSqm),
    moveInDate: nullable(values.moveInDate),
    moveInNegotiable: values.moveInNegotiable,
    maintenanceFeeAmount: nullableNumber(values.maintenanceFeeAmount),
    maintenanceFeeItems: nullable(values.maintenanceFeeItems),
    occupancyStatus: values.occupancyStatus,
    description: nullable(values.description),
    memo: nullable(values.memo),
    referenceLeaseEndDate: nullable(values.referenceLeaseEndDate),
    referenceLeaseEndSource: nullable(values.referenceLeaseEndSource),
    duplicateOverrideReason: nullable(values.duplicateOverrideReason),
  };
}

export function toUpdateRequest(
  values: PropertyFormValues,
  activate: boolean,
): PropertyUpdateRequest {
  const { categoryId: ignoredCategoryId, ...rest } = toCreateRequest(values);
  void ignoredCategoryId;
  const request: PropertyUpdateRequest = { ...rest, occupancyStatus: values.occupancyStatus };
  return activate ? { ...request, registrationStage: "ACTIVE" } : request;
}

export function fieldRawFromValue(definition: FieldDefinition, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (definition.fieldType === "BOOLEAN") return value === true ? "true" : "false";
  return String(value);
}

export function validateFieldValue(definition: FieldDefinition, raw: string): string | undefined {
  if (raw.trim() === "") return undefined;
  if (definition.fieldType === "NUMBER") {
    if (!/^-?\d+(\.\d+)?$/.test(raw.trim())) return "숫자로 입력해 주세요.";
    const value = Number(raw);
    if (definition.numberKind === "INTEGER" && !Number.isInteger(value)) {
      return "정수로 입력해 주세요.";
    }
    const { minValue, maxValue } = definition;
    const unit = definition.unit ?? "";
    if (minValue !== null && minValue !== undefined && value < minValue) {
      return `${minValue}${unit} 이상으로 입력해 주세요.`;
    }
    if (maxValue !== null && maxValue !== undefined && value > maxValue) {
      return `${maxValue}${unit} 이하로 입력해 주세요.`;
    }
  }
  if (definition.fieldType === "TEXT" && countCodePoints(raw) > TEXT_LIMITS.shortMemo) {
    return `${TEXT_LIMITS.shortMemo}자 이하로 입력해 주세요.`;
  }
  return undefined;
}

export function toFieldPayload(
  definition: FieldDefinition,
  raw: string,
): string | number | boolean | null {
  if (raw.trim() === "") return null;
  if (definition.fieldType === "NUMBER") return Number(raw);
  if (definition.fieldType === "BOOLEAN") return raw === "true";
  return raw.trim();
}
