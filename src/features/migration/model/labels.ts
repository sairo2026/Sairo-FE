import type { BadgeTone } from "@/shared/components/ui/badge";

type Labeled = { label: string; tone: BadgeTone };

export const IMPORT_MONTHLY_LIMIT = 5;
export const IMPORT_MAX_FILE_BYTES = 20 * 1024 * 1024;
export const IMPORT_ACCEPTED_EXTENSIONS = [".xls", ".xlsx", ".csv"] as const;

export const TARGET_TYPES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "CUSTOMER", label: "고객" },
  { value: "PROPERTY", label: "매물" },
];

export function targetTypeLabel(value: string): string {
  if (value === "CONTRACT") return "계약";
  return TARGET_TYPES.find((item) => item.value === value)?.label ?? value;
}

export const BATCH_STATUS: Record<string, Labeled> = {
  UPLOADED: { label: "업로드됨", tone: "blue" },
  MAPPING: { label: "매핑 중", tone: "blue" },
  PREVIEW: { label: "미리보기", tone: "teal" },
  EXECUTING: { label: "실행 중", tone: "amber" },
  COMPLETED: { label: "완료", tone: "green" },
  FAILED: { label: "실패", tone: "red" },
  CANCELLED: { label: "취소", tone: "gray" },
};

export const SUPPORT_STATUS: Record<string, Labeled> = {
  REQUESTED: { label: "신청", tone: "blue" },
  QUOTED: { label: "견적 도착", tone: "amber" },
  ACCEPTED: { label: "결제 대기", tone: "amber" },
  PAID: { label: "결제 완료", tone: "teal" },
  PROCESSING: { label: "처리 중", tone: "blue" },
  REVIEW: { label: "검수 대기", tone: "amber" },
  APPROVED: { label: "승인", tone: "teal" },
  DELIVERED: { label: "납품 완료", tone: "green" },
  CANCELLED: { label: "취소", tone: "gray" },
  REJECTED: { label: "거절", tone: "red" },
};

export const ENDED_SUPPORT_STATUSES: readonly string[] = ["CANCELLED", "REJECTED"];

export const NOT_CANCELLED_REASONS: Record<string, string> = {
  EXTERNAL_LINK: "외부 연결이 생긴 항목",
  FOLLOW_UP_EDIT: "이전 후 수정된 항목",
  LEGAL_RETENTION: "법정 보존 서류가 생긴 항목",
};

export const ENTITY_TYPE_LABEL: Record<string, string> = {
  CUSTOMER: "고객",
  PROPERTY: "매물",
  CONTRACT: "계약",
};

export const EDITABLE_BATCH_STATUSES: readonly string[] = ["UPLOADED", "MAPPING", "PREVIEW"];

export function isActiveSupportLink(status: string | null | undefined): boolean {
  return Boolean(status) && !ENDED_SUPPORT_STATUSES.includes(status as string);
}

export const SUPPORT_STEPS: ReadonlyArray<{ status: string; label: string }> = [
  { status: "REQUESTED", label: "신청" },
  { status: "QUOTED", label: "견적" },
  { status: "ACCEPTED", label: "결제" },
  { status: "PROCESSING", label: "처리" },
  { status: "REVIEW", label: "검수" },
  { status: "APPROVED", label: "승인" },
  { status: "DELIVERED", label: "납품" },
];

export const EXPORT_STATUS: Record<string, Labeled> = {
  PENDING: { label: "생성 중", tone: "amber" },
  PROCESSING: { label: "생성 중", tone: "amber" },
  COMPLETED: { label: "완료", tone: "green" },
  FAILED: { label: "실패", tone: "red" },
  EXPIRED: { label: "만료", tone: "gray" },
};

export const EXPORT_TABLES: ReadonlyArray<{ code: string; label: string }> = [
  { code: "PROPERTY", label: "매물" },
  { code: "CUSTOMER", label: "고객" },
  { code: "CONTRACT", label: "계약" },
  { code: "FEE", label: "수수료" },
  { code: "PAYMENT", label: "잔금·지급" },
  { code: "TASK", label: "업무" },
  { code: "VISIT", label: "방문" },
];

export const TARGET_FIELD_LABEL: Record<string, string> = {
  customerSourceId: "원본 고객 ID",
  customerName: "고객명",
  customerIsCorporation: "법인 여부",
  customerPhone: "연락처",
  customerSecondaryPhone: "보조 연락처",
  customerEmail: "이메일",
  customerMemo: "고객 메모",
  propertySourceId: "원본 매물 ID",
  propertyName: "매물명",
  propertyAddress: "기본주소",
  propertyAddressDetail: "상세주소",
  exclusiveAreaSqm: "전용면적(㎡)",
  supplyAreaSqm: "공급면적(㎡)",
  landAreaSqm: "대지면적(㎡)",
  grossFloorAreaSqm: "연면적(㎡)",
  moveInDate: "입주 가능일",
  moveInNegotiable: "입주일 협의 가능 여부",
  maintenanceFeeAmount: "관리비 금액",
  maintenanceFeeItems: "관리비 포함 항목",
  occupancyStatus: "점유상태",
  propertyDescription: "매물 설명",
  propertyMemo: "매물 메모",
};

export function targetFieldLabel(field: string): string {
  return TARGET_FIELD_LABEL[field] ?? field;
}

export const DUPLICATE_JUDGEMENT: Record<string, Labeled> = {
  NEW: { label: "새로 만듦", tone: "green" },
  ALREADY_IMPORTED: { label: "이미 이전됨", tone: "gray" },
  DUPLICATE_IN_FILE: { label: "파일 안 중복", tone: "amber" },
  DUPLICATE_EXISTING: { label: "기존 자료와 중복", tone: "amber" },
};

export const SKIP_REASON_LABEL = {
  alreadyImported: "이미 이전된 자료",
  duplicateInFile: "파일 안에서 겹침",
  duplicateExisting: "기존 고객과 겹침",
} as const;

export const ROW_SKIP_REASON_LABEL: Record<string, string> = {
  ALREADY_IMPORTED: "이미 이전된 자료라 건너뜀",
  DUPLICATE_IN_FILE: "파일 안에서 같은 번호가 먼저 나와 건너뜀",
  DUPLICATE_EXISTING: "사이로에 이미 있는 자료와 겹쳐 건너뜀",
};

export const SUPPORT_POLLING_STATUSES: readonly string[] = [
  "REQUESTED",
  "PAID",
  "PROCESSING",
  "APPROVED",
];
