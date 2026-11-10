import { ApiError } from "@/shared/api/client";
import { describeAuthError } from "@/shared/lib/api-messages";

const MESSAGE_BY_CODE: Record<string, string> = {
  AUTO_TASK_IMMUTABLE:
    "자동으로 만들어진 업무는 제목·담당자·예정일을 고치거나 삭제할 수 없습니다. 완료 처리와 메모만 가능합니다.",
  VERSION_CONFLICT: "다른 사용자가 먼저 수정했습니다. 최신 내용을 불러온 뒤 다시 시도해 주세요.",
  FORBIDDEN: "이 작업을 할 권한이 없습니다.",
  RESOURCE_NOT_FOUND: "대상을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.",
  SENSITIVE_DATA_DETECTED:
    "주민등록번호나 전체 계좌번호는 입력할 수 없습니다. 해당 내용을 지워 주세요.",
};

export function describeWorkError(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status !== 429 && error.status < 500) {
    const known = MESSAGE_BY_CODE[error.code];
    if (known) return known;
  }
  return describeAuthError(error, fallback);
}
