import { z } from "zod";
import {
  OpsCompanyServiceInfoCreateResponseSchema,
  OpsCompanyServiceInfoResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { OpsCompanyServiceInfoRequest } from "@/lib/api/contracts/ops.schema";

/**
 * 회사 정보는 등록 때 게시되지 않고 실제 문의 수신 시험 성공을 기록할 때 게시된다(백엔드 OpsContentService).
 * 게시 전 버전의 publishedAt은 null이다.
 */
const CompanyInfoItemSchema = OpsCompanyServiceInfoResponseSchema.shape.items.element.extend({
  publishedAt: z.string().nullable(),
});

export const CompanyInfoListSchema = OpsCompanyServiceInfoResponseSchema.extend({
  items: z.array(CompanyInfoItemSchema),
});

export const CompanyInfoCreateSchema = OpsCompanyServiceInfoCreateResponseSchema.extend({
  publishedAt: z.string().nullable(),
});

export type CompanyInfoItem = z.infer<typeof CompanyInfoItemSchema>;

export type CompanyForm = {
  businessName: string;
  representativeName: string;
  businessNumber: string;
  ecommerceNotice: string;
  address: string;
  contactPhone: string;
  supportEmail: string;
  supportHours: string;
  emergencyContact: string;
  privacyOfficer: string;
  privacyContact: string;
  privacyRequestPath: string;
  cancellationPath: string;
};

export const EMPTY_COMPANY_FORM: CompanyForm = {
  businessName: "",
  representativeName: "",
  businessNumber: "",
  ecommerceNotice: "",
  address: "",
  contactPhone: "",
  supportEmail: "",
  supportHours: "",
  emergencyContact: "",
  privacyOfficer: "",
  privacyContact: "",
  privacyRequestPath: "",
  cancellationPath: "",
};

type FieldKey = keyof CompanyForm;

export type CompanyFieldSpec = {
  key: FieldKey;
  label: string;
  max?: number;
  optional?: boolean;
  placeholder?: string;
};

export const BUSINESS_FIELDS: CompanyFieldSpec[] = [
  { key: "businessName", label: "상호", max: 200 },
  { key: "representativeName", label: "대표자", max: 100 },
  { key: "businessNumber", label: "사업자등록번호", max: 20, placeholder: "000-00-00000" },
  {
    key: "ecommerceNotice",
    label: "통신판매업 신고번호(해당 시)",
    max: 100,
    optional: true,
  },
  { key: "address", label: "주소" },
  { key: "contactPhone", label: "연락처(전화)", max: 30, placeholder: "02-0000-0000" },
];

export const SUPPORT_FIELDS: CompanyFieldSpec[] = [
  { key: "supportEmail", label: "지원 이메일", max: 254 },
  { key: "supportHours", label: "운영시간", placeholder: "평일 09:00-18:00" },
  { key: "emergencyContact", label: "긴급 연락 경로" },
];

export const PRIVACY_FIELDS: CompanyFieldSpec[] = [
  { key: "privacyOfficer", label: "개인정보 책임자", max: 100 },
  { key: "privacyContact", label: "개인정보 담당 연락처" },
  { key: "privacyRequestPath", label: "권리 요청 접수 경로" },
  { key: "cancellationPath", label: "구독 해지 경로" },
];

const ALL_FIELDS = [...BUSINESS_FIELDS, ...SUPPORT_FIELDS, ...PRIVACY_FIELDS];

export type CompanyErrors = Partial<Record<FieldKey, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BUSINESS_NUMBER = /^\d{3}-?\d{2}-?\d{5}$/;

export function validateCompanyForm(form: CompanyForm): CompanyErrors {
  const errors: CompanyErrors = {};
  for (const field of ALL_FIELDS) {
    const value = form[field.key].trim();
    if (value === "") {
      if (!field.optional) errors[field.key] = `${field.label}을(를) 입력해 주세요.`;
      continue;
    }
    if (field.max && value.length > field.max) {
      errors[field.key] = `${field.label}은(는) ${field.max}자 이내로 입력해 주세요.`;
    }
  }
  if (!errors.businessNumber && !BUSINESS_NUMBER.test(form.businessNumber.trim())) {
    errors.businessNumber = "사업자등록번호는 숫자 10자리로 입력해 주세요.";
  }
  if (!errors.supportEmail && !EMAIL.test(form.supportEmail.trim())) {
    errors.supportEmail = "지원 이메일 형식이 올바르지 않습니다.";
  }
  return errors;
}

export function toCompanyRequest(form: CompanyForm): OpsCompanyServiceInfoRequest {
  const trimmed = (value: string) => value.trim();
  const notice = trimmed(form.ecommerceNotice);
  return {
    businessName: trimmed(form.businessName),
    representativeName: trimmed(form.representativeName),
    businessNumber: trimmed(form.businessNumber),
    address: trimmed(form.address),
    contactPhone: trimmed(form.contactPhone),
    ecommerceNotice: notice === "" ? null : notice,
    supportEmail: trimmed(form.supportEmail),
    supportHours: trimmed(form.supportHours),
    emergencyContact: trimmed(form.emergencyContact),
    privacyOfficer: trimmed(form.privacyOfficer),
    privacyContact: trimmed(form.privacyContact),
    privacyRequestPath: trimmed(form.privacyRequestPath),
    cancellationPath: trimmed(form.cancellationPath),
  };
}

export function formFromInfo(item: CompanyInfoItem): CompanyForm {
  return {
    businessName: item.businessName,
    representativeName: item.representativeName,
    businessNumber: item.businessNumber,
    ecommerceNotice: item.ecommerceNotice ?? "",
    address: item.address,
    contactPhone: item.contactPhone,
    supportEmail: item.supportEmail,
    supportHours: item.supportHours,
    emergencyContact: item.emergencyContact,
    privacyOfficer: item.privacyOfficer,
    privacyContact: item.privacyContact,
    privacyRequestPath: item.privacyRequestPath,
    cancellationPath: item.cancellationPath,
  };
}

export function latestInfo(items: readonly CompanyInfoItem[]): CompanyInfoItem | null {
  return items.reduce<CompanyInfoItem | null>(
    (best, item) => (best === null || item.versionNo > best.versionNo ? item : best),
    null,
  );
}

export const MISSING_ITEM_LABELS: Record<string, string> = {
  PUBLISHED_VERSION: "게시된 회사 정보 버전",
  INQUIRY_DELIVERY_TEST: "실제 문의 수신 시험",
  REVIEW: "검토",
};

export const COMPANY_NOTICE_TEXTS = [
  "입력한 값은 공개 요금 페이지와 공개 사이트 하단에 그대로 노출됩니다.",
  "통신판매업 신고번호가 비어 있으면 공개 하단에서 그 줄이 사라집니다.",
  "필수 정보 게시와 실제 문의 수신 시험 전에는 출시 활성화가 차단됩니다.",
  "새 버전을 게시하면 그 버전으로 수신 시험과 검토를 다시 기록해야 합니다.",
  "변호사 검토 전 초안이며 법적 효력과 적합성은 검토 뒤 확정합니다.",
];

export function publicFooterRows(form: CompanyForm): { label: string; value: string }[] {
  const rows = [
    { label: "상호", value: form.businessName },
    { label: "대표", value: form.representativeName },
    { label: "사업자등록번호", value: form.businessNumber },
    { label: "통신판매업 신고번호", value: form.ecommerceNotice },
    { label: "주소", value: form.address },
    { label: "전화", value: form.contactPhone },
    { label: "이메일", value: form.supportEmail },
  ];
  return rows.filter((row) => row.value.trim() !== "");
}

export const CALENDAR_REASON_MAX = 200;

export const INTEGRATION_CONTRACT_LABELS: Record<string, string> = {
  PENDING: "계약 대기",
  SIGNED: "체결",
  EXPIRED: "만료",
  TERMINATED: "해지",
};

export const INTEGRATION_CONSENT_LABELS: Record<string, string> = {
  NOT_REQUIRED: "동의 불필요",
  PENDING: "동의 대기",
  GRANTED: "동의 완료",
  WITHDRAWN: "동의 철회",
};
