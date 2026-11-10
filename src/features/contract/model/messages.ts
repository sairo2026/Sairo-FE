import { ApiError } from "@/shared/api/client";
import { describeAuthError } from "@/shared/lib/api-messages";

const MESSAGE_BY_CODE: Record<string, string> = {
  INCOMPLETE_FOR_SIGNING:
    "체결에 필요한 값이 빠져 있습니다. 표시된 항목을 채운 뒤 다시 시도해 주세요.",
  PROPERTY_HAS_ACTIVE_CONTRACT:
    "같은 매물에 기간이 겹치는 체결 계약이 이미 있습니다. 임대 기간이나 거래유형을 확인해 주세요.",
  CONTRACT_ACTION_NOT_ALLOWED: "지금 계약 상태에서는 할 수 없는 작업입니다.",
  CONTRACT_REVISION_CONFLICT:
    "다른 사용자가 먼저 계약 핵심정보를 정정했습니다. 화면을 새로 고쳐 최신 값을 확인한 뒤 다시 정정해 주세요.",
  INVALID_CONTRACT_PARTY: "계약의 현재 당사자가 아니거나 중복으로 보낸 당사자가 있습니다.",
  SALE_CANNOT_TERMINATE: "매매 계약은 해제로 바꿀 수 없습니다. 취소나 무효로 정정해 주세요.",
  INVALID_TRANSITION:
    "지금 상태에서는 처리할 수 없습니다. 화면을 새로 고쳐 현재 상태를 확인해 주세요.",
  PROPERTY_ARCHIVED:
    "보관된 매물에는 계약을 등록할 수 없습니다. 매물을 복원한 뒤 다시 시도해 주세요.",
  DOCUMENT_VERSION_CONFLICT:
    "같은 서류 종류와 버전이 이미 있습니다. 화면을 새로 고쳐 최신 서류 목록을 확인해 주세요.",
  FEE_AMOUNT_MISMATCH: "합계가 공급가액과 세액의 합과 다릅니다.",
  SENSITIVE_DATA_DETECTED:
    "주민등록번호나 전체 계좌번호는 입력할 수 없습니다. 해당 내용을 지워 주세요.",
  VERSION_CONFLICT: "다른 사용자가 먼저 수정했습니다. 최신 내용을 불러온 뒤 다시 시도해 주세요.",
  FORBIDDEN: "이 작업을 할 권한이 없습니다.",
  RESOURCE_NOT_FOUND: "대상을 찾을 수 없습니다.",
};

export function describeContractError(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status !== 429 && error.status < 500) {
    const known = MESSAGE_BY_CODE[error.code];
    if (known) return known;
  }
  return describeAuthError(error, fallback);
}
