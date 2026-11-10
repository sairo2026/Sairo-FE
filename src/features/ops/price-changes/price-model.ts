import { ApiError } from "@/shared/api/client";
import type { OpsStatusMap } from "../components/common/ops-status-badge";
import { describeOpsError } from "../model/ops-errors";

export const DECISION_STATUS: OpsStatusMap = {
  PENDING: { label: "응답 대기", tone: "blue" },
  AGREED: { label: "동의", tone: "green" },
  DECLINED: { label: "거절", tone: "red" },
  NOT_REQUIRED: { label: "안내만", tone: "gray" },
  ENDED_NO_CONSENT: { label: "무응답 종료", tone: "amber" },
};

export const CHANGE_KIND_LABELS: Record<string, string> = {
  INCREASE: "인상",
  NON_INCREASE: "인하·동일",
};

export const SKIP_REASON_LABELS: Record<string, string> = {
  START_CUSTOMER_PRICE_LOCK: "시작 고객 가격 보장 기간 안",
  NO_PAYING_SUBSCRIPTION: "체험·결제 전 상태이거나 구독 없음",
  ALREADY_NOTIFIED: "같은 새 가격 버전 안내가 이미 있음",
  NO_CHANGE: "금액 변화 없음",
};

export const NOTICE_RULE_TEXT =
  "새 가격 버전의 효력 시각이 안내 시각의 30일 뒤 정각보다 앞서면 안내를 만들 수 없습니다. 30일 뒤 정각은 허용합니다.";

export const MAX_OFFICE_IDS = 500;

export function parseOfficeIds(text: string): number[] | null | "invalid" {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const parts = trimmed.split(/[\s,]+/).filter((part) => part !== "");
  const ids: number[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part) || Number(part) === 0) return "invalid";
    ids.push(Number(part));
  }
  if (ids.length > MAX_OFFICE_IDS) return "invalid";
  return ids;
}

export function describePriceError(error: unknown): string {
  if (error instanceof ApiError && error.status === 422) {
    return "새 가격 버전의 효력 시각이 안내 시각의 30일 뒤보다 앞서 안내를 만들 수 없습니다. 효력 시각을 확인해 주세요.";
  }
  if (error instanceof ApiError && error.code === "INVALID_TRANSITION") {
    return "예약 상태의 표준 요금표 버전에만 안내를 만들 수 있습니다.";
  }
  if (error instanceof ApiError && error.status === 400 && error.fieldErrors?.length) {
    return error.fieldErrors.map((item) => item.message).join(" ");
  }
  return describeOpsError(error, "안내를 만들지 못했습니다.");
}
