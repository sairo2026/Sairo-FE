import { ApiError } from "@/shared/api/client";
import { fieldErrorSummary } from "@/shared/lib/api-messages";
import { describeOpsError } from "../model/ops-errors";

const SYSTEM_MESSAGE_BY_CODE: Record<string, string> = {
  INTEGRATION_PREREQUISITE_INCOMPLETE:
    "계약·동의·고지 점검과 승인, 회사 정보 게시·수신 시험이 끝나지 않아 운영 환경 활성화와 변경을 할 수 없습니다.",
  DOCUMENT_VERSION_CONFLICT: "같은 연동에 같은 종류와 버전의 사본이 이미 등록되어 있습니다.",
  INVALID_REQUEST: "입력값을 확인해 주세요.",
};

export const INTEGRATION_PREREQUISITE_LABELS: Record<string, string> = {
  CONTRACT_SIGNED: "계약 체결",
  CONSENT: "동의 완료",
  CONTRACT_NOTICE_REVIEW: "계약·고지 점검",
  COMPANY_INFO_PUBLISHED_VERSION: "회사 정보 게시",
  COMPANY_INFO_INQUIRY_DELIVERY_TEST: "실제 문의 수신 시험",
  COMPANY_INFO_REVIEW: "회사 정보 검토",
  POLICY_DOCUMENTS_NOT_PUBLISHED: "정책 문서 게시",
  STANDARD_PRICE_SCHEDULE_NOT_APPROVED: "표준 요금표 승인",
};

export function prerequisiteLabels(items: readonly string[]): string[] {
  return items.map((item) => INTEGRATION_PREREQUISITE_LABELS[item] ?? item);
}

export function missingPrerequisites(error: unknown): string[] {
  if (!(error instanceof ApiError) || error.code !== "INTEGRATION_PREREQUISITE_INCOMPLETE") {
    return [];
  }
  return error.details.missingItems ?? [];
}

export function describeSystemError(error: unknown, fallback = "처리하지 못했습니다."): string {
  const missing = missingPrerequisites(error);
  if (missing.length > 0) {
    return `${SYSTEM_MESSAGE_BY_CODE.INTEGRATION_PREREQUISITE_INCOMPLETE} 남은 조건: ${prerequisiteLabels(missing).join(", ")}.`;
  }
  if (error instanceof ApiError) {
    const mapped = SYSTEM_MESSAGE_BY_CODE[error.code];
    if (mapped) {
      const summary = fieldErrorSummary(error);
      return error.code === "INVALID_REQUEST" && summary ? `${mapped} ${summary}` : mapped;
    }
  }
  return describeOpsError(error, fallback);
}

export function toSeoulIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const iso = `${date}T${time}:00+09:00`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

export function parseIdList(raw: string): number[] | null {
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
  if (parts.some((part) => !/^[1-9]\d*$/.test(part))) return null;
  return parts.map(Number);
}

export function parsePositiveInt(raw: string): number | null {
  const value = raw.trim();
  return /^[1-9]\d*$/.test(value) ? Number(value) : null;
}

export function parseServiceList(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
}
