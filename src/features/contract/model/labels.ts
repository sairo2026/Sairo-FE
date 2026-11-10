import type { BadgeTone } from "@/shared/components/ui/badge";

export const DEAL_TYPES = ["SALE", "JEONSE", "MONTHLY"] as const;
export type DealType = (typeof DEAL_TYPES)[number];

export const DEAL_TYPE_LABEL: Record<string, string> = {
  SALE: "매매",
  JEONSE: "전세",
  MONTHLY: "월세",
};

export function isLease(dealType: string): boolean {
  return dealType === "JEONSE" || dealType === "MONTHLY";
}

export const CONTRACT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "초안",
  SIGNED: "체결",
  ENDED: "종료",
  TERMINATED: "해제",
  CANCELLED: "취소",
  VOID: "무효",
};

export const CONTRACT_STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "gray",
  SIGNED: "green",
  ENDED: "blue",
  TERMINATED: "amber",
  CANCELLED: "gray",
  VOID: "red",
};

export const LEASE_STATUS_LABEL: Record<string, string> = {
  BEFORE_START: "시작 전",
  IN_PROGRESS: "기간 중",
  MATURITY_CONFIRMATION_NEEDED: "만기 도래·확인 필요",
};

export const LEASE_STATUS_TONE: Record<string, BadgeTone> = {
  BEFORE_START: "gray",
  IN_PROGRESS: "teal",
  MATURITY_CONFIRMATION_NEEDED: "red",
};

export const SETTLEMENT_STATUS_LABEL: Record<string, string> = {
  UNDECIDED: "미정",
  SCHEDULED: "예정",
  PARTIAL: "일부 지급",
  COMPLETE: "완료",
  NONE: "지급 없음",
};

export const SETTLEMENT_STATUS_TONE: Record<string, BadgeTone> = {
  UNDECIDED: "gray",
  SCHEDULED: "blue",
  PARTIAL: "amber",
  COMPLETE: "green",
  NONE: "gray",
};

export const TRACK_LABEL: Record<string, string> = {
  CONTRACT: "계약 상태",
  LEASE_PERIOD: "임대기간",
  SETTLEMENT: "잔금 상태",
};

export function statusLabelFor(track: string, status: string | null | undefined): string {
  if (!status) return "-";
  const table =
    track === "CONTRACT"
      ? CONTRACT_STATUS_LABEL
      : track === "LEASE_PERIOD"
        ? LEASE_STATUS_LABEL
        : SETTLEMENT_STATUS_LABEL;
  return table[status] ?? status;
}

export const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  SALES_CONTRACT: "거래계약서",
  DISCLOSURE_STATEMENT: "중개대상물 확인·설명서",
};

export const REVISION_TYPE_LABEL: Record<string, string> = {
  SIGNED: "체결",
  CORRECTED: "정정",
};

export function labelOf(table: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "-";
  return table[key] ?? key;
}

export function partyText(name: string | null | undefined, count: number): string {
  if (!name) return "-";
  return count > 1 ? `${name} 외 ${count - 1}명` : name;
}

export const FOLLOWUP_TYPE_LABEL: Record<string, string> = {
  D90_FOLLOWUP: "임대 만기 90일 전 후속업무",
};

export const PAYER_TYPE_LABEL: Record<string, string> = {
  SELLER_LANDLORD: "매도·임대인",
  BUYER_TENANT: "매수·임차인",
};

export const FEE_REVISION_TYPE_LABEL: Record<string, string> = {
  INITIAL: "최초 청구",
  ADJUSTED: "정상 조정",
  CORRECTED: "오입력 정정",
};

export const FEE_TRANSACTION_LABEL: Record<string, string> = {
  RECEIPT: "수납",
  REFUND: "환급",
  ADJUSTMENT: "조정",
};

export const INSTALLMENT_LABEL: Record<string, string> = {
  DEPOSIT: "계약금",
  INTERIM: "중도금",
  BALANCE: "잔금",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "미지급",
  PARTIAL: "일부 지급",
  PAID: "지급 완료",
};

export const RETENTION_NOTE: Record<string, string> = {
  SALES_CONTRACT: "보존기간 5년",
  DISCLOSURE_STATEMENT: "보존기간 3년",
};
