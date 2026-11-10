import { ApiError, ApiNetworkError } from "@/shared/api/client";
import { formatWait } from "@/shared/lib/api-messages";

export const SUPPORT_COPY = {
  hubTitle: "서비스 이용",
  hubDescription: "약관과 방침, 동의 내역, 문의 이력을 한곳에서 확인합니다.",
  policiesTitle: "약관과 방침",
  consentsTitle: "동의 내역",
  consentsIntro:
    "선택 약관만 여기서 철회할 수 있습니다. 필수 약관은 철회 대신 회원 탈퇴로 안내합니다.",
  consentsAll: "전체 동의·철회 이력 보기",
  required: "필수",
  optional: "선택",
  agreed: "동의함",
  notAgreed: "동의하지 않음",
  withdraw: "철회",
  withdrawDone: "동의를 철회했습니다.",
  requiredWithdrawBlocked:
    "이용약관 동의는 철회할 수 없습니다. 이용을 멈추려면 회원 탈퇴를 진행해 주세요.",
  subprocessorsTitle: "위탁하는 업체",
  subprocessorsEmpty: "게시된 위탁 업체 목록이 없습니다.",
  inquiriesTitle: "문의 이력",
  inquiriesEmpty: "아직 문의한 내역이 없습니다.",
  newInquiry: "문의하기",
  privacyTitle: "개인정보 권리 요청",
  privacyEmpty: "접수한 권리 요청이 없습니다.",
  privacyLink: "권리 요청하기",
  enterpriseTitle: "기업 도입 문의",
  enterpriseDescription:
    "여러 지점을 쓰거나 별도 견적이 필요하면 도입 문의를 남기고, 받은 조회키로 진행 상태와 견적을 확인합니다.",
  enterpriseLink: "기업 도입 문의로 가기",
  withdrawalTitle: "회원 탈퇴",
  withdrawalDescription:
    "재인증이 필요합니다. 유일한 대표는 대표를 이전하거나 사무소를 종료한 뒤 탈퇴할 수 있습니다.",
  withdrawalLink: "회원 탈퇴 안내",
  newTitle: "문의하기",
  categoryLabel: "문의 유형",
  categoryPlaceholder: "유형을 선택해 주세요",
  categoryRequired: "문의 유형을 선택해 주세요.",
  contentLabel: "문의 내용",
  contentRequired: "문의 내용을 입력해 주세요.",
  contentTooLong: (limit: number) => `문의 내용은 ${limit}자까지 입력할 수 있습니다.`,
  scopeLabel: "요청 범위 (선택)",
  scopeHint: "개인정보 요청이면 처리해 달라는 대상과 범위를 적어 주세요.",
  submit: "문의 접수",
  detailTitle: "문의 상세",
  firstReplyTarget: "첫 답변 목표",
  assignedTo: "담당",
  unassigned: "배정 전",
  messagesTitle: "대화",
  requesterLabel: "나",
  operatorLabel: "사이로 담당자",
  replyLabel: "추가 내용",
  replyRequired: "추가할 내용을 입력해 주세요.",
  replySubmit: "답글 등록",
  replyReopened: "답글을 등록했습니다. 완료된 문의는 다시 처리 대기로 올라갑니다.",
  replyDone: "답글을 등록했습니다.",
  attachmentsTitle: "첨부 파일",
  attachmentsEmpty: "첨부한 파일이 없습니다.",
  attachmentAdd: "파일 첨부",
  attachmentType: "PDF, JPG, PNG 파일만 첨부할 수 있습니다.",
  attachmentTooLarge: "파일은 한 개당 20MB를 넘을 수 없습니다.",
  attachmentLimit: "첨부는 문의 하나에 10개까지 가능합니다.",
  attachmentDone: "파일을 올렸습니다. 검사가 끝나면 내려받을 수 있습니다.",
  download: "내려받기",
  notReady: "검사가 끝나면 내려받을 수 있습니다.",
  rejected: "검사에서 거부된 파일입니다.",
  enterprisePageTitle: "기업 도입 문의",
  enterpriseFormTitle: "도입 문의 남기기",
  enterpriseLookupTitle: "진행 상태 확인",
  companyName: "회사·사무소명",
  contactName: "담당자 이름",
  contactEmail: "담당자 이메일",
  contactPhone: "담당자 연락처",
  branchCount: "지점 수",
  expectedSeats: "예상 인원",
  migrationNeeded: "기존 자료 이전 지원이 필요합니다.",
  enterpriseContent: "문의 내용",
  privacyNoticeLabel: "개인정보 수집·이용 안내를 확인했습니다.",
  privacyNotice:
    "도입 상담을 위해 회사명, 담당자 이름, 연락처, 이메일을 수집해 견적과 상담에만 사용하며 문의 처리가 끝난 뒤 개인정보처리방침에 따라 보관하고 파기합니다.",
  privacyNoticeRequired: "개인정보 수집·이용 안내를 확인해 주세요.",
  emailInvalid: "이메일 형식이 올바르지 않습니다.",
  positiveNumber: "1 이상의 숫자를 입력해 주세요.",
  fieldRequired: "필수 항목입니다.",
  enterpriseSubmit: "문의 접수",
  keyNotice: "조회키는 지금 한 번만 보여 드립니다. 복사해서 안전한 곳에 보관해 주세요.",
  leadId: "문의 번호",
  trackingKey: "조회키",
  lookupLeadId: "문의 번호",
  lookupKey: "조회키",
  lookupSubmit: "조회",
  lookupNotFound: "문의 번호나 조회키가 맞지 않습니다.",
  quoteTitle: "견적",
  quoteAmount: "견적 금액",
  quoteExpires: "견적 유효기한",
  quoteAccept: "견적 수락",
  quoteReject: "견적 거절",
  quoteAccepted: "견적을 수락했습니다. 청구는 계약 절차에서 안내됩니다.",
  quoteRejected: "견적을 거절했습니다.",
  quoteExpiredNote: "견적 유효기한이 지났습니다. 새 견적이 도착하면 다시 확인해 주세요.",
} as const;

export const PRIVACY_COPY = {
  title: "개인정보 권리 요청",
  description: "본인 정보에 관한 요청을 접수하고 처리 상태를 확인합니다.",
  formTitle: "요청 접수",
  typeLabel: "요청 유형",
  typePlaceholder: "유형을 선택해 주세요",
  typeRequired: "요청 유형을 선택해 주세요.",
  contentLabel: "요청 내용",
  contentRequired: "요청 내용을 입력해 주세요.",
  contentHint: "주민등록번호, 전체 계좌번호, 카드번호는 입력하지 마세요.",
  scopeLabel: "요청 범위 (선택)",
  scopeHint: "열람이나 삭제를 원하는 개인정보와 처리 범위를 적어 주세요.",
  submit: "요청 접수",
  listTitle: "내 요청 이력",
  listEmpty: "접수한 권리 요청이 없습니다.",
  statusFilter: "처리 상태",
  allStatuses: "전체 상태",
  detailTitle: "요청 처리 상태",
  received: "요청을 접수했습니다. 처리 상태와 기한은 이 화면에서 확인할 수 있습니다.",
  handlerSairo: "사이로가 직접 처리합니다.",
  handlerOffice: (name: string) => `${name}이 처리하며 사이로가 사무소의 지시에 따라 지원합니다.`,
  handlerOfficeNoName: "해당 사무소가 처리하며 사이로가 사무소의 지시에 따라 지원합니다.",
  legalDue: "법정 처리 기한",
  internalDue: "내부 목표 기한",
  completedAt: "완료 시각",
  receivedAt: "접수 시각",
  identity: "본인 확인",
  handler: "처리 주체",
  decisionReason: "결정 사유",
  waitingGeneric: "보완이 필요하면 안내해 드립니다. 보완하는 동안에도 처리 기한은 멈추지 않습니다.",
  partialTitle: "일부 제한된 요청입니다.",
  noContact: "고객지원",
} as const;

export const SUPPORT_ERROR_BY_CODE: Record<string, string> = {
  ATTACHMENT_TYPE_NOT_ALLOWED: "PDF, JPG, PNG 파일만 첨부할 수 있습니다.",
  ATTACHMENT_TOO_LARGE: "파일은 한 개당 20MB를 넘을 수 없습니다.",
  ATTACHMENT_LIMIT_EXCEEDED: "첨부는 문의 하나에 10개까지 가능합니다.",
  ATTACHMENT_NOT_READY: "검사가 끝나지 않았거나 거부된 파일은 내려받을 수 없습니다.",
  QUOTE_EXPIRED: "견적 유효기한이 지났습니다. 새 견적을 기다려 주세요.",
  QUOTE_SUPERSEDED: "더 새로운 견적이 도착했습니다. 화면을 새로 고쳐 확인해 주세요.",
  INVALID_TRANSITION: "현재 상태에서는 이 작업을 할 수 없습니다. 화면을 새로 고쳐 확인해 주세요.",
  SENSITIVE_DATA_DETECTED:
    "주민등록번호나 계좌번호로 보이는 숫자가 있습니다. 지우고 다시 접수해 주세요.",
  RESOURCE_NOT_FOUND: "대상을 찾을 수 없습니다.",
  TERMS_WITHDRAWAL_NOT_ALLOWED:
    "이용약관 동의는 철회할 수 없습니다. 이용을 멈추려면 회원 탈퇴를 진행해 주세요.",
  UNAUTHENTICATED: "로그인이 필요합니다.",
};

export function describeSupportError(error: unknown, fallback: string): string {
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
    const mapped = SUPPORT_ERROR_BY_CODE[error.code];
    if (mapped && error.status < 500) return mapped;
    if (error.status === 403) return "이 작업을 할 권한이 없습니다.";
    if (error.status >= 500) return "일시적인 오류가 발생했습니다. 잠시 뒤에 다시 시도해 주세요.";
    return fallback;
  }
  return fallback;
}
