import {
  OpsImportSupportRequestDetailResponseSchema,
  OpsImportSupportRequestListResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { OpsImportSupportRequestDetailResponse } from "@/lib/api/contracts/ops.schema";
import type { OpsStatusMap } from "../components/common/ops-status-badge";

export const ImportSupportListSchema = OpsImportSupportRequestListResponseSchema;
export const ImportSupportDetailSchema = OpsImportSupportRequestDetailResponseSchema;
export type ImportSupportDetail = OpsImportSupportRequestDetailResponse;

export const IMPORT_SUPPORT_STATUS: OpsStatusMap = {
  REQUESTED: { label: "요청됨", tone: "blue" },
  QUOTED: { label: "견적됨", tone: "blue" },
  ACCEPTED: { label: "견적 수락", tone: "amber" },
  PAID: { label: "결제 완료", tone: "teal" },
  PROCESSING: { label: "처리 중", tone: "amber" },
  REVIEW: { label: "대표 검수", tone: "amber" },
  APPROVED: { label: "대표 승인", tone: "green" },
  DELIVERED: { label: "납품 완료", tone: "green" },
  CANCELLED: { label: "취소", tone: "gray" },
  REJECTED: { label: "거절", tone: "red" },
};

export const BATCH_STATUS_LABELS: Record<string, string> = {
  UPLOADED: "업로드됨",
  MAPPING: "매핑 중",
  PREVIEW: "미리보기",
  EXECUTING: "실행 중",
  COMPLETED: "실행 완료",
  FAILED: "실행 실패",
  CANCELLED: "취소",
};

export const STATUS_FILTER_OPTIONS = [
  { value: "", label: "전체" },
  ...Object.entries(IMPORT_SUPPORT_STATUS).map(([value, entry]) => ({
    value,
    label: entry.label,
  })),
];

export const ASSIGNEE_FILTER_OPTIONS = [
  { value: "", label: "전체" },
  { value: "true", label: "내가 담당" },
];

export const DEFAULT_QUOTE_AMOUNT = 220_000;
export const MAX_QUOTE_AMOUNT = 100_000_000;
export const SCOPE_NOTE_MAX_LENGTH = 500;

export type MappingTargetType = "CUSTOMER" | "PROPERTY";

export type TargetField = {
  field: string;
  label: string;
  required: boolean;
};

export const TARGET_TYPE_LABELS: Record<MappingTargetType, string> = {
  CUSTOMER: "고객",
  PROPERTY: "매물",
};

export const TARGET_FIELDS: Record<MappingTargetType, TargetField[]> = {
  CUSTOMER: [
    { field: "customerSourceId", label: "원본 고객 ID", required: true },
    { field: "customerName", label: "고객명", required: true },
    { field: "customerIsCorporation", label: "법인 여부", required: false },
    { field: "customerPhone", label: "연락처", required: false },
    { field: "customerSecondaryPhone", label: "보조 연락처", required: false },
    { field: "customerEmail", label: "이메일", required: false },
    { field: "customerMemo", label: "고객 메모", required: false },
  ],
  PROPERTY: [
    { field: "propertySourceId", label: "원본 매물 ID", required: true },
    { field: "propertyName", label: "매물명", required: true },
    { field: "propertyAddress", label: "기본주소", required: false },
    { field: "propertyAddressDetail", label: "상세주소", required: false },
    { field: "exclusiveAreaSqm", label: "전용면적(㎡)", required: false },
    { field: "supplyAreaSqm", label: "공급면적(㎡)", required: false },
    { field: "landAreaSqm", label: "대지면적(㎡)", required: false },
    { field: "grossFloorAreaSqm", label: "연면적(㎡)", required: false },
    { field: "moveInDate", label: "입주 가능일", required: false },
    { field: "moveInNegotiable", label: "입주일 협의 가능 여부", required: false },
    { field: "maintenanceFeeAmount", label: "관리비 금액", required: false },
    { field: "maintenanceFeeItems", label: "관리비 포함 항목", required: false },
    { field: "occupancyStatus", label: "점유상태", required: false },
    { field: "propertyDescription", label: "매물 설명", required: false },
    { field: "propertyMemo", label: "매물 메모", required: false },
  ],
};

export function isMappingTargetType(value: string): value is MappingTargetType {
  return value === "CUSTOMER" || value === "PROPERTY";
}

export type MappingDraft = Record<string, string>;

export function draftFromMapping(
  sourceColumns: readonly string[],
  items: readonly { sourceColumn: string; targetField: string }[],
): MappingDraft {
  const draft: MappingDraft = {};
  for (const column of sourceColumns) draft[column] = "";
  for (const item of items) {
    if (item.sourceColumn in draft) draft[item.sourceColumn] = item.targetField;
  }
  return draft;
}

export function validateMapping(draft: MappingDraft, targetType: MappingTargetType): string[] {
  const problems: string[] = [];
  const chosen = Object.values(draft).filter((value) => value !== "");
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const value of chosen) {
    if (seen.has(value)) duplicated.add(value);
    seen.add(value);
  }
  const fields = TARGET_FIELDS[targetType];
  for (const field of fields) {
    if (duplicated.has(field.field)) {
      problems.push(`${field.label}에 연결된 원본 열이 둘 이상입니다.`);
    }
    if (field.required && !seen.has(field.field)) {
      problems.push(`${field.label}은 반드시 한 열에 연결해야 합니다.`);
    }
  }
  return problems;
}

export function mappingBody(draft: MappingDraft) {
  return Object.entries(draft)
    .filter(([, targetField]) => targetField !== "")
    .map(([sourceColumn, targetField]) => ({ sourceColumn, targetField }));
}

export type QuoteInput = { amount: string; scopeNote: string };

export function validateQuote(input: QuoteInput): {
  amount?: string;
  scopeNote?: string;
  value: number | null;
} {
  const trimmed = input.amount.replace(/,/g, "").trim();
  const errors: { amount?: string; scopeNote?: string } = {};
  let value: number | null = null;
  if (trimmed === "") {
    errors.amount = "견적 금액을 입력해 주세요.";
  } else if (!/^\d+$/.test(trimmed)) {
    errors.amount = "견적 금액은 숫자만 입력해 주세요.";
  } else {
    const parsed = Number(trimmed);
    if (parsed <= 0) errors.amount = "견적 금액은 0원보다 커야 합니다.";
    else if (parsed > MAX_QUOTE_AMOUNT) errors.amount = "견적 금액이 너무 큽니다.";
    else value = parsed;
  }
  if (input.scopeNote.length > SCOPE_NOTE_MAX_LENGTH) {
    errors.scopeNote = `범위 비고는 ${SCOPE_NOTE_MAX_LENGTH}자 이하로 입력해 주세요.`;
  }
  return { ...errors, value: errors.amount || errors.scopeNote ? null : value };
}
