import { ApiError } from "@/shared/api/client";
import {
  describeAuthError,
  fieldErrorMap,
  isApiCode,
  isApiStatus,
} from "@/shared/lib/api-messages";

export { fieldErrorMap, isApiCode, isApiStatus };

const MESSAGE_BY_CODE: Record<string, string> = {
  PROPERTY_ARCHIVED: "보관된 매물은 수정할 수 없습니다. 복원한 뒤 다시 시도해 주세요.",
  PROPERTY_NOT_ARCHIVED: "이미 활성 상태인 매물입니다. 화면을 새로 고쳐 확인해 주세요.",
  PROPERTY_HAS_ACTIVE_COORDINATION:
    "진행 중인 임장 조율이 있어 보관할 수 없습니다. 조율을 정리한 뒤 다시 시도해 주세요.",
  PROPERTY_HAS_ACTIVE_CONTRACT:
    "진행 중인 계약이 있어 보관할 수 없습니다. 계약을 정리한 뒤 다시 시도해 주세요.",
  OFFER_ALREADY_ACTIVE: "같은 거래유형의 진행 중인 제안이 이미 있습니다.",
  INVALID_TRANSITION: "지금은 바꿀 수 없는 상태입니다. 화면을 새로 고쳐 확인해 주세요.",
  CATEGORY_LIMIT_EXCEEDED: "카테고리는 사무소당 활성 20개까지 만들 수 있습니다.",
  FIELD_LIMIT_EXCEEDED: "입력 항목은 카테고리당 활성 50개까지 만들 수 있습니다.",
  FIELD_INACTIVE: "보관된 입력 항목에는 값을 저장할 수 없습니다.",
  CATEGORY_NAME_DUPLICATED: "같은 이름의 카테고리가 이미 있습니다.",
  FIELD_NAME_DUPLICATED: "같은 이름의 입력 항목이 이미 있습니다.",
  SYSTEM_CATEGORY_IMMUTABLE: "기본 카테고리는 수정하거나 비활성화할 수 없습니다.",
  INCOMPLETE_FOR_ACTIVATION: "활성 등록에는 주소와 담당 공인중개사가 필요합니다.",
  VERSION_CONFLICT: "다른 사용자가 먼저 수정했습니다. 최신 내용을 불러온 뒤 다시 시도해 주세요.",
  FORBIDDEN: "이 작업을 할 권한이 없습니다.",
  RESOURCE_NOT_FOUND: "대상을 찾을 수 없습니다.",
};

export function describePropertyError(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status !== 429 && error.status < 500) {
    const known = MESSAGE_BY_CODE[error.code];
    if (known) return known;
  }
  return describeAuthError(error, fallback);
}
