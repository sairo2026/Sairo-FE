import type { OpsStatusMap } from "../../components/common/ops-status-badge";

export const ACCOUNT_STATUS: OpsStatusMap = {
  ACTIVE: { label: "정상", tone: "green" },
  WITHDRAWN: { label: "탈퇴", tone: "gray" },
};

export const LOGIN_METHOD_LABELS: Record<string, string> = {
  KAKAO: "카카오",
  EMAIL: "이메일",
};

export const PENDING_TYPE_LABELS: Record<string, string> = {
  REGISTRATION: "사업자 인증 신청",
  MEMBERSHIP: "사무소 참여 요청",
};

export const SUSPEND_SCOPE_LABELS: Record<string, string> = {
  ALL_SESSIONS: "전체 세션",
  SPECIFIC_SESSION: "특정 세션",
};

export const ACCOUNT_FILTER_OPTIONS = [
  { value: "ACTIVE", label: "정상" },
  { value: "WITHDRAWN", label: "탈퇴" },
];

/** 날짜(YYYY-MM-DD)와 시각(HH:mm)을 한국 시간 ISO 문자열로 합친다. 입력이 비면 null이다. */
export function toSeoulIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  return `${date}T${time}:00+09:00`;
}
