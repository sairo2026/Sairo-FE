import type { BadgeTone } from "@/shared/components/ui/badge";

type Labeled = { label: string; tone: BadgeTone };

export const IMPORT_MONTHLY_LIMIT = 5;
export const IMPORT_MAX_FILE_BYTES = 20 * 1024 * 1024;
export const IMPORT_ACCEPTED_EXTENSIONS = [".xls", ".xlsx", ".csv"] as const;

export const TARGET_TYPES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "CUSTOMER", label: "고객" },
  { value: "PROPERTY", label: "매물" },
  { value: "CONTRACT", label: "계약" },
];

export function targetTypeLabel(value: string): string {
  return TARGET_TYPES.find((item) => item.value === value)?.label ?? value;
}

export const BATCH_STATUS: Record<string, Labeled> = {
  UPLOADED: { label: "업로드됨", tone: "blue" },
  MAPPING: { label: "매핑 중", tone: "blue" },
  PREVIEW: { label: "미리보기", tone: "teal" },
  EXECUTING: { label: "실행 중", tone: "amber" },
  COMPLETED: { label: "완료", tone: "green" },
  FAILED: { label: "실패", tone: "red" },
  CANCELLED: { label: "취소됨", tone: "gray" },
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
