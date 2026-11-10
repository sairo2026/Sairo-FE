import type { z } from "zod";
import type { OpsVisitReviewDisputeListResponseSchema } from "@/lib/api/contracts/ops.schema";
import type { OpsStatusMap } from "../components/common/ops-status-badge";

export type DisputeItem = z.infer<typeof OpsVisitReviewDisputeListResponseSchema>["items"][number];

export const DISPUTE_STATUS: OpsStatusMap = {
  OPEN: { label: "열림", tone: "yellow" },
  UPHELD: { label: "평가 유지", tone: "blue" },
  REMOVED: { label: "평가 삭제", tone: "gray" },
};

export const REVIEW_STATUS: Record<string, string> = {
  ACTIVE: "게시 중",
  DISPUTED: "이의 접수",
  REMOVED: "삭제",
  WITHDRAWN: "철회",
};

export const REASON_CODE_LABELS: Record<string, string> = {
  FACT_INCORRECT: "사실과 다름",
  WRONG_TARGET: "평가 대상이 잘못됨",
  OTHER: "기타",
};

export const APPROVER_TYPE_LABELS: Record<string, string> = {
  OCCUPANT: "점유자",
  OWNER: "소유자",
  DELEGATE: "위임받은 대리인",
};

export const ANSWER_LABELS: Record<string, string> = {
  punctuality: "약속 시간을 지켰는가",
  advanceContact: "사전에 연락했는가",
  asRequested: "요청한 대로 안내했는가",
};

export const REMOVE_REASONS: Record<string, string> = {
  LEGAL_REQUEST: "법적 요청",
  PRIVACY_REQUEST: "개인정보 요청",
  OPERATOR_DISCRETION: "운영 재량",
};

export const DECISION_NOTE_MAX = 500;

export const STATUS_FILTERS = [
  { value: "OPEN", label: "열림(기본)" },
  { value: "UPHELD", label: "평가 유지" },
  { value: "REMOVED", label: "평가 삭제" },
  { value: "OPEN,UPHELD,REMOVED", label: "전체" },
];

export function answerText(value: unknown): string {
  if (value === "YES") return "예";
  if (value === "NO") return "아니오";
  return typeof value === "string" || typeof value === "number" ? String(value) : "-";
}
