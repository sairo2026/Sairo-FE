import { ApiError } from "@/shared/api/client";
import { describeOpsError } from "../model/ops-errors";

const SYSTEM_MESSAGE_BY_CODE: Record<string, string> = {
  INTEGRATION_PREREQUISITE_INCOMPLETE:
    "계약·동의·고지 점검과 승인, 회사 정보 게시·수신 시험이 끝나지 않아 운영 환경 활성화와 변경을 할 수 없습니다.",
  DOCUMENT_VERSION_CONFLICT: "같은 연동에 같은 종류와 버전의 사본이 이미 등록되어 있습니다.",
  INVALID_REQUEST: "입력값을 확인해 주세요.",
};

export function describeSystemError(error: unknown, fallback = "처리하지 못했습니다."): string {
  if (error instanceof ApiError) {
    const mapped = SYSTEM_MESSAGE_BY_CODE[error.code];
    if (mapped) {
      const field = error.fieldErrors?.[0];
      return error.code === "INVALID_REQUEST" && field?.message
        ? `${mapped} ${field.message}`
        : mapped;
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
