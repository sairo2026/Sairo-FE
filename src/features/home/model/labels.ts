import {
  coordinationListPath,
  coordinationRequestsPath,
} from "@/features/visit/model/visit-routes";
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
  VISIT_CONFIRMED: "확정 완료",
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
  TERMS_CHANGED: "약관·방침 변경",
  CONTRACT_EXPIRY: "임대 만기",
  OWNER_TRANSFER: "대표 이전",
};

/** 대표 이전 알림은 이동 대상 종류가 NONE이라 알림 종류로 이동 화면을 정한다. */
export const OWNER_TRANSFER_HREF = "/members/owner-transfer";

/** 계약에서 생긴 업무(잔금·만기)의 원천 번호는 계약 ID라서 그 계약으로 보낸다. 그 외는 null이다. */
export function taskContractHref(
  sourceType: string,
  sourceId: number | null | undefined,
): string | null {
  const isContractSource = sourceType === "CONTRACT_BALANCE" || sourceType === "CONTRACT_MATURITY";
  return isContractSource && sourceId ? `/contracts/${sourceId}` : null;
}

export function notificationLink(
  type: string,
  targetType: string,
  targetId: number | null | undefined,
): string | null {
  if (type === "OWNER_TRANSFER") return OWNER_TRANSFER_HREF;
  return notificationHref(targetType, targetId);
}

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
    case "CONTRACT":
      return targetId ? `/contracts/${targetId}` : "/contracts";
    case "SUPPORT_TICKET":
      return targetId ? `/support/${targetId}` : "/support";
    default:
      return null;
  }
}

export type NotificationTab = "general" | "visit-request";

export const VISIT_REQUEST_NOTICES_HREF = "/notifications?tab=visit-request";

export function parseNotificationTab(value: string | string[] | undefined): NotificationTab {
  const text = Array.isArray(value) ? value[0] : value;
  return text === "visit-request" ? "visit-request" : "general";
}

export function visitRequestNoticeHref(coordinationId: number | null | undefined): string {
  return coordinationId ? coordinationRequestsPath(coordinationId) : coordinationListPath();
}

export function notificationTypeLabel(type: string): string {
  return NOTIFICATION_TYPE_LABEL[type] ?? "알림";
}

const NOTIFICATION_TYPE_TONE: Record<string, BadgeTone> = {
  SECURITY_ALERT: "red",
  DELETION_SCHEDULED: "red",
  VISIT_RESCHEDULE_NEEDED: "red",
  TRIAL_ENDING: "amber",
  PAYMENT: "amber",
  PLAN_CHANGED: "amber",
  RETURN_SCHEDULED: "amber",
  TERMS_CHANGED: "amber",
  CONTRACT_EXPIRY: "amber",
  VISIT_COMPLETION_PENDING: "amber",
  VISIT_CONFIRMED: "green",
  VISIT_SCHEDULED: "teal",
  NOTICE: "yellow",
};

/** 읽지 않은 알림 라벨의 색. 경고성은 빨강·주황, 확정은 초록, 안내는 노랑, 그 밖은 파랑이다. 읽은 알림은 화면에서 회색으로 낮춘다. */
export function notificationTypeTone(type: string): BadgeTone {
  return NOTIFICATION_TYPE_TONE[type] ?? "blue";
}
