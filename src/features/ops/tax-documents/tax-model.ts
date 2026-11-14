import type { OpsStatusMap } from "../components/common/ops-status-badge";

export const TAX_KIND_LABELS: Record<string, string> = {
  TAX_INVOICE: "세금계산서",
  CASH_RECEIPT: "현금영수증",
  EXEMPT_INVOICE: "면세 계산서",
};

export const TAX_STATUS: OpsStatusMap = {
  NOT_REQUIRED: { label: "발급 대상 아님", tone: "gray" },
  PENDING: { label: "발급 대기", tone: "blue" },
  ISSUED: { label: "발급됨", tone: "green" },
  ISSUE_FAILED: { label: "발급 실패", tone: "red" },
  AMENDED: { label: "수정 발급", tone: "teal" },
  CANCELLED: { label: "취소", tone: "gray" },
};

export const RECORD_STATUS_OPTIONS = [
  { value: "ISSUED", label: "발급됨" },
  { value: "ISSUE_FAILED", label: "발급 실패" },
  { value: "NOT_REQUIRED", label: "발급 대상 아님" },
];

export const TAX_ELIGIBLE_INVOICE_STATUS = ["PAID", "PARTIALLY_REFUNDED", "FULLY_REFUNDED"];

export const TAX_DRAFT_NOTICE =
  "변호사와 세무사 검토 전 초안이며 법적 효력과 적합성은 검토 뒤 확정합니다. 발급 기한 힌트는 세무사 확인 전 가정입니다.";

const SIGNED_INTEGER = /^-?\d+$/;

export function parseSignedInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!SIGNED_INTEGER.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/** 총액에서 공급가액과 세액을 나누는 제안값. 세무사 확인 전 가정이다. */
export function suggestSplit(total: number): { supply: number; vat: number } {
  const supply = Math.round(total / 1.1);
  return { supply, vat: total - supply };
}
