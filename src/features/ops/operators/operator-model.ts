import { ApiError } from "@/shared/api/client";
import type { OpsStatusMap } from "../components/common/ops-status-badge";
import { describeOpsError } from "../model/ops-errors";

export const OPERATOR_STATUS: OpsStatusMap = {
  ACTIVE: { label: "활성", tone: "green" },
  DISABLED: { label: "비활성", tone: "gray" },
};

export const INVITATION_STATUS: OpsStatusMap = {
  PENDING: { label: "대기", tone: "blue" },
  ACCEPTED: { label: "수락", tone: "green" },
  EXPIRED: { label: "만료", tone: "gray" },
  CANCELLED: { label: "취소", tone: "red" },
};

export const INVITATION_VALID_HOURS = 72;

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  RAW_ACCESS_REQUESTED: "원문 접근 요청",
  RAW_ACCESS_APPROVED: "원문 접근 승인",
  RAW_ACCESS_REJECTED: "원문 접근 거절",
  RAW_ACCESS_EXECUTED: "원문 접근 실행",
  RAW_ACCESS_DOWNLOADED: "원문 파일 다운로드",
  RAW_ACCESS_REVOKED: "원문 접근 회수",
  OPERATOR_ROLE_GRANTED: "운영자 역할 배정",
  OPERATOR_ROLE_REVOKED: "운영자 역할 회수",
  OPERATOR_DISABLED: "운영자 비활성화",
  OPERATOR_ENABLED: "운영자 재활성화",
  OPERATOR_INVITATION_CREATED: "운영자 초대 생성",
  OPERATOR_INVITATION_CANCELLED: "운영자 초대 취소",
};

export const AUDIT_TARGET_LABELS: Record<string, string> = {
  OFFICE: "사무소",
  MEMBER: "회원",
  SUPPORT_INQUIRY: "지원 문의",
  IMPORT_BATCH: "데이터 이전 묶음",
  OFFICE_REGISTRATION: "인증 신청",
};

const OPERATOR_MESSAGES: Record<string, string> = {
  INVITATION_ALREADY_PENDING:
    "같은 이메일로 대기 중인 초대가 이미 있습니다. 기존 초대를 취소하거나 만료된 뒤 다시 초대해 주세요.",
  LAST_SECURITY_ADMIN:
    "마지막 활성 보안관리자의 역할은 회수하거나 비활성화할 수 없습니다. 다른 보안관리자를 먼저 지정해 주세요.",
};

export function describeOperatorError(error: unknown, fallback = "처리하지 못했습니다."): string {
  if (error instanceof ApiError && OPERATOR_MESSAGES[error.code]) {
    return OPERATOR_MESSAGES[error.code] ?? fallback;
  }
  return describeOpsError(error, fallback);
}

/** 서울 날짜(YYYY-MM-DD)의 자정을 오프셋이 붙은 ISO 문자열로 바꾼다. */
export function seoulDayStart(date: string): string | undefined {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00+09:00` : undefined;
}

/** 종료일은 그 날짜 끝까지 포함하도록 다음 날 자정(제외)으로 보낸다. */
export function seoulNextDayStart(date: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return `${next.toISOString().slice(0, 10)}T00:00:00+09:00`;
}
