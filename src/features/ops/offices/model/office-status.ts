import type { OpsStatusMap } from "../../components/common/ops-status-badge";

export const REGISTRATION_STATUS: OpsStatusMap = {
  DRAFT: { label: "작성 중", tone: "gray" },
  PENDING_REVIEW: { label: "심사 대기", tone: "amber" },
  SUPPLEMENT_REQUESTED: { label: "보완 요청", tone: "yellow" },
  APPROVED: { label: "인증 완료", tone: "green" },
  REJECTED: { label: "반려", tone: "red" },
  REVOKED: { label: "회수", tone: "red" },
  CANCELLED: { label: "취소", tone: "gray" },
};

export const SUBSCRIPTION_STATUS: OpsStatusMap = {
  PRE_PAYMENT: { label: "결제 전", tone: "gray" },
  TRIAL: { label: "체험", tone: "blue" },
  ACTIVE: { label: "유료 정상", tone: "green" },
  PAST_DUE_GRACE: { label: "미납 유예", tone: "amber" },
  PAST_DUE_RESTRICTED: { label: "미납 제한", tone: "red" },
  SUSPENDED: { label: "정지", tone: "red" },
  ENDED: { label: "종료", tone: "gray" },
};

export const MEMBER_ROLE_LABELS: Record<string, string> = {
  OWNER: "대표",
  AGENT: "중개사",
  DEPUTY: "중개보조원",
};

export const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  APPROVED: "승인",
  PENDING: "대기",
  REMOVED: "제외",
};

export const REGISTRATION_FILTER_OPTIONS = [
  { value: "APPROVED", label: "인증 완료" },
  { value: "REVOKED", label: "회수" },
];

export const SUBSCRIPTION_FILTER_OPTIONS = Object.entries(SUBSCRIPTION_STATUS).map(
  ([value, entry]) => ({ value, label: entry.label }),
);
