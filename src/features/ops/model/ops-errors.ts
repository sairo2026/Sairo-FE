import { ApiError, ApiNetworkError } from "@/shared/api/client";
import { formatWait } from "@/shared/lib/api-messages";

const OPS_MESSAGE_BY_CODE: Record<string, string> = {
  SELF_APPROVAL_FORBIDDEN: "본인이 요청하거나 수혜하는 건은 직접 승인할 수 없습니다.",
  REVIEW_CHECKLIST_INCOMPLETE: "필수 확인 항목을 모두 확인한 뒤 승인할 수 있습니다.",
  APPROVAL_INVALIDATED: "승인이 만료되었거나 승인자의 권한이 회수되어 실행할 수 없습니다.",
  INVALID_TRANSITION:
    "지금 상태에서는 할 수 없는 처리입니다. 화면을 새로 고쳐 상태를 확인해 주세요.",
  VERSION_CONFLICT: "다른 운영자가 먼저 수정했습니다. 최신 내용을 불러온 뒤 다시 시도해 주세요.",
  LAST_SECURITY_ADMIN: "마지막 활성 보안관리자의 역할은 회수할 수 없습니다.",
  MFA_CODE_INVALID: "확인 코드가 맞지 않습니다.",
  MFA_LOCKED: "확인 코드를 연속으로 틀려 잠겼습니다.",
  VERIFICATION_INCOMPLETE: "저장소별 검증 결과가 모두 입력되어야 완료로 처리할 수 있습니다.",
  TRIAL_EVENT_WINDOW_OVERLAP: "같은 대상의 활성·예약 이벤트와 가입 창이 겹쳐 저장할 수 없습니다.",
  START_CUSTOMER_AGREEMENT_EXISTS: "이미 같은 사무소의 시작 고객 합의가 있습니다.",
  START_CUSTOMER_WINDOW_CLOSED: "시작 고객 이벤트의 가입 창이 닫혀 승인할 수 없습니다.",
  START_CUSTOMER_QUOTA_EXCEEDED: "시작 고객 이벤트의 승인 상한을 넘어 승인할 수 없습니다.",
  GUEST_INTAKE_ALREADY_CONVERTED: "이미 권리 요청으로 전환된 접수입니다.",
  TAX_DOCUMENT_ALREADY_ISSUED: "이미 발급 기록이 있는 청구서입니다.",
  TAX_INVOICE_NOT_ELIGIBLE: "증빙을 발급할 수 없는 청구서입니다.",
  PRICE_NOTICE_PERIOD_TOO_SHORT: "효력 시각이 안내 시각 30일 뒤보다 앞서 안내를 만들 수 없습니다.",
  ATTACHMENT_NOT_READY: "검사가 끝나면 내려받을 수 있습니다. 잠시 뒤에 다시 시도해 주세요.",
  ATTACHMENT_REJECTED: "보안 검사에서 차단된 파일입니다. 다른 파일을 올려 주세요.",
  RESOURCE_NOT_FOUND: "대상을 찾을 수 없습니다.",
  FORBIDDEN: "이 처리를 할 수 있는 운영 역할이 아닙니다.",
};

/** 운영 콘솔 처리 실패를 운영자에게 보일 문구로 바꾼다. 서버가 준 메시지보다 코드별 문구를 우선한다. */
export function describeOpsError(error: unknown, fallback = "처리하지 못했습니다."): string {
  if (error instanceof ApiNetworkError) {
    return error.kind === "offline"
      ? "인터넷 연결을 확인해 주세요."
      : "서버에 연결하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.";
  }
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return error.retryAfterSeconds
        ? `요청이 너무 많습니다. ${formatWait(error.retryAfterSeconds)} 뒤에 다시 시도해 주세요.`
        : "요청이 너무 많습니다. 잠시 뒤에 다시 시도해 주세요.";
    }
    if (error.status >= 500) return "일시적인 오류가 발생했습니다. 잠시 뒤에 다시 시도해 주세요.";
    return OPS_MESSAGE_BY_CODE[error.code] ?? (error.message || fallback);
  }
  return fallback;
}
