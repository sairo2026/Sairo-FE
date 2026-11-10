import type {
  PropertyCreateRequest,
  PropertyDetailResponse,
  PropertyFieldDefinitionListResponse,
  PropertyUpdateRequest,
} from "@/lib/api/contracts/property.schema";
import { countCodePoints, TEXT_LIMITS } from "@/shared/lib/format";
import { objectParticle, topicParticle } from "@/shared/lib/korean";

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

export function formFromDetail(detail: PropertyDetailResponse): PropertyFormValues {
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

export type PropertyValidationOptions = {
  requireCategory: boolean;
  activate: boolean;
};

export function validatePropertyForm(
  values: PropertyFormValues,
  options: PropertyValidationOptions,
): PropertyFormErrors {
  const errors: PropertyFormErrors = {};
  const name = values.name.trim();
  if (name === "") errors.name = `${objectParticle("매물명")} 입력해 주세요.`;
  else errors.name = lengthError("매물명", name, TEXT_LIMITS.title);
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
  errors.description = lengthError("설명", values.description, TEXT_LIMITS.bodyMemo);
  errors.memo = lengthError("메모", values.memo, TEXT_LIMITS.bodyMemo);
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
