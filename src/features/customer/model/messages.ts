import { ApiError } from "@/shared/api/client";
import {
  describeAuthError,
  fieldErrorMap,
  isApiCode,
  isApiStatus,
} from "@/shared/lib/api-messages";

export { fieldErrorMap, isApiCode, isApiStatus };

const MESSAGE_BY_CODE: Record<string, string> = {
  SENSITIVE_DATA_DETECTED:
    "주민등록번호나 전체 금융계좌번호는 입력할 수 없습니다. 해당 내용을 지워 주세요.",
  INVALID_RANGE: "하한이 상한보다 클 수 없고 종료일은 시작일보다 앞설 수 없습니다.",
  FIRST_INQUIRY_ALREADY_EXISTS:
    "이 고객에게는 이미 최초문의가 있습니다. 후속상담으로 등록해 주세요.",
  CUSTOMER_ARCHIVED: "보관된 고객은 수정할 수 없습니다. 복원한 뒤 다시 시도해 주세요.",
  CUSTOMER_NOT_ARCHIVED: "이미 사용 중인 고객입니다. 화면을 새로 고쳐 확인해 주세요.",
  INVALID_TRANSITION:
    "이미 병합되었거나 지금은 처리할 수 없는 상태입니다. 화면을 새로 고쳐 확인해 주세요.",
  SCHEDULE_CONFLICT:
    "두 고객의 아직 끝나지 않은 확정 방문 일정이 겹칩니다. 일정을 취소하거나 재조율한 뒤 다시 병합해 주세요.",
  VERSION_CONFLICT: "다른 사용자가 먼저 수정했습니다. 최신 내용을 불러온 뒤 다시 시도해 주세요.",
  FORBIDDEN: "이 작업을 할 권한이 없습니다.",
  RESOURCE_NOT_FOUND: "대상을 찾을 수 없습니다.",
};

export function describeCustomerError(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status !== 429 && error.status < 500) {
    const known = MESSAGE_BY_CODE[error.code];
    if (known) return known;
  }
  return describeAuthError(error, fallback);
}
