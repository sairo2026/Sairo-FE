import type { BadgeTone } from "@/shared/components/ui/badge";

export const TASK_SOURCE_LABEL: Record<string, string> = {
  MANUAL: "직접 만든 업무",
  VISIT: "방문 일정",
  CONTRACT_BALANCE: "잔금 예정",
  CONTRACT_MATURITY: "임대 만기",
};

export const TASK_STATUS_LABEL: Record<string, string> = {
  TODO: "미완료",
  DONE: "완료",
  CANCELLED: "취소",
};

export const TASK_STATUS_TONE: Record<string, BadgeTone> = {
  TODO: "blue",
  DONE: "green",
  CANCELLED: "gray",
};

export function isAutoTask(sourceType: string): boolean {
  return sourceType !== "MANUAL";
}

export const NOTIFICATION_TYPE_LABEL: Record<string, string> = {
  OFFICE_REVIEW: "사무소 심사",
  MEMBERSHIP_APPROVAL_NEEDED: "참여 승인",
  INVITATION: "초대",
  ASSIGNEE_CHANGED: "담당 변경",
  VISIT_SCHEDULED: "방문 일정",
  VISIT_CONFIRMED: "방문 확정",
  VISIT_RESCHEDULE_NEEDED: "재조율 필요",
  VISIT_COMPLETION_PENDING: "방문 완료 처리 대기",
  VISIT_SUPERVISION_CHECK: "감독 확인",
  SECURITY_ALERT: "로그인·보안",
  NOTICE: "공지·혜택",
  TRIAL_ENDING: "체험 종료",
  PLAN_CHANGED: "요금 변경",
  PAYMENT: "결제",
  RETURN_SCHEDULED: "자료 반환 예정",
  DELETION_SCHEDULED: "삭제 예정",
  SUPPORT_REPLY: "지원 답변",
};

export function notificationHref(targetType: string, targetId: number | null | undefined) {
  switch (targetType) {
    case "OFFICE_REGISTRATION":
      return "/office/review";
    case "MEMBERSHIP":
      return "/members/requests";
    case "VISIT_COORDINATION":
      return targetId ? `/coordinations/${targetId}` : "/coordinations";
    case "PROPERTY":
      return targetId ? `/properties/${targetId}` : "/properties";
    case "CUSTOMER":
      return targetId ? `/customers/${targetId}` : "/customers";
    case "SUBSCRIPTION":
      return "/billing";
    case "DATA_RETURN":
      return "/billing/return-guide";
    default:
      return null;
  }
}

export function notificationTypeLabel(type: string): string {
  return NOTIFICATION_TYPE_LABEL[type] ?? "알림";
}
