import { ApiError } from "@/shared/api/client";
import { fieldErrorSummary } from "@/shared/lib/api-messages";
import type { OpsStatusMap } from "../components/common/ops-status-badge";
import { describeOpsError } from "../model/ops-errors";

export const INVOICE_STATUS: OpsStatusMap = {
  UNBILLED: { label: "청구 전", tone: "gray" },
  PROCESSING: { label: "결제 처리 중", tone: "blue" },
  VERIFYING: { label: "결제 확인 중", tone: "amber" },
  PAID: { label: "결제 완료", tone: "green" },
  FAILED: { label: "결제 실패", tone: "red" },
  PARTIALLY_REFUNDED: { label: "부분 환불", tone: "teal" },
  FULLY_REFUNDED: { label: "전액 환불", tone: "teal" },
  CANCELLED: { label: "취소", tone: "gray" },
};

export const ATTEMPT_RESULT: OpsStatusMap = {
  PROCESSING: { label: "처리 중", tone: "blue" },
  VERIFYING: { label: "PG 확인 중", tone: "amber" },
  SUCCESS: { label: "성공", tone: "green" },
  FAILED: { label: "실패", tone: "red" },
};

export const REFUND_STATUS: OpsStatusMap = {
  RECEIVED: { label: "접수", tone: "blue" },
  REVIEWING: { label: "검토 중", tone: "blue" },
  APPROVED: { label: "승인", tone: "green" },
  REJECTED: { label: "거절", tone: "gray" },
  PROCESSING: { label: "환불 처리 중", tone: "blue" },
  VERIFYING: { label: "PG 확인 중", tone: "amber" },
  COMPLETED: { label: "환불 완료", tone: "green" },
  FAILED: { label: "환불 실패", tone: "red" },
};

export const REFUND_REASON_LABELS: Record<string, string> = {
  CANCELLATION: "해지",
  AUTH_SUSPENSION: "인증 중단",
  DUPLICATE_CHARGE: "중복 결제",
  INCORRECT_CHARGE: "오청구",
  SERVICE_FAILURE: "서비스 장애",
  LATE_APPROVAL: "승인 지연",
  POLICY_COMPENSATION: "정책 외 보상",
};

export const RECONCILIATION_STATUS: OpsStatusMap = {
  MATCHED: { label: "일치", tone: "green" },
  AMOUNT_MISMATCH: { label: "금액 불일치", tone: "red" },
  PG_ONLY: { label: "PG에만 존재", tone: "amber" },
  INTERNAL_ONLY: { label: "내부에만 존재", tone: "amber" },
  VERIFYING: { label: "확인 중", tone: "blue" },
};

export const RECONCILIATION_SOURCE_LABELS: Record<string, string> = {
  PG_QUERY: "PG 조회",
  PG_FILE: "PG 파일",
  INTERNAL: "내부 원장",
};

export const REFUND_REVIEWABLE = ["RECEIVED", "REVIEWING"];
export const STEP_UP_NOTICE =
  "이 처리는 고위험 작업이라 실행 전에 5분 이내 재인증이 필요합니다. 되돌릴 수 없고 모든 처리는 감사 로그에 남습니다.";
export const BILLING_PRIVACY_NOTICE =
  "카드번호, 계좌번호, 결제키 원문은 이 화면에 표시하지 않습니다.";

export function toOptionalNumber(value: string): number | null {
  return /^\d+$/.test(value) ? Number(value) : null;
}

const BILLING_MESSAGE_BY_CODE: Record<string, string> = {
  ASSIGNEE_NOT_ELIGIBLE: "활성 결제담당 운영자만 담당자로 지정할 수 있습니다.",
  INVALID_TRANSITION:
    "이미 처리되었거나 지금 상태에서는 할 수 없는 처리입니다. 새로 고침해 주세요.",
  SELF_APPROVAL_FORBIDDEN:
    "정책 외 보상은 검토 승인한 운영자가 직접 실행할 수 없습니다. 다른 결제담당이 실행해 주세요.",
};

export function describeBillingError(error: unknown, fallback = "처리하지 못했습니다."): string {
  if (error instanceof ApiError) {
    const mapped = BILLING_MESSAGE_BY_CODE[error.code];
    if (mapped) return mapped;
  }
  return fieldErrorSummary(error) ?? describeOpsError(error, fallback);
}
