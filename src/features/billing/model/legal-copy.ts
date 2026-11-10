import { formatKrw, formatSeoulDate } from "@/shared/lib/format";

export const CARD_NOTICE_COPY = {
  body: "카드 정보는 결제대행사 결제창에서 직접 입력되며 사이로 서버에 저장되지 않습니다. 사이로는 카드사, 카드 끝 4자리, 결제대행사가 발급한 연결 키만 보관합니다. 지금 등록해도 결제는 시작되지 않습니다. 유료 전환 전에 금액과 결제일을 다시 안내하고 동의를 받은 뒤에만 결제합니다. 등록은 사무소 대표가 사무소를 대표해 하는 것이며 카드는 언제든 해제할 수 있습니다.",
  checkLabel: "위 안내를 확인했습니다.",
  uncheckedError: "카드 등록 안내를 확인해야 카드를 등록할 수 있습니다.",
  changedError: "카드 등록 안내가 바뀌었습니다. 내용을 확인한 뒤 다시 진행해 주세요.",
  done: (issuer: string | null, last4: string | null, firstBillingDate: string | null) =>
    `결제수단이 등록됐습니다.${
      issuer || last4 ? ` 등록 카드 ${issuer ?? "카드"} 끝자리 ${last4 ?? "----"}.` : ""
    } 이번 등록으로 결제된 금액은 없습니다.${
      firstBillingDate ? ` 첫 결제 예정일은 ${firstBillingDate}입니다.` : ""
    }`,
} as const;

export const CONSENT_COPY = {
  autoCharge: (amount: string) =>
    `위 내용으로 월 선불 자동결제에 동의합니다. 결제 금액은 ${amount}(부가가치세 포함)이며 인원이 늘어 금액이 커지면 다시 동의받기 전에는 결제되지 않습니다.`,
  cancelRefund:
    "해지와 환불 조건을 확인했습니다. 해지를 예약하면 이미 결제한 이용 기간이 끝날 때까지 이용할 수 있고 그 기간의 환불은 없습니다. 바로 종료, 인증 중단, 서비스 장애의 경우에는 남은 기간을 일할 계산하여 환불합니다.",
  refundLink: "환불정책 보기",
  termsLink: "구독·결제 약관 보기",
  saved: (firstBillingDate: string | null) =>
    `동의를 저장해도 결제되지 않습니다.${
      firstBillingDate ? ` 첫 결제는 ${firstBillingDate}에 이루어집니다.` : ""
    }`,
  errors: {
    termsChanged: "결제 조건 안내가 새로 바뀌었습니다. 새 조건을 확인하고 다시 동의해 주세요.",
    amountIncreased:
      "인원이 늘어 결제 금액이 동의한 금액보다 커졌습니다. 새 금액으로 다시 동의해 주세요.",
    noticeClosed: "가격 변경 안내가 이미 닫혔습니다. 구독 화면에서 현재 안내를 확인해 주세요.",
  },
} as const;

export type ConsentSummaryInput = {
  officeName: string | null;
  memberCount: number;
  monthlyAmount: number;
  firstBillingAt: string | null;
  nextChargeAt: string;
  cardIssuer: string | null;
  cardLast4: string | null;
};

export function billingDayLabel(value: string): string {
  const day = Number(formatSeoulDate(value).slice(8, 10));
  return Number.isFinite(day) && day > 0 ? `${day}일` : "-";
}

export function consentSummaryLine(input: ConsentSummaryInput): string {
  const parts = [
    ...(input.officeName ? [input.officeName] : []),
    "사이로 월 구독",
    `이용 인원 ${input.memberCount}명`,
    `월 ${formatKrw(input.monthlyAmount)}(부가가치세 포함)`,
    ...(input.firstBillingAt ? [`첫 결제 ${formatSeoulDate(input.firstBillingAt)}`] : []),
    `이후 매월 ${billingDayLabel(input.firstBillingAt ?? input.nextChargeAt)} 자동 결제`,
    input.cardIssuer || input.cardLast4
      ? `결제수단 ${input.cardIssuer ?? "카드"}(끝자리 ${input.cardLast4 ?? "----"})`
      : "결제수단 등록 전",
  ];
  return parts.join(" · ");
}

export const PRICING_COPY = {
  tierGuideTitle: "요금 구간 안내",
  tierGuide: [
    "1인 구간: 활성 구성원 1명",
    "다인 구간: 활성 구성원 2명 이상이며 인원에 따라 단계별로 금액이 더해집니다",
    "기업 구간: 별도 견적이며 견적을 수락하기 전에는 자동으로 결제되지 않습니다",
    "모든 구간의 기능은 같습니다. 구간은 과금 인원만 다릅니다.",
  ],
  planFooter: (baseAmount: string) =>
    `월 ${baseAmount}(부가가치세 포함) · 매월 자동결제 · 사무소 1곳 기준`,
  provisional:
    "확정 요금이며 결제 심사 후 청구를 시작합니다. 청구가 시작되기 전에는 결제되지 않습니다.",
  noTrial: "현재 가입 조건을 준비하고 있습니다. 이용 조건은 고객지원으로 문의해 주세요.",
  paymentTitle: "결제 안내",
  payment:
    "구독은 월 선불 자동결제입니다. 카드 정보는 결제대행사 결제창에서 직접 입력되며 사이로 서버에 저장되지 않습니다. 결제는 사무소 대표가 합니다.",
  links: [
    { label: "이용약관", href: "/legal/terms" },
    { label: "구독·결제 약관", href: "/legal/subscription-terms" },
    { label: "환불정책", href: "/legal/refund-policy" },
    { label: "개인정보처리방침", href: "/legal/privacy" },
  ],
} as const;

export type TrialNoticeInput = {
  freeEndMode: string;
  durationDays?: number | null;
  fixedFreeEndsAt?: string | null;
  applicantWindowEndsAt?: string | null;
};

function dayAfter(value: string): string {
  const next = new Date(new Date(value).getTime() + 24 * 60 * 60 * 1000);
  return formatSeoulDate(next);
}

export function trialNoticeText(trial: TrialNoticeInput | null | undefined): string | null {
  if (!trial) return null;
  if (trial.freeEndMode === "FIXED_END" && trial.fixedFreeEndsAt) {
    const freeEnd = formatSeoulDate(trial.fixedFreeEndsAt);
    const window = trial.applicantWindowEndsAt
      ? `${formatSeoulDate(trial.applicantWindowEndsAt)}까지 가입한 사무소는 `
      : "";
    return `${window}${freeEnd}까지 무료로 사용합니다. 유료 전환 전에 안내를 드리고 결제는 ${dayAfter(
      trial.fixedFreeEndsAt,
    )}부터 시작됩니다. 결제 전에 금액과 결제일을 다시 안내하고 동의를 받습니다.`;
  }
  if (trial.freeEndMode === "DURATION" && trial.durationDays) {
    return `사무소 인증을 마친 날부터 ${trial.durationDays}일 동안 무료로 사용합니다. 유료 전환 전에 안내를 드리고 결제 전에 금액과 결제일을 다시 안내하고 동의를 받습니다.`;
  }
  return null;
}

export const COMMERCE_NOTICE_COPY = {
  items: [
    {
      title: "청약철회와 환불",
      body: "사이로는 사무소가 업무에 사용하는 소프트웨어를 월 구독으로 제공합니다. 구독의 해지와 환불은 환불정책에 따릅니다. 관련 법령이 사무소에 더 유리한 청약철회 또는 환불 기준을 정한 경우에는 그 기준을 따릅니다.",
    },
    {
      title: "재화 제공 방식",
      body: "사이로는 온라인으로 제공되는 소프트웨어 서비스이며 별도 배송이 없습니다. 결제가 완료되면 이용 기간 시작과 함께 서비스를 이용할 수 있습니다.",
    },
    { title: "결제 방법", body: "신용카드와 체크카드 자동결제만 지원합니다." },
    {
      title: "거래 조건 확인",
      body: "이용약관, 구독·결제 약관, 환불정책은 가입 화면과 구독 구매 동의 화면에서 확인할 수 있습니다. 표시된 금액은 부가가치세를 포함한 월 금액입니다.",
    },
  ],
  complaintTitle: "불만과 분쟁 처리",
  complaint: (supportEmail: string | null) =>
    `서비스 안 고객지원 메뉴${supportEmail ? ` 또는 ${supportEmail}` : ""}로 접수해 주세요. 접수한 문의는 영업일 기준으로 순서대로 답변합니다.`,
} as const;

export const TAX_COPY = {
  intro:
    "세금계산서를 받으시려면 사업자등록번호와 수신 이메일을 입력해 주세요. 청구가 시작되기 전에는 세금계산서가 발급되지 않습니다.",
  businessNumberError: "사업자등록번호 형식이 올바르지 않습니다. 숫자 10자리를 입력해 주세요.",
  emailError: "이메일 주소 형식이 올바르지 않습니다.",
  saved: "세금계산서 수신 정보를 저장했습니다.",
  states: {
    pending: "세금계산서 발급을 준비하고 있습니다.",
    issued: (issuedAt: string, maskedEmail: string) =>
      `${issuedAt}에 세금계산서가 발급되었습니다. 수신 이메일 ${maskedEmail}을 확인해 주세요.`,
    unavailable:
      "이 청구 건은 세금계산서 발급 대상이 아니거나 아직 발급되지 않았습니다. 자세한 내용은 고객문의로 남겨 주세요.",
  },
  receipt:
    "카드 결제 내역은 카드사 명세서와 결제 영수증에서 확인할 수 있습니다. 세금계산서가 필요하면 세금계산서 정보를 입력해 주세요.",
  paymentMethod: "현재 결제 수단은 카드만 지원합니다. 현금영수증 발급 대상 결제 수단이 없습니다.",
  invoiceLine: (total: string, vat: string, supply: string) =>
    `청구 금액 ${total}(부가세 ${vat} 포함). 공급가액 ${supply}.`,
} as const;

export const REFUND_GUIDE_COPY = {
  title: "환불 기준",
  rows: [
    ["중복 결제, 잘못 결제된 금액", "해당 금액 전액"],
    [
      "바로 종료를 선택한 경우, 회원 탈퇴나 사무소 즉시 종료로 이용이 끝난 경우",
      "이미 결제한 이용 기간 중 남은 기간만큼 일할 계산한 금액",
    ],
    [
      "사무소 인증이 회수되거나 중단된 경우",
      "이미 결제한 이용 기간 중 남은 기간만큼 일할 계산한 금액",
    ],
    [
      "사이로의 서비스 장애로 이용하지 못한 경우",
      "장애가 영향을 준 기간과 이미 지급한 보상을 반영해 산정한 금액. 산정 근거를 함께 안내합니다",
    ],
    ["결제 승인 지연이나 시스템 오류로 종료 뒤에 승인된 금액", "전액"],
  ],
  noRefund: [
    "무료 이용 기간은 청구서가 없으므로 금액으로 환불하지 않습니다.",
    "해지를 예약한 경우 이미 결제한 이용 기간은 끝까지 이용할 수 있으며 그 기간의 요금은 환불하지 않습니다.",
    "구독 중 인원이 줄거나 구성원이 바뀌거나 요금 구간이 바뀐 경우에는 일할 환불을 하지 않으며 다음 청구부터 반영합니다.",
    "가격 인상에 동의하지 않아 종료된 경우에는 이미 결제한 이용 기간을 모두 이용한 상태이므로 환불하지 않습니다.",
  ],
} as const;

export const SUSPENSION_COPY = {
  title: "사무소 인증이 중단되었습니다",
  body: "인증이 중단되어 업무 기능을 이용할 수 없습니다. 자동 청구는 정지되었고 이미 결제한 이용 기간의 남은 부분은 환불정책에 따라 환불됩니다. 소명 자료를 고객지원으로 제출하고 재인증을 마치면 이용을 재개할 수 있습니다. 중단 후 30일 안에 재인증과 구매 재개를 마치지 않으면 구독이 종료됩니다.",
} as const;

export const RETURN_COPY = {
  title: "자료 반환",
  body: "구독이 종료되거나 사무소가 즉시 종료된 때부터 30일 동안 일반 업무 자료를 조회하고 내려받을 수 있습니다. 이 기간이 지나면 일반 업무 데이터는 복원되지 않고 파기됩니다. 계약서처럼 법령에 따라 보존해야 하는 서류는 별도 보관 계약을 맺은 경우에만 읽기 전용으로 보관됩니다. 보관 계약을 맺지 않으면 대표가 반환받아 직접 보존해야 하며 사이로가 수탁해 둔 사본은 반환 기간이 끝난 뒤 파기됩니다.",
  reauthTitle: "반환 권한 재인증 안내",
  reauth:
    "회원 탈퇴나 사무소 즉시 종료로 소속이 없어졌더라도 종료 직전의 대표는 이메일 비밀번호 또는 카카오 계정으로 본인을 다시 확인하면 반환 기간 안에 자료를 내려받을 수 있습니다. 이 확인은 일반 로그인 세션을 만들지 않습니다. 새로 가입해도 반환 권한은 자동으로 연결되지 않습니다.",
  archiveTitle: "보관 권한 안내",
  archive:
    "보관 계약을 맺은 권한자만 보관된 문서를 조회할 수 있습니다. 보관 계약을 거절하면 대표가 직접 반환받아 보존해야 합니다.",
  errors: {
    expired: "반환 권한이 만료되었습니다. 고객지원으로 문의해 주세요.",
    revoked: "반환 권한이 회수되었습니다.",
    accountMismatch:
      "인증한 카카오 계정이 권한자와 다릅니다. 처음 인증한 계정으로 다시 확인해 주세요.",
  },
} as const;
