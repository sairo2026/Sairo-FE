import {
  DeletionQueueListResponseSchema,
  DeletionQueuePreviewResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { DeletionQueueListResponse } from "@/lib/api/contracts/ops.schema";
import type { OpsStatusMap } from "../components/common/ops-status-badge";

export const DeletionListSchema = DeletionQueueListResponseSchema;
export const DeletionPreviewSchema = DeletionQueuePreviewResponseSchema;
export type DeletionItem = DeletionQueueListResponse["items"][number];

export const STORE_RESULT: OpsStatusMap = {
  PENDING: { label: "대기", tone: "gray" },
  SUCCESS: { label: "성공", tone: "green" },
  FAILED: { label: "실패", tone: "red" },
  EXCLUDED: { label: "제외", tone: "amber" },
};

export type DeletionPhase =
  "CANCELLED" | "PENDING" | "AWAITING_VERIFICATION" | "COMPLETED" | "FAILED" | "EXCLUDED";

export const DELETION_PHASE: OpsStatusMap = {
  CANCELLED: { label: "취소됨", tone: "gray" },
  PENDING: { label: "실행 대기", tone: "blue" },
  AWAITING_VERIFICATION: { label: "검증 대기", tone: "amber" },
  COMPLETED: { label: "완료", tone: "green" },
  FAILED: { label: "실패", tone: "red" },
  EXCLUDED: { label: "보존 제외", tone: "amber" },
};

export const TARGET_TYPE_LABELS: Record<string, string> = {
  CUSTOMER: "고객",
  PROPERTY: "매물",
  CONTRACT: "계약",
  OFFICE: "사무소",
  MEMBER: "회원",
};

export function targetTypeLabel(value: string): string {
  return TARGET_TYPE_LABELS[value] ?? value;
}

/** 검증 전에는 실행이 끝났어도 완료로 보이지 않는다. */
export function phaseOf(item: DeletionItem): DeletionPhase {
  if (item.cancelledAt) return "CANCELLED";
  if (item.executedAt === null) return item.result === "EXCLUDED" ? "EXCLUDED" : "PENDING";
  if (item.verifiedAt === null) return "AWAITING_VERIFICATION";
  if (item.result === "FAILED") return "FAILED";
  if (item.result === "EXCLUDED") return "EXCLUDED";
  return "COMPLETED";
}

export const VERIFY_RESULT_OPTIONS = [
  { value: "", label: "결과를 선택해 주세요" },
  { value: "SUCCESS", label: "성공" },
  { value: "FAILED", label: "실패" },
  { value: "EXCLUDED", label: "제외(근거 있음)" },
];

export type VerifyKey =
  "storageResult" | "searchIndexResult" | "fileResult" | "temporaryExportResult";

export const VERIFY_FIELDS: { key: VerifyKey; label: string }[] = [
  { key: "storageResult", label: "운영 저장소 결과" },
  { key: "searchIndexResult", label: "검색 색인 결과" },
  { key: "fileResult", label: "파일 결과" },
  { key: "temporaryExportResult", label: "임시 내보내기 결과" },
];

export const EVIDENCE_MAX_LENGTH = 500;
export const REASON_MAX_LENGTH = 500;

export type ExcludeInput = {
  exclusionReason: string;
  approverId: string;
  holdDate: string;
  holdTime: string;
  reviewDate: string;
  reviewTime: string;
};

export type ExcludeErrors = Partial<Record<keyof ExcludeInput, string>>;

export function toSeoulIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const iso = `${date}T${time}:00+09:00`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

export function validateExclude(
  input: ExcludeInput,
  operatorId: number,
  now: number,
): ExcludeErrors {
  const errors: ExcludeErrors = {};
  if (input.exclusionReason.trim() === "") errors.exclusionReason = "보존 근거를 입력해 주세요.";
  const approver = input.approverId.trim();
  if (approver === "") errors.approverId = "승인자 운영자 번호를 입력해 주세요.";
  else if (!/^[1-9]\d*$/.test(approver)) errors.approverId = "운영자 번호는 숫자로 입력해 주세요.";
  else if (Number(approver) === operatorId) {
    errors.approverId = "승인자는 실행자와 달라야 합니다. 본인은 승인자가 될 수 없습니다.";
  }
  const hold = toSeoulIso(input.holdDate, input.holdTime);
  if (hold === null) errors.holdDate = "보존·분쟁 보류 만료 시각을 입력해 주세요.";
  else if (Date.parse(hold) <= now) errors.holdDate = "만료 시각은 지금 이후여야 합니다.";
  const review = toSeoulIso(input.reviewDate, input.reviewTime);
  if (review === null) errors.reviewDate = "재검토 예정일을 입력해 주세요.";
  else if (Date.parse(review) <= now) errors.reviewDate = "재검토 예정일은 지금 이후여야 합니다.";
  else if (hold !== null && Date.parse(review) > Date.parse(hold)) {
    errors.reviewDate = "재검토 예정일은 보류 만료 시각 이전이어야 합니다.";
  }
  return errors;
}
