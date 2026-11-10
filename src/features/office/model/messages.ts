import { describeAuthError } from "@/shared/lib/api-messages";
import { ApiError } from "@/shared/api/client";

const MESSAGE_BY_CODE: Record<string, string> = {
  PENDING_REGISTRATION_EXISTS:
    "이미 진행 중인 사무소 신청이나 참여 요청이 있습니다. 진행 중인 내용을 먼저 확인해 주세요.",
  OFFICE_ALREADY_EXISTS:
    "같은 등록관청과 개설등록번호로 등록된 사무소가 이미 있습니다. 기존 사무소에 참여를 신청해 주세요.",
  PENDING_MEMBERSHIP_EXISTS: "이미 소속되어 있거나 진행 중인 참여 요청·초대가 있습니다.",
  INVALID_TRANSITION:
    "이미 처리되었거나 지금은 처리할 수 없는 상태입니다. 화면을 새로 고쳐 확인해 주세요.",
  LAST_OWNER:
    "사무소의 유일한 대표에게는 이 작업을 할 수 없습니다. 대표 이전을 먼저 진행해 주세요.",
  DEPUTY_QUOTA_EXCEEDED:
    "중개보조원은 개업공인중개사와 소속공인중개사를 합한 수의 5배까지만 승인할 수 있습니다.",
  TRANSFER_IN_PROGRESS: "이미 진행 중인 대표 이전이 있습니다.",
  TRANSFER_PRECONDITION_FAILED: "대표 이전 조건을 더 이상 충족하지 않습니다.",
  VERSION_CONFLICT: "다른 사용자가 먼저 수정했습니다. 최신 내용을 불러온 뒤 다시 시도해 주세요.",
  STEP_UP_REQUIRED: "본인 확인이 필요합니다. 다시 시도해 주세요.",
  FORBIDDEN: "이 작업을 할 권한이 없습니다.",
  RESOURCE_NOT_FOUND: "대상을 찾을 수 없습니다.",
  DEPUTY_VISIT_LOCKED: "중개보조원 한도를 넘어 방문 업무가 잠겨 있습니다.",
};

export function describeOfficeError(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status !== 429 && error.status < 500) {
    const known = MESSAGE_BY_CODE[error.code];
    if (known) return known;
  }
  return describeAuthError(error, fallback);
}

export function fieldErrorMap(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.fieldErrors) return {};
  const result: Record<string, string> = {};
  for (const item of error.fieldErrors) {
    if (item.field && !(item.field in result)) result[item.field] = item.message;
  }
  return result;
}

export function isApiStatus(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status;
}

export function isApiCode(error: unknown, code: string): boolean {
  return error instanceof ApiError && error.code === code;
}

export function describeRemaining(expiresAt: string | null | undefined, now: Date): string | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - now.getTime();
  if (Number.isNaN(diff)) return null;
  if (diff <= 0) return "기한이 지났습니다";
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${days}일 ${hours % 24}시간 남음`;
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return hours >= 1 ? `${hours}시간 ${minutes}분 남음` : `${Math.max(minutes, 1)}분 남음`;
}
