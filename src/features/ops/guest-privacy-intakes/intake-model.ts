import type { GuestPrivacyIntakeDetailResponse } from "@/lib/api/contracts/ops.schema";
import type { OpsStatusMap } from "../components/common/ops-status-badge";

export type IntakeItem = GuestPrivacyIntakeDetailResponse;

export const DRAFT_NOTICE = "변호사 검토 전 초안입니다. 법적 효력과 적합성은 검토 뒤 확정합니다.";

export const INTAKE_STATUS: OpsStatusMap = {
  RECEIVED: { label: "접수", tone: "blue" },
  CONVERTED: { label: "권리 요청으로 전환", tone: "green" },
  CLOSED: { label: "종결", tone: "gray" },
};

export const VERIFICATION_STATUS: OpsStatusMap = {
  PENDING: { label: "확인 전", tone: "yellow" },
  VERIFIED: { label: "본인 확인됨", tone: "green" },
  FAILED: { label: "확인 실패", tone: "red" },
};

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  ACCESS: "열람",
  CORRECTION: "정정",
  DELETION: "삭제",
  SUSPENSION: "처리정지",
};

export const REQUESTER_ROLE_LABELS: Record<string, string> = {
  SELF: "본인",
  AGENT: "대리인",
};

export const LINK_KIND_LABELS: Record<string, string> = {
  APPROVER_PROPERTY: "승인자 매물 링크",
  CUSTOMER: "고객 링크",
  APPROVER_PORTAL: "승인자 포털",
};

export const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: "이메일",
  PHONE: "전화",
};

export const CLOSE_REASONS: Record<string, string> = {
  DUPLICATE: "중복 접수",
  NOT_SUBJECT: "처리 대상 아님",
  UNVERIFIABLE: "본인 확인 불가",
  WITHDRAWN_BY_REQUESTER: "요청자가 철회",
};
