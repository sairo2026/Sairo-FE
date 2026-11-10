import type {
  CustomerCreateRequest,
  CustomerDetailResponse,
  CustomerUpdateRequest,
} from "@/lib/api/contracts/customer.schema";
import { countCodePoints, TEXT_LIMITS } from "@/shared/lib/format";
import { objectParticle, topicParticle } from "@/shared/lib/korean";
import { PROCESSING_BASES } from "./labels";
import { CUSTOMER_COLLECTION_COPY } from "./legal-copy";

export type CustomerFormValues = {
  isCorporation: boolean;
  name: string;
  phone: string;
  secondaryPhone: string;
  email: string;
  memo: string;
  managingMembershipId: string;
  dataSource: string;
  processingBasis: string;
  dataPurpose: string;
  retentionUntil: string;
};

export type CustomerFormField = keyof CustomerFormValues;
export type CustomerFormErrors = Partial<Record<CustomerFormField, string>>;

export const EMPTY_CUSTOMER_FORM: CustomerFormValues = {
  isCorporation: false,
  name: "",
  phone: "",
  secondaryPhone: "",
  email: "",
  memo: "",
  managingMembershipId: "",
  dataSource: "",
  processingBasis: "",
  dataPurpose: "",
  retentionUntil: "",
};

const PHONE_PATTERN = /^0\d{1,2}-\d{3,4}-\d{4}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESIDENT_NUMBER_PATTERN = /\d{6}\s?-?\s?[1-8]\d{6}/;
const SOURCE_MAX = 100;
const PURPOSE_MAX = 200;

export const SENSITIVE_DATA_MESSAGE =
  "주민등록번호나 전체 금융계좌번호는 입력할 수 없습니다. 해당 내용을 지워 주세요.";

export function hasResidentNumber(value: string): boolean {
  return RESIDENT_NUMBER_PATTERN.test(value);
}

export function formFromDetail(detail: CustomerDetailResponse): CustomerFormValues {
  return {
    isCorporation: detail.isCorporation,
    name: detail.name,
    phone: detail.phone ?? "",
    secondaryPhone: detail.secondaryPhone ?? "",
    email: detail.email ?? "",
    memo: detail.memo ?? "",
    managingMembershipId: String(detail.managingMembershipId),
    dataSource: detail.dataSource,
    processingBasis: detail.processingBasis === "UNSPECIFIED" ? "" : detail.processingBasis,
    dataPurpose: detail.dataPurpose,
    retentionUntil: detail.retentionUntil,
  };
}

function lengthError(label: string, value: string, max: number): string | undefined {
  return countCodePoints(value.trim()) > max
    ? `${topicParticle(label)} ${max}자 이하로 입력해 주세요.`
    : undefined;
}

function sensitiveError(value: string): string | undefined {
  return hasResidentNumber(value) ? SENSITIVE_DATA_MESSAGE : undefined;
}

export function validateCustomerForm(
  values: CustomerFormValues,
  options: { isCreate: boolean },
): CustomerFormErrors {
  const errors: CustomerFormErrors = {};
  const nameLabel = values.isCorporation ? "법인명" : "이름";
  const name = values.name.trim();
  if (name === "") errors.name = `${objectParticle(nameLabel)} 입력해 주세요.`;
  else errors.name = lengthError(nameLabel, name, TEXT_LIMITS.title) ?? sensitiveError(name);
  const phone = values.phone.trim();
  if (phone !== "" && !PHONE_PATTERN.test(phone)) {
    errors.phone = "연락처를 010-0000-0000 형식으로 입력해 주세요.";
  }
  const secondary = values.secondaryPhone.trim();
  if (secondary !== "" && !PHONE_PATTERN.test(secondary)) {
    errors.secondaryPhone = "보조 연락처를 010-0000-0000 형식으로 입력해 주세요.";
  }
  const email = values.email.trim();
  if (email !== "" && !EMAIL_PATTERN.test(email)) {
    errors.email = "이메일 형식이 올바르지 않습니다.";
  }
  errors.memo =
    lengthError("메모", values.memo, TEXT_LIMITS.bodyMemo) ?? sensitiveError(values.memo);
  if (values.managingMembershipId === "") {
    errors.managingMembershipId = "담당 공인중개사를 선택해 주세요.";
  }
  const source = values.dataSource.trim();
  if (source === "") errors.dataSource = `${objectParticle("수집 경로")} 입력해 주세요.`;
  else errors.dataSource = lengthError("수집 경로", source, SOURCE_MAX);
  const basis = values.processingBasis;
  if (basis === "") {
    if (options.isCreate) errors.processingBasis = CUSTOMER_COLLECTION_COPY.basisMissing;
  } else if (!(PROCESSING_BASES as readonly string[]).includes(basis)) {
    errors.processingBasis = CUSTOMER_COLLECTION_COPY.basisMissing;
  }
  const purpose = values.dataPurpose.trim();
  if (purpose === "") errors.dataPurpose = `${objectParticle("수집 목적")} 입력해 주세요.`;
  else errors.dataPurpose = lengthError("수집 목적", purpose, PURPOSE_MAX);
  if (values.retentionUntil === "")
    errors.retentionUntil = CUSTOMER_COLLECTION_COPY.retentionMissing;
  return Object.fromEntries(
    Object.entries(errors).filter(([, message]) => message !== undefined),
  ) as CustomerFormErrors;
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function toCreateRequest(values: CustomerFormValues): CustomerCreateRequest {
  return {
    isCorporation: values.isCorporation,
    name: values.name.trim(),
    managingMembershipId: Number(values.managingMembershipId),
    dataSource: values.dataSource.trim(),
    processingBasis: values.processingBasis,
    dataPurpose: values.dataPurpose.trim(),
    retentionUntil: values.retentionUntil,
    phone: nullable(values.phone),
    secondaryPhone: nullable(values.secondaryPhone),
    email: nullable(values.email),
    memo: nullable(values.memo),
  };
}

export function toUpdateRequest(values: CustomerFormValues): CustomerUpdateRequest {
  const request: CustomerUpdateRequest = {
    name: values.name.trim(),
    managingMembershipId: Number(values.managingMembershipId),
    dataSource: values.dataSource.trim(),
    dataPurpose: values.dataPurpose.trim(),
    retentionUntil: values.retentionUntil,
    phone: nullable(values.phone),
    secondaryPhone: nullable(values.secondaryPhone),
    email: nullable(values.email),
    memo: nullable(values.memo),
  };
  return values.processingBasis === ""
    ? request
    : { ...request, processingBasis: values.processingBasis };
}
