import type { z } from "zod";
import type {
  RawAccessDetailResponseSchema,
  RawAccessListResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import { ApiError } from "@/shared/api/client";
import type { OpsStatusMap } from "../components/common/ops-status-badge";
import { describeOpsError } from "../model/ops-errors";

export type RawAccessDetail = z.infer<typeof RawAccessDetailResponseSchema>;
export type RawAccessListItem = z.infer<typeof RawAccessListResponseSchema>["items"][number];

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  RAW_VIEW: "열람",
  RAW_DOWNLOAD: "다운로드",
};

export const TARGET_TYPE_LABELS: Record<string, string> = {
  OFFICE: "사무소",
  MEMBER: "회원",
  SUPPORT_INQUIRY: "지원 문의",
  IMPORT_BATCH: "데이터 이전 묶음",
  OFFICE_REGISTRATION: "인증 신청",
};

export const BASIS_TYPE_LABELS: Record<string, string> = {
  REPRESENTATIVE_REQUEST: "대표의 지원 요청·승인",
  LEGAL_BASIS: "법적 근거 확인",
};

export const RAW_ACCESS_STATUS: OpsStatusMap = {
  PENDING: { label: "승인 대기", tone: "blue" },
  APPROVED: { label: "승인", tone: "green" },
  REJECTED: { label: "거절", tone: "red" },
  EXPIRED: { label: "승인 만료", tone: "gray" },
  INVALIDATED: { label: "승인 무효", tone: "amber" },
};

export const APPROVAL_VALID_HOURS = 24;
export const ACCESS_WINDOW_MINUTES = 60;

export type GrantState = "NONE" | "ACTIVE" | "REVOKED" | "DOWNLOADED" | "EXPIRED";

export function grantState(detail: RawAccessDetail, now: number): GrantState {
  const grant = detail.grant;
  if (!grant) return "NONE";
  if (grant.revokedAt) return "REVOKED";
  if (grant.downloadedAt) return "DOWNLOADED";
  if (Date.parse(grant.expiresAt) <= now) return "EXPIRED";
  return "ACTIVE";
}

/** 회수는 아직 만료되지 않았고 회수되지 않은 실행 기록에만 할 수 있다. */
export function isRevocable(detail: RawAccessDetail, now: number): boolean {
  const grant = detail.grant;
  return Boolean(grant) && !grant?.revokedAt && Date.parse(grant?.expiresAt ?? "") > now;
}

export function remainingMinutes(expiresAt: string, now: number): number {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 60_000));
}

export function executorId(
  detail: Pick<RawAccessDetail, "beneficiaryOperatorId" | "requestedByOperatorId">,
): number {
  return detail.beneficiaryOperatorId ?? detail.requestedByOperatorId;
}

export function isApprovalExpired(detail: RawAccessDetail, now: number): boolean {
  return (
    detail.status === "APPROVED" &&
    !detail.grant &&
    Boolean(detail.expiresAt) &&
    Date.parse(detail.expiresAt ?? "") <= now
  );
}

const RAW_ACCESS_MESSAGES: Record<string, string> = {
  RAW_ACCESS_EXPIRED: "접근 시간 60분이 지나 더 받을 수 없습니다.",
  RAW_ACCESS_REVOKED: "회수된 접근이라 받을 수 없습니다.",
  RAW_DOWNLOAD_ALREADY_USED: "이미 받은 파일입니다. 파일은 한 번만 받을 수 있습니다.",
  DOWNLOAD_NOT_APPROVED: "다운로드 승인을 받은 접근이 아니라 파일을 받을 수 없습니다.",
};

export function describeRawAccessError(error: unknown, fallback = "처리하지 못했습니다."): string {
  if (error instanceof ApiError && RAW_ACCESS_MESSAGES[error.code]) {
    return RAW_ACCESS_MESSAGES[error.code] ?? fallback;
  }
  return describeOpsError(error, fallback);
}
