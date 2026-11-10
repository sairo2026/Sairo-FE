import { ApiError } from "@/shared/api/client";
import {
  describeAuthError,
  fieldErrorMap,
  isApiCode,
  isApiStatus,
} from "@/shared/lib/api-messages";

export { fieldErrorMap, isApiCode, isApiStatus };

const MESSAGE_BY_CODE: Record<string, string> = {
  CANDIDATE_LIMIT_EXCEEDED:
    "후보 매물은 자기 사무소 매물과 허용받은 매물을 합쳐 20개까지 고를 수 있습니다.",
  CANDIDATE_NOT_ALLOWED:
    "신청 권한이 없는 매물이 포함되어 있습니다. 허용이 없거나 회수된 매물은 후보로 고를 수 없습니다.",
  PERIOD_TOO_LONG: "방문 가능 기간은 오늘부터 30일 안에서 정해 주세요.",
  CUSTOMER_ARCHIVED: "보관된 고객은 선택할 수 없습니다. 고객을 복원한 뒤 다시 시도해 주세요.",
  DEPUTY_VISIT_LOCKED:
    "중개보조원 인원 한도를 넘어 방문 업무가 잠겼습니다. 한도를 시정한 뒤 다시 시도해 주세요.",
  INVALID_TRANSITION:
    "지금 상태에서는 처리할 수 없습니다. 화면을 새로 고쳐 현재 상태를 확인해 주세요.",
  SCHEDULE_CONFLICT:
    "담당자나 고객, 매물의 방문 일정이 겹칩니다. 시간이나 담당자를 바꾼 뒤 다시 시도해 주세요.",
  TIME_OUT_OF_RANGE:
    "출입승인이 없거나 허용된 시간 범위를 벗어난 구성입니다. 승인과 시간을 확인해 주세요.",
  PRIMARY_APPROVER_EXISTS:
    "같은 기간에 유효한 대표 승인자 출입승인이 이미 있습니다. 공동 승인자로 등록하거나 기간을 바꿔 주세요.",
  IMPACT_NOT_ACKNOWLEDGED:
    "이미 확정된 방문에 영향이 있습니다. 영향을 확인한 뒤 다시 저장해 주세요.",
  APPROVER_READ_ONLY:
    "공동 승인자는 조건을 입력하거나 신청을 선택할 수 없고 읽기만 할 수 있습니다.",
  NOTICE_VERSION_CHANGED:
    "개인정보 안내가 바뀌었습니다. 화면을 새로 고쳐 안내를 확인한 뒤 다시 시도해 주세요.",
  VISIT_REQUEST_INVALID_STATE:
    "이미 처리되었거나 희망 시작 시각이 지난 신청입니다. 목록을 새로 불러와 다른 신청을 선택해 주세요.",
  APPLY_GRANT_INACTIVE:
    "이 매물의 신청 허용이 회수되었거나 만료되어 신청할 수 없습니다. 허용한 사무소에 문의해 주세요.",
  APPLY_GRANT_DUPLICATE_ACTIVE: "같은 대상에게 적용 중인 허용이 이미 있습니다.",
  APPLY_GRANT_TARGET_INVALID:
    "허용할 수 없는 대상입니다. 자기 사무소이거나 인증이 끝나지 않은 사무소, 승인된 대표·소속공인중개사가 아닌 중개사는 고를 수 없습니다.",
  VISIT_REQUEST_DUPLICATE_ACTIVE:
    "이 후보 매물에는 신청 대기 중인 신청이 이미 있습니다. 철회한 뒤 다시 신청해 주세요.",
  APPROVER_CONDITION_EXPIRED:
    "승인자 조건의 적용 기간이 끝났습니다. 승인자가 조건을 다시 등록한 뒤 신청해 주세요.",
  APPROVER_CONDITION_MISSING:
    "승인자 조건이 아직 등록되지 않았습니다. 승인자가 조건을 등록한 뒤 신청해 주세요.",
  PUBLIC_LINK_EXPIRED: "링크가 만료되었습니다. 방문을 조율하는 사무소에 새 링크를 요청해 주세요.",
  PUBLIC_LINK_NOT_FOUND: "링크가 잘못되었거나 만료되었습니다. 받은 링크를 다시 확인해 주세요.",
  VERSION_CONFLICT: "다른 사용자가 먼저 수정했습니다. 최신 내용을 불러온 뒤 다시 시도해 주세요.",
  FORBIDDEN: "이 작업을 할 권한이 없습니다.",
  RESOURCE_NOT_FOUND: "대상을 찾을 수 없습니다.",
};

export function describeVisitError(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status !== 429 && error.status < 500) {
    const known = MESSAGE_BY_CODE[error.code];
    if (known) return known;
  }
  return describeAuthError(error, fallback);
}

export function describeRequestQuota(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || error.code !== "VISIT_REQUEST_QUOTA_EXCEEDED") {
    return undefined;
  }
  if (error.details.quotaScope === "APPROVAL") {
    return "이 매물의 신청 대기 한도에 도달했습니다. 신청을 철회하거나 다른 신청이 종결되기를 기다려 주세요.";
  }
  const current = error.details.current;
  const suffix = typeof current === "number" ? ` (현재 ${current}건)` : "";
  return `동시에 진행할 수 있는 신청 한도에 도달했습니다${suffix}. 진행 중인 신청을 철회하거나 종결되기를 기다려 주세요.`;
}

export function violatedRuleCodes(error: unknown): string[] {
  if (!(error instanceof ApiError) || error.code !== "APPROVER_CONDITION_VIOLATED") return [];
  return error.details.violatedRules ?? [];
}
