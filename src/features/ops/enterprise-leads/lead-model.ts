import type { z } from "zod";
import type {
  OpsEnterpriseLeadDetailResponseSchema,
  OpsEnterpriseLeadListResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { OpsStatusMap } from "../components/common/ops-status-badge";

export type LeadDetail = z.infer<typeof OpsEnterpriseLeadDetailResponseSchema>;
export type LeadListItem = z.infer<typeof OpsEnterpriseLeadListResponseSchema>["items"][number];
export type LeadQuote = LeadDetail["quotes"][number];

export const LEAD_STATUS: OpsStatusMap = {
  RECEIVED: { label: "접수", tone: "blue" },
  ASSIGNED: { label: "담당 배정", tone: "teal" },
  CONSULTING: { label: "상담", tone: "teal" },
  QUOTED: { label: "견적 발행", tone: "yellow" },
  ACCEPTED: { label: "견적 수락", tone: "green" },
  REJECTED: { label: "견적 거절", tone: "red" },
  CONTRACTED: { label: "계약", tone: "green" },
  CLOSED: { label: "종료", tone: "gray" },
};

export const STAGES: { key: string; label: string; statuses: string[] }[] = [
  { key: "received", label: "접수", statuses: ["RECEIVED"] },
  { key: "assigned", label: "담당 배정", statuses: ["ASSIGNED"] },
  { key: "consulting", label: "상담", statuses: ["CONSULTING"] },
  { key: "quoted", label: "견적", statuses: ["QUOTED"] },
  { key: "decision", label: "수락 또는 거절", statuses: ["ACCEPTED", "REJECTED"] },
  { key: "final", label: "계약 또는 종료", statuses: ["CONTRACTED", "CLOSED"] },
];

export const CLOSED_REASONS: Record<string, string> = {
  NO_RESPONSE: "고객 무응답",
  CUSTOMER_WITHDREW: "고객이 철회",
  OUT_OF_SCOPE: "서비스 범위 밖",
  DUPLICATE: "중복 문의",
  OTHER: "기타",
};

export const EVENT_LABELS: Record<string, string> = {
  RECEIVED: "문의 접수",
  ASSIGNED: "담당 배정",
  REASSIGNED: "담당 재배정",
  CONSULTATION_STARTED: "상담 시작",
  QUOTE_ISSUED: "견적 발행",
  QUOTE_ACCEPTED: "견적 수락",
  QUOTE_REJECTED: "견적 거절",
  CONTRACTED: "계약 기록",
  CLOSED: "문의 종료",
  REOPENED: "문의 재개",
};

export const ACTOR_LABELS: Record<string, string> = {
  OPERATOR: "운영자",
  CUSTOMER: "고객",
  SYSTEM: "시스템",
};

export const ACTION_LABELS = {
  ASSIGN: "담당 배정",
  START_CONSULTATION: "상담 시작",
  ISSUE_QUOTE: "견적 발행",
  CONTRACT: "계약 기록",
  CLOSE: "종료",
  REOPEN: "재개",
} as const;

export type LeadAction = keyof typeof ACTION_LABELS;

export function quoteState(quote: LeadQuote): {
  label: string;
  tone: "gray" | "green" | "red" | "amber" | "blue";
} {
  if (quote.supersededAt) return { label: "대체됨", tone: "gray" };
  if (quote.acceptedAt) return { label: "수락", tone: "green" };
  if (quote.rejectedAt) return { label: "거절", tone: "red" };
  if (quote.expired) return { label: "만료", tone: "amber" };
  return { label: "유효", tone: "blue" };
}

/** 재개 때 돌아갈 단계. 견적 이후 단계에서 종료했다면 상담으로 돌아가 새 견적을 발행한다. */
export function reopenTarget(closedFromStatus: string | null | undefined): string | null {
  if (!closedFromStatus) return null;
  if (["QUOTED", "ACCEPTED", "REJECTED"].includes(closedFromStatus)) return "CONSULTING";
  return closedFromStatus;
}
