import {
  KakaoUnlinkEventListResponseSchema,
  KakaoUnlinkEventRetryResponseSchema,
  RetentionRuleListResponseSchema,
  RetentionRuleResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type {
  KakaoUnlinkEventListResponse,
  RetentionRuleListResponse,
} from "@/lib/api/contracts/ops.schema";
import type { OpsStatusMap } from "../components/common/ops-status-badge";

export const RetentionListSchema = RetentionRuleListResponseSchema;
export const RetentionRuleSchema = RetentionRuleResponseSchema;
export const KakaoEventListSchema = KakaoUnlinkEventListResponseSchema;
export const KakaoRetrySchema = KakaoUnlinkEventRetryResponseSchema;

export type RetentionRule = RetentionRuleListResponse["items"][number];
export type KakaoEvent = KakaoUnlinkEventListResponse["items"][number];

export const ANCHOR_LABELS: Record<string, string> = {
  WITHDRAWN_AT: "탈퇴 시각",
  RECORDED_AT: "기록 시각",
  APPROVAL_END: "승인 종료",
  ACCESSED_AT: "접근 시각",
  COMPLETED_AT: "완료 시각",
  CLOSED_AT: "종결 시각",
  CONTRACT_END: "계약 종료",
  ISSUED_AT: "발급 시각",
};

export const RULE_STATUS: OpsStatusMap = {
  ASSUMPTION: { label: "내부 권장안", tone: "amber" },
  LAWYER_CONFIRMED: { label: "변호사 확인", tone: "green" },
  ADVISOR_CONFIRMED: { label: "자문 확인", tone: "teal" },
};

export const RULE_STATUS_OPTIONS = Object.entries(RULE_STATUS).map(([value, entry]) => ({
  value,
  label: entry.label,
}));

export const DIRECTION_LABELS: Record<string, string> = {
  OUTBOUND_CALL: "호출",
  INBOUND_WEBHOOK: "수신",
};

export const DIRECTION_OPTIONS = [
  { value: "", label: "전체 방향" },
  ...Object.entries(DIRECTION_LABELS).map(([value, label]) => ({ value, label })),
];

export const KAKAO_STATUS: OpsStatusMap = {
  PENDING: { label: "대기", tone: "blue" },
  SUCCEEDED: { label: "성공", tone: "green" },
  FAILED_RETRYING: { label: "재시도 중", tone: "amber" },
  ABANDONED: { label: "포기", tone: "red" },
  APPLIED: { label: "반영", tone: "green" },
  NO_MATCH: { label: "대상 없음", tone: "gray" },
  DUPLICATE_IGNORED: { label: "중복 무시", tone: "gray" },
};

export const KAKAO_STATUS_OPTIONS = [
  { value: "", label: "전체 상태" },
  ...Object.entries(KAKAO_STATUS).map(([value, entry]) => ({ value, label: entry.label })),
];

export function canRetryKakao(event: KakaoEvent): boolean {
  return (
    event.direction === "OUTBOUND_CALL" &&
    (event.status === "PENDING" || event.status === "FAILED_RETRYING")
  );
}

export type RuleEditInput = {
  retentionDays: string;
  basisNote: string;
  status: string;
  changeReason: string;
};

export type RuleEditErrors = Partial<Record<keyof RuleEditInput, string>>;

export function ruleInputOf(rule: RetentionRule): RuleEditInput {
  return {
    retentionDays: String(rule.retentionDays),
    basisNote: rule.basisNote,
    status: rule.status,
    changeReason: "",
  };
}

export function validateRuleEdit(input: RuleEditInput): RuleEditErrors {
  const errors: RuleEditErrors = {};
  if (!/^[1-9]\d*$/.test(input.retentionDays.trim())) {
    errors.retentionDays = "보관 일수는 1 이상의 정수로 입력해 주세요.";
  }
  if (input.basisNote.trim() === "") errors.basisNote = "근거 메모를 입력해 주세요.";
  if (!(input.status in RULE_STATUS)) errors.status = "확인 상태를 선택해 주세요.";
  if (input.changeReason.trim() === "") errors.changeReason = "변경 사유를 입력해 주세요.";
  return errors;
}

export function toRuleBody(input: RuleEditInput) {
  return {
    retentionDays: Number(input.retentionDays.trim()),
    basisNote: input.basisNote.trim(),
    status: input.status,
    changeReason: input.changeReason.trim(),
  };
}
