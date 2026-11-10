export type LinkNoticeContext = {
  officeName: string | null;
  officeContactPhone: string | null;
  operatorName: string | null;
  privacyContact: string | null;
  retentionDays: number | null;
};

const FALLBACK_OFFICE = "방문을 조율하는 사무소";

function officeOf(context: LinkNoticeContext): string {
  return context.officeName ?? FALLBACK_OFFICE;
}

function managedBy(context: LinkNoticeContext): string {
  return context.operatorName
    ? `이 정보는 ${officeOf(context)}이 관리하며 ${context.operatorName}가 사무소의 위탁을 받아 보관합니다.`
    : `이 정보는 ${officeOf(context)}이 관리하며 사이로가 사무소의 위탁을 받아 보관합니다.`;
}

function inquiry(context: LinkNoticeContext): string[] {
  return context.officeContactPhone ? [`문의: ${context.officeContactPhone}`] : [];
}

export function approverNoticeLines(context: LinkNoticeContext): string[] {
  const days = context.retentionDays;
  return [
    `${officeOf(context)}이 방문 일정을 조율하기 위해 아래 조건을 받습니다.`,
    "받는 항목: 방문 가능한 시간과 방문 조건",
    "이용 목적: 방문 신청을 받을지 판단하고 방문 일정을 확정하는 일",
    days === null
      ? "보관: 출입승인 기간이 끝난 뒤 정해진 기간 동안 보관하고 삭제합니다."
      : `보관: 출입승인 기간이 끝난 뒤 ${days}일 동안 보관하고 삭제합니다.`,
    `관리 주체: ${managedBy(context)}`,
    "입력하지 않으면 방문 조율에 참여할 수 없습니다.",
    ...inquiry(context),
  ];
}

export function approverPreRegisteredNotice(context: LinkNoticeContext): string {
  const days = context.retentionDays === null ? "정해진 기간" : `${context.retentionDays}일`;
  return `${officeOf(context)}은 이 매물의 출입 승인을 위해 승인자 이름과 연락처를 미리 등록했을 수 있습니다. 등록한 정보는 사무소가 관리하며 방문 조율 외 목적으로 사용하지 않습니다. 같은 정보는 출입승인이 끝난 뒤 ${days}이 지나면 삭제하거나 개인을 알아볼 수 없게 처리합니다.`;
}

export const APPROVER_VISIBLE_INFO_NOTICE =
  "승인자는 자신의 매물만 볼 수 있습니다. 신청한 중개사의 소속과 이름, 희망 시간, 예상 소요 시간, 인원, 요청사항, 이력이 보이며 고객의 이름과 연락처는 보이지 않습니다.";

export function customerNoticeLines(context: LinkNoticeContext): string[] {
  const days = context.retentionDays;
  return [
    `${officeOf(context)}이 방문 일정을 조율하기 위해 아래 정보를 받습니다.`,
    "받는 항목: 방문 가능한 시간",
    "이용 목적: 방문 일정 조율과 확정 안내",
    days === null
      ? "보관: 조율이 끝난 뒤 정해진 기간이 지나면 삭제합니다."
      : `보관: 조율이 끝난 뒤 ${days}일이 지나면 삭제합니다.`,
    `관리 주체: ${managedBy(context)}`,
    "시간을 입력하지 않으면 방문 조율에 참여할 수 없습니다.",
    ...inquiry(context),
  ];
}

export const LINK_COMMON_COPY = {
  inputScope:
    "이 화면에서는 방문과 관련한 시간과 조건만 입력합니다. 이름이나 연락처는 입력하지 않습니다.",
  aboveSubmit: "제출하면 위 안내를 확인한 것으로 처리됩니다.",
  noticeChanged: "개인정보 안내가 바뀌었습니다. 내용을 확인한 뒤 다시 제출해 주세요.",
  sharing: "이 링크는 받으신 분만 사용해 주세요. 다른 사람에게 전달하지 마세요.",
  approvalWithdrawal:
    "승인 철회는 개인정보 삭제 요청과 별개이며 링크 화면의 승인 철회 기능으로 하세요.",
  customerCancelConfirm:
    '제출하신 시간을 취소합니다. 취소해도 이전에 입력한 기록은 보관 기간 동안 남습니다. 기록 삭제는 "내 정보 요청하기"에서 요청해 주세요.',
  expired:
    "이 링크는 사용할 수 없습니다. 만료되었거나 새 링크로 바뀌었을 수 있습니다. 새 링크가 필요하면",
  expiredRetention:
    "이 링크는 사용할 수 없습니다. 입력하신 내용은 정해진 보관 기간이 지나면 삭제됩니다.",
  rightsRequestLabel: "내 정보 요청하기",
} as const;

export function linkRightsFooter(context: LinkNoticeContext): string {
  const parts = [
    ...(context.officeName ? [context.officeName] : []),
    ...(context.officeContactPhone ? [context.officeContactPhone] : []),
  ];
  const contact = parts.join(" ");
  const privacy = context.privacyContact ? ` 또는 ${context.privacyContact}` : "";
  return `입력하신 내용의 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다. 링크가 만료되었다면 ${
    contact || FALLBACK_OFFICE
  }${privacy}로 요청해 주세요.`;
}

export function linkExpiredNotice(context: LinkNoticeContext): string {
  const contact = [context.officeName ?? FALLBACK_OFFICE, context.officeContactPhone]
    .filter((part): part is string => Boolean(part))
    .join(" ");
  return `${LINK_COMMON_COPY.expired} ${contact}로 문의해 주세요.`;
}

export const APPROVER_ACCOUNT_NOTICE =
  "여러 매물을 한 화면에서 관리하려면 휴대폰 번호 인증으로 계정을 만들 수 있습니다. 선택 사항이며 만들지 않아도 링크로 모든 기능을 사용할 수 있습니다. 계정을 만들면 인증에 사용한 휴대폰 번호가 계정 확인과 로그인 인증에 사용되며 개인정보처리방침이 적용됩니다. 링크를 폐기해도 계정 접근은 유지되며 접근을 끊으려면 출입승인을 철회하세요.";

export const COAPPROVER_NOTICE =
  "이 링크는 읽기 전용입니다. 조건 입력과 신청 선택은 대표 승인자만 할 수 있습니다.";

export const ACCESS_LOG_NOTICE =
  "서비스 보안을 위해 링크 접속 일시와 접속 환경 정보는 원문이 아닌 변환값으로만 1년 동안 보관합니다.";

export const GUEST_RIGHTS_REQUEST_COPY = {
  title: "내 정보 요청하기",
  description: (context: Pick<LinkNoticeContext, "officeName" | "operatorName">) =>
    `링크로 입력하신 내용의 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다. 요청은 ${
      context.officeName ?? FALLBACK_OFFICE
    }이 처리하며 ${context.operatorName ?? "사이로"}가 접수와 전달을 돕습니다.`,
  fields: [
    "요청 종류(열람, 정정, 삭제, 처리정지)",
    "요청자 구분(본인, 대리인)",
    "연락 방법과 연락처",
    "요청 내용(선택, 최대 1000자)",
  ],
  inputGuide:
    "결과를 받을 이메일 또는 전화번호를 입력해 주세요. 주민등록번호, 계좌번호, 카드번호는 입력하지 마세요. 본인 확인을 위해 입력하신 연락처로 회신드릴 수 있습니다.",
  agentGuide: "대리인이 요청하시면 위임을 확인할 수 있는 서류를 따로 요청드립니다.",
  received: (receivedAt: string, targetDate: string) =>
    `요청을 접수했습니다. ${receivedAt}에 접수되었고 ${targetDate}까지 결과를 알려 드립니다. 접수 번호는 따로 드리지 않습니다.`,
  errors: {
    contact: "연락처 형식이 올바르지 않습니다. 다시 확인해 주세요.",
    rateLimited: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    sensitiveNumber:
      "요청 내용에 주민등록번호나 전체 계좌번호로 보이는 숫자가 있습니다. 지우고 다시 접수해 주세요.",
  },
} as const;

export const LINK_ISSUE_COPY = [
  "승인자 링크를 받은 분만 사용해야 하며 직접 전달해 주세요. 사이로는 링크를 문자나 알림톡으로 발송하지 않습니다.",
  "승인자에게 문의 연락처로 사무소가 등록한 대표 연락처가 링크 화면에 보입니다.",
  "승인자가 여러 매물을 관리하면 선택적 계정으로 한 화면에서 관리할 수 있다고 안내해 주세요.",
  "사무소는 승인자와 고객에게 이 링크로 받는 정보의 목적과 보관 기간을 알릴 책임이 있으며 링크 화면의 안내가 이를 돕습니다.",
] as const;
