import { ApiError, ApiNetworkError } from "@/shared/api/client";
import { formatWait } from "@/shared/lib/api-messages";

export const COPY = {
  pricingTitle: "사무소 단위 월 구독 요금",
  pricingVatNotice:
    "표시된 금액은 부가가치세를 포함한 월 이용료입니다. 실제 청구 금액은 청구일의 이용 인원과 요금표 기준으로 계산되며, 결제 전 화면에서 다시 확인하실 수 있습니다.",
  pricingRefundSummary:
    "구독은 매월 결제일에 한 달 이용 요금이 결제됩니다. 해지를 신청하면 다음 결제일부터 결제되지 않고, 그날 전까지는 계속 이용할 수 있습니다. 이미 결제된 기간의 환불 기준은 환불정책을 확인해 주세요.",
  pricingEntry: "가입하고 카드 등록하기",
  pricingEntryNote: "카드를 등록해도 무료 기간 중에는 결제되지 않습니다.",
  pricingLoadError:
    "현재 적용 중인 요금표를 불러오지 못했습니다. 결제는 진행되지 않았습니다. 잠시 후 다시 시도해 주세요.",
  pricingReviewBadge: "확정 요금, 결제 심사 후 청구 시작",
  enterpriseNote: "기업 구간은 별도 견적이며 견적을 수락하기 전에는 자동으로 결제되지 않습니다.",
  regTop:
    "결제수단을 등록해도 지금 결제되지 않습니다. 결제가 시작되기 전에 금액과 결제일을 안내하고 동의를 받습니다.",
  regTopWithDate: (date: string) =>
    `결제수단을 등록해도 지금 결제되지 않습니다. 첫 결제 예정일은 ${date}이며, 결제 전에 금액과 조건을 다시 안내하고 동의를 받습니다.`,
  regCanceled: "카드 등록이 완료되지 않았습니다. 다시 시도하려면 '카드 등록'을 눌러 주세요.",
  regPreparing:
    "카드 등록 기능을 준비하고 있습니다. 무료 기간 중에는 카드 등록 없이 사용할 수 있고, 등록이 가능해지면 알려 드립니다.",
  trialLine: (date: string) =>
    `무료 이용 중 · 무료 종료 예정 ${date} 23:59 · 무료 기간 중에는 결제되지 않습니다.`,
  consentTop:
    "카드 등록과 별도로 구독 조건 확인이 필요합니다. 요금, 결제 주기, 첫 결제 예정일, 해지·환불 기준을 확인해 주세요.",
  consentLimitNote:
    "이용 인원이 늘어 결제 금액이 동의하신 금액보다 커지면 자동으로 결제하지 않고 다시 동의를 요청합니다.",
  consentChecksMissing: "두 필수 항목에 모두 동의해야 구독 조건 확인을 마칠 수 있습니다.",
  consentNoCharge: "동의만으로는 결제되지 않습니다.",
  cancelConfirm: (date: string) =>
    `해지를 예약하면 ${date}에 구독이 끝나고 그 뒤로는 결제되지 않습니다. 그 전까지는 지금처럼 이용하실 수 있고, 종료 후 30일 동안 자료 조회와 내보내기가 가능합니다. 종료 전까지 언제든 해지 예약을 취소할 수 있습니다.`,
  cancelDone: (date: string) =>
    `해지가 예약됐습니다. 종료 예정 ${date}. 다음 결제는 진행되지 않습니다.`,
  cancelWithdrawConfirm: (date: string | null, amount: string | null) =>
    `해지 예약을 취소하면 구독이 계속되고${date ? ` ${date}에` : ""}${amount ? ` 월 이용료 ${amount}(부가가치세 포함)이` : ""} 결제됩니다. 해지 예약을 취소할까요?`,
  cancelWithdrawDone: "해지 예약이 취소됐습니다.",
  cancelledNote: (date: string) =>
    `해지가 예약되어 ${date}에 구독이 끝납니다. 다음 결제는 진행되지 않습니다.`,
  refundTop:
    "환불받을 청구서와 사유를 선택해 주세요. 접수 후 3영업일 안에 검토 결과를 알려드립니다. 승인된 환불은 결제하신 카드로 취소 처리되며, 카드사 반영까지 영업일 기준 며칠이 더 걸릴 수 있습니다.",
  refundFree: "무료 이용 기간은 금액으로 환불되지 않습니다.",
  refundReceived:
    "환불 신청이 접수되었습니다. 접수일로부터 3영업일 안에 검토 결과를 알려 드립니다.",
  refundExisting: "이미 접수된 환불 신청이 있어 기존 신청 상태를 보여드립니다.",
  refundVerifying:
    "환불 처리 결과를 결제사에 확인하고 있습니다. 같은 요청을 다시 하지 않으셔도 됩니다.",
  refundCompleted: "환불이 완료됐습니다. 카드 명세서에는 승인 취소로 표시될 수 있습니다.",
  refundRejected: (reason: string) =>
    `환불 요청이 승인되지 않았습니다. 사유: ${reason}. 이 결정에 이의가 있으시면 고객지원으로 문의해 주세요.`,
  ownerOnly: "결제는 사무소 대표만 할 수 있습니다. 대표에게 결제수단 확인을 요청해 주세요.",
  payProcessing: "결제 처리 중입니다. 창을 닫거나 다시 누르지 마세요.",
  stepUpDone: "본인 확인이 다시 필요합니다. 확인 후 이어서 진행해 주세요.",
  stepUpAlt: "이 작업에는 본인 확인이 다시 필요합니다. 확인 후 이어서 진행해 주세요.",
} as const;

export const ERROR_BY_CODE: Record<string, string> = {
  BILLING_KEY_ISSUE_FAILED:
    "카드사에서 결제수단 등록을 승인하지 않았습니다. 결제된 금액은 없습니다. 다른 카드로 다시 시도하거나 카드사에 문의해 주세요.",
  PAYMENT_FAILED:
    "카드사에서 결제를 승인하지 않았습니다. 결제된 금액은 없습니다. 카드 한도·유효기간을 확인하거나 다른 카드를 등록해 주세요.",
  PAYMENT_METHOD_REQUIRED: "결제하려면 결제수단 등록과 결제 조건 동의가 먼저 필요합니다.",
  INVALID_TRANSITION:
    "현재 구독 상태에서는 이 작업을 진행할 수 없습니다. 구독 현황을 확인해 주세요.",
  PAYMENT_VERIFYING:
    "직전 결제 결과를 확인하고 있습니다. 중복 결제를 막기 위해 지금은 다시 결제할 수 없습니다. 확인이 끝나면 알려드립니다.",
  CANCELLATION_ALREADY_EFFECTIVE:
    "구독이 이미 종료돼 해지 예약을 취소할 수 없습니다. 다시 이용하시려면 새로 구독해 주세요.",
  CONSENT_TERMS_MISMATCH:
    "인원이 늘어 결제 금액이 동의한 금액보다 커졌습니다. 새 금액으로 다시 동의해 주세요.",
  TERMS_VERSION_CHANGED:
    "결제 조건 안내가 새로 바뀌었습니다. 새 조건을 확인하고 다시 동의해 주세요.",
  PRICE_CHANGE_NOTICE_CLOSED: "응답 기한이 지났거나 이미 처리된 가격 변경 안내입니다.",
  TAX_RECIPIENT_INVALID: "세금계산서 수신 정보 형식을 확인해 주세요.",
  PRICE_SCHEDULE_NOT_PUBLISHED: "현재 적용 중인 요금표가 없습니다. 결제는 진행되지 않았습니다.",
  RETURN_GRANT_INVALID: "반환 권한이 만료되었습니다. 고객지원으로 문의해 주세요.",
  ARCHIVE_GRANT_INVALID: "보관권한이 만료됐거나 종료됐습니다. 고객지원으로 문의해 주세요.",
  STEP_UP_ACCOUNT_MISMATCH:
    "인증한 카카오 계정이 권한자와 다릅니다. 처음 인증한 계정으로 다시 확인해 주세요.",
  INVALID_CREDENTIALS: "이메일 또는 비밀번호가 맞지 않습니다.",
  EXPORT_EXPIRED: "내보내기 파일이 만료됐습니다. 다시 내보내기를 요청해 주세요.",
  RESOURCE_NOT_FOUND: "대상을 찾을 수 없습니다. 목록에서 다시 선택해 주세요.",
  STEP_UP_REQUIRED: "본인 확인이 필요합니다. 확인 후 이어서 진행해 주세요.",
};

export function describeBillingError(error: unknown, fallback: string): string {
  if (error instanceof ApiNetworkError) {
    return error.kind === "offline"
      ? "인터넷 연결을 확인해 주세요."
      : "서버에 연결하지 못했습니다.";
  }
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return error.retryAfterSeconds
        ? `요청이 너무 많습니다. ${formatWait(error.retryAfterSeconds)} 뒤에 다시 시도해 주세요.`
        : "요청이 너무 많습니다. 잠시 뒤에 다시 시도해 주세요.";
    }
    const mapped = ERROR_BY_CODE[error.code];
    if (mapped && error.status < 500) return mapped;
    if (error.status === 403) return "이 작업을 할 권한이 없습니다.";
    if (error.status >= 500) return "일시적인 오류가 발생했습니다. 잠시 뒤에 다시 시도해 주세요.";
    return ERROR_BY_CODE[error.code] ?? fallback;
  }
  return fallback;
}
