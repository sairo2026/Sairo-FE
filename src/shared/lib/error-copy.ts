import { ApiError, ApiNetworkError } from "@/shared/api/api-error";
import type { NetworkErrorKind } from "@/shared/api/api-error";
import type { FieldError } from "@/lib/api/contracts/errors";

/**
 * 서버 오류 응답을 사용자 화면 문구로 바꾸는 단일 사전이다.
 * 서버가 준 `message`는 발생 조건 설명이라 화면에 쓰지 않고, 오류 코드(`code`)와 필드 오류의 코드로만 문구를 고른다.
 * 서버 오류 코드 목록은 백엔드 ErrorCode와 같아야 하며 `error-copy.test.ts`가 누락을 막는다.
 */

export const GENERIC_ERROR_COPY = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

export const NETWORK_ERROR_COPY: Record<NetworkErrorKind, string> = {
  timeout:
    "요청이 오래 걸리고 있습니다. 같은 요청이 이미 처리되었을 수 있으니 목록을 확인한 뒤 다시 시도해 주세요.",
  offline: "인터넷 연결을 확인해 주세요.",
  network: "서버에 연결하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.",
  aborted: "요청이 취소되었습니다.",
};

export const RATE_LIMITED_COPY = "요청이 너무 많습니다. 잠시 뒤에 다시 시도해 주세요.";
export const SERVER_ERROR_COPY = "일시적인 오류가 발생했습니다. 잠시 뒤에 다시 시도해 주세요.";

export function formatWait(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest}초`;
  return rest === 0 ? `${minutes}분` : `${minutes}분 ${rest}초`;
}

/** 오류 코드별 사용자 문구. 무슨 일이 생겼는지와 다음에 할 일을 한두 문장으로 쓴다. */
export const ERROR_CODE_COPY: Record<string, string> = {
  // 400
  INVALID_REQUEST: "입력한 내용을 확인해 주세요. 표시된 항목을 고친 뒤 다시 시도해 주세요.",
  ENCRYPTED_FILE_REJECTED:
    "암호가 걸린 파일은 올릴 수 없습니다. 암호를 해제한 파일로 다시 올려 주세요.",
  UNSUPPORTED_FILE_TYPE:
    "XLS, XLSX, CSV 형식의 파일만 올릴 수 있습니다. 파일 형식을 확인해 주세요.",
  IMPORT_LIMIT_EXCEEDED:
    "파일의 행 또는 열이 허용 범위를 넘었습니다. 시트당 1만 행, 100열 이내로 나누어 올려 주세요.",
  FEE_AMOUNT_MISMATCH: "공급가액과 세액의 합이 합계와 맞지 않습니다. 금액을 다시 확인해 주세요.",
  INCOMPLETE_FOR_ACTIVATION:
    "활성 등록으로 바꾸려면 주소와 담당 공인중개사가 필요합니다. 빠진 항목을 입력해 주세요.",
  INCOMPLETE_FOR_SIGNING: "체결에 필요한 항목이 비어 있습니다. 계약 정보를 확인해 주세요.",
  INVALID_CONTRACT_PARTY:
    "선택한 계약 당사자를 사용할 수 없습니다. 당사자 정보를 다시 확인해 주세요.",
  INVALID_RANGE:
    "범위가 올바르지 않습니다. 작은 값은 큰 값보다 작게, 종료일은 시작일 이후로 입력해 주세요.",
  SENSITIVE_DATA_DETECTED:
    "주민등록번호나 전체 계좌번호로 보이는 내용이 들어 있습니다. 해당 내용을 지운 뒤 다시 시도해 주세요.",

  // 401
  UNAUTHENTICATED: "로그인이 필요합니다. 로그인한 뒤 다시 시도해 주세요.",
  INVALID_CREDENTIALS: "이메일 또는 비밀번호가 맞지 않습니다.",
  STEP_UP_REQUIRED: "중요한 작업이라 본인 확인이 필요합니다. 확인을 마친 뒤 이어서 진행해 주세요.",
  MFA_CODE_INVALID: "확인 코드가 맞지 않거나 시간이 지났습니다. 새 코드를 입력해 주세요.",
  WEBHOOK_AUTH_FAILED: "요청을 확인하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.",

  // 402
  PAYMENT_METHOD_REQUIRED:
    "결제를 진행하려면 구독 구매 동의와 결제수단 등록이 필요합니다. 동의와 등록 상태를 확인해 주세요.",
  PAYMENT_FAILED:
    "결제가 완료되지 않았습니다. 결제수단 상태를 확인한 뒤 다시 시도하거나 다른 결제수단을 사용해 주세요.",
  BILLING_KEY_ISSUE_FAILED:
    "결제수단을 등록하지 못했습니다. 입력한 정보를 확인한 뒤 다시 시도해 주세요.",

  // 403
  FORBIDDEN: "이 작업을 할 권한이 없습니다. 사무소 대표에게 권한을 문의해 주세요.",
  STEP_UP_ACCOUNT_MISMATCH:
    "현재 로그인한 계정과 다른 카카오 계정입니다. 로그인한 계정과 같은 카카오 계정으로 다시 확인해 주세요.",
  SYSTEM_CATEGORY_IMMUTABLE: "기본 카테고리는 수정하거나 사용 중지할 수 없습니다.",
  AUTO_TASK_IMMUTABLE:
    "자동으로 만들어진 업무는 삭제하거나 내용을 바꿀 수 없습니다. 완료 처리와 완료 취소만 할 수 있습니다.",
  RETURN_GRANT_INVALID:
    "반환 권한이 만료되었거나 회수되어 진행할 수 없습니다. 고객지원에 문의해 주세요.",
  ARCHIVE_GRANT_INVALID:
    "보관 자료 열람 권한이 만료되었거나 종료되어 진행할 수 없습니다. 고객지원에 문의해 주세요.",
  DEPUTY_VISIT_LOCKED:
    "중개보조원 인원이 허용 범위를 넘어 방문 업무를 만들거나 확정할 수 없습니다. 인원 구성을 바로잡은 뒤 다시 시도해 주세요.",
  REVIEW_CHECKLIST_INCOMPLETE: "필수 확인 항목을 모두 확인한 뒤 승인할 수 있습니다.",
  SELF_APPROVAL_FORBIDDEN:
    "본인이 요청했거나 수혜하는 건은 직접 승인할 수 없습니다. 다른 담당자에게 승인을 요청해 주세요.",
  DOWNLOAD_NOT_APPROVED:
    "다운로드 승인이 없어 파일을 받을 수 없습니다. 승인을 요청한 뒤 다시 시도해 주세요.",
  RECONSENT_REQUIRED:
    "개정된 약관에 다시 동의해야 업무를 이어갈 수 있습니다. 안내에 따라 동의해 주세요.",
  OFFICE_WRITE_RESTRICTED:
    "결제 전이거나 결제 지연·인증 상태 때문에 지금은 저장할 수 없고 읽기만 가능합니다. 사무소 대표가 구독·결제 화면에서 결제를 마치거나 상태를 풀면 다시 저장할 수 있습니다.",
  APPLY_GRANT_INACTIVE:
    "신청 허용이 만료되었거나 회수되어 신청할 수 없습니다. 출입승인 상태와 허용 현황을 확인해 주세요.",
  APPROVER_READ_ONLY:
    "공동 승인자 권한으로는 조건 입력, 신청 비교·선택, 평가를 할 수 없습니다. 대표 승인자에게 요청해 주세요.",

  // 404, 410
  RESOURCE_NOT_FOUND:
    "대상을 찾을 수 없습니다. 삭제되었거나 볼 수 없는 항목일 수 있으니 목록에서 다시 선택해 주세요.",
  PUBLIC_LINK_NOT_FOUND:
    "유효하지 않거나 만료된 링크입니다. 링크를 보낸 곳에 새 링크를 요청해 주세요.",
  PUBLIC_LINK_EXPIRED:
    "유효하지 않거나 만료된 링크입니다. 링크를 보낸 곳에 새 링크를 요청해 주세요.",
  EVIDENCE_NOT_FOUND: "증빙 서류를 찾을 수 없습니다. 서류 목록을 다시 확인해 주세요.",
  PRICE_SCHEDULE_NOT_PUBLISHED: "지금은 안내할 요금 정보가 없습니다. 잠시 뒤에 다시 확인해 주세요.",
  COMPANY_INFO_NOT_PUBLISHED:
    "지금은 사업자 정보를 불러올 수 없습니다. 잠시 뒤에 다시 확인해 주세요.",
  EXPORT_EXPIRED: "내보내기 파일의 보관 기간이 지나 삭제되었습니다. 다시 내보내기를 요청해 주세요.",

  // 409
  INVALID_TRANSITION:
    "지금 상태에서는 처리할 수 없습니다. 화면을 새로 고쳐 최신 상태를 확인해 주세요.",
  PENDING_REGISTRATION_EXISTS:
    "이미 진행 중인 신청이 있습니다. 처리 결과를 확인한 뒤 다시 신청해 주세요.",
  PENDING_MEMBERSHIP_EXISTS:
    "이미 진행 중인 소속 신청이 있습니다. 처리 결과를 확인한 뒤 다시 신청해 주세요.",
  OFFICE_ALREADY_EXISTS:
    "같은 개설등록번호로 등록된 사무소가 이미 있습니다. 입력한 정보를 확인하거나 고객지원에 문의해 주세요.",
  LAST_OWNER:
    "사무소의 유일한 대표라서 처리할 수 없습니다. 다른 구성원에게 대표를 넘긴 뒤 진행해 주세요.",
  LAST_LOGIN_METHOD: "마지막 남은 로그인 방식은 해제할 수 없습니다.",
  DEPUTY_QUOTA_EXCEEDED:
    "중개보조원 인원이 허용 범위를 넘어 승인할 수 없습니다. 인원 구성을 확인해 주세요.",
  TRANSFER_IN_PROGRESS: "이미 진행 중인 대표 이전이 있습니다. 진행 상태를 확인해 주세요.",
  TRANSFER_PRECONDITION_FAILED:
    "대표 이전에 필요한 조건이 맞지 않습니다. 조건을 확인한 뒤 다시 시도해 주세요.",
  PROPERTY_ARCHIVED:
    "보관된 매물은 수정하거나 조율·계약 대상으로 쓸 수 없습니다. 복원한 뒤 진행해 주세요.",
  PROPERTY_HAS_ACTIVE_COORDINATION:
    "진행 중인 방문 조율이나 계약이 있는 매물은 삭제하거나 다시 등록할 수 없습니다. 진행 중인 건을 먼저 마무리해 주세요.",
  PROPERTY_HAS_ACTIVE_CONTRACT:
    "진행 중인 방문 조율이나 계약이 있는 매물은 삭제하거나 다시 등록할 수 없습니다. 진행 중인 건을 먼저 마무리해 주세요.",
  OFFER_ALREADY_ACTIVE:
    "같은 유형의 진행 중인 거래 제안이 이미 있습니다. 기존 제안을 확인해 주세요.",
  CATEGORY_LIMIT_EXCEEDED:
    "만들 수 있는 카테고리 수에 도달했습니다. 쓰지 않는 카테고리를 정리한 뒤 다시 시도해 주세요.",
  FIELD_LIMIT_EXCEEDED:
    "만들 수 있는 입력 항목 수에 도달했습니다. 쓰지 않는 항목을 정리한 뒤 다시 시도해 주세요.",
  CATEGORY_NAME_DUPLICATED: "같은 이름의 카테고리가 이미 있습니다. 다른 이름을 입력해 주세요.",
  FIELD_NAME_DUPLICATED: "같은 이름의 입력 항목이 이미 있습니다. 다른 이름을 입력해 주세요.",
  FIRST_INQUIRY_ALREADY_EXISTS:
    "이 고객의 최초 문의가 이미 등록되어 있습니다. 기존 문의를 확인해 주세요.",
  SCHEDULE_CONFLICT: "담당자, 고객 또는 매물의 방문 시간이 겹칩니다. 다른 시간을 선택해 주세요.",
  SALE_CANNOT_TERMINATE:
    "매매 계약은 종료 처리를 할 수 없습니다. 계약 유형과 현재 상태를 확인해 주세요.",
  CONTRACT_ACTION_NOT_ALLOWED:
    "이 계약에서는 할 수 없는 처리입니다. 계약 유형과 현재 상태를 확인해 주세요.",
  VERSION_CONFLICT: "다른 곳에서 먼저 수정되었습니다. 새로 고친 뒤 다시 시도해 주세요.",
  PAYMENT_VERIFYING: "직전 결제 결과를 확인하는 중입니다. 확인이 끝난 뒤 다시 시도해 주세요.",
  CANCELLATION_ALREADY_EFFECTIVE:
    "이미 적용된 해지는 철회할 수 없습니다. 이용 상태를 확인해 주세요.",
  IMPORT_NOT_CANCELLABLE:
    "취소할 수 있는 기간이 지났거나 취소할 신규 데이터가 없습니다. 이전 결과를 확인해 주세요.",
  APPROVAL_INVALIDATED:
    "승인이 무효가 되어 실행할 수 없습니다. 승인 상태를 확인한 뒤 다시 요청해 주세요.",
  CONTRACT_REVISION_CONFLICT:
    "계약 핵심 정보가 먼저 바뀌었거나 체결 전에는 서류를 붙일 수 없습니다. 화면을 새로 고쳐 확인해 주세요.",
  CUSTOMER_ARCHIVED: "보관된 고객은 수정할 수 없습니다. 복원한 뒤 수정해 주세요.",
  CUSTOMER_NOT_ARCHIVED: "복원할 수 있는 고객이 아닙니다. 화면을 새로 고쳐 상태를 확인해 주세요.",
  DOCUMENT_VERSION_CONFLICT: "이미 등록된 버전입니다. 새 버전으로 다시 등록해 주세요.",
  EMAIL_ALREADY_REGISTERED: "이미 가입된 이메일입니다.",
  PHONE_ALREADY_REGISTERED: "이미 가입된 휴대폰 번호입니다.",
  FIELD_INACTIVE: "사용을 중지한 입력 항목에는 값을 저장할 수 없습니다. 항목 상태를 확인해 주세요.",
  KAKAO_ALREADY_LINKED: "이미 다른 계정에 연결된 카카오 계정입니다.",
  LIFECYCLE_ALREADY_SUPERSEDED: "이미 정정된 기록입니다. 최신 내용을 확인해 주세요.",
  LIFECYCLE_ORDER_CONFLICT:
    "기록의 순서가 맞지 않아 처리할 수 없습니다. 날짜와 시각을 확인해 주세요.",
  PROPERTY_NOT_ARCHIVED: "복원할 수 있는 매물이 아닙니다. 화면을 새로 고쳐 상태를 확인해 주세요.",
  TERMS_VERSION_CHANGED:
    "약관이나 안내가 새로 바뀌었습니다. 최신 내용을 확인하고 다시 동의해 주세요.",
  TERMS_WITHDRAWAL_NOT_ALLOWED:
    "필수 동의 항목은 철회할 수 없습니다. 철회가 필요하면 고객지원에 문의해 주세요.",
  ATTACHMENT_NOT_READY: "첨부 파일을 검사하는 중입니다. 검사가 끝난 뒤 다시 시도해 주세요.",
  ATTACHMENT_REJECTED:
    "보안 검사를 통과하지 못해 받을 수 없는 파일입니다. 다른 파일을 올려 주세요.",
  CONSENT_TERMS_MISMATCH:
    "구독 구매 동의 내용(인원·금액·기간)이 최신 계산과 다릅니다. 내용을 다시 확인한 뒤 동의해 주세요.",
  VERIFICATION_INCOMPLETE:
    "검증 결과가 빠진 저장소가 있어 완료할 수 없습니다. 모든 항목을 입력해 주세요.",
  INTEGRATION_PREREQUISITE_INCOMPLETE:
    "연동을 켜기 위한 사전 조건이 끝나지 않았습니다. 남은 조건을 확인해 주세요.",
  INVITATION_ALREADY_PENDING:
    "같은 이메일로 보낸 초대가 이미 대기 중입니다. 기존 초대를 확인해 주세요.",
  INVITATION_NOT_USABLE:
    "사용할 수 없는 초대입니다. 만료되었거나 취소되었거나 이미 수락한 초대일 수 있습니다.",
  OPERATOR_ALREADY_EXISTS:
    "이 초대로는 운영자 계정을 만들 수 없습니다. 보안관리자에게 문의해 주세요.",
  ASSIGNEE_NOT_ELIGIBLE:
    "선택한 담당자는 이 업무 역할이 활성 상태가 아니라 지정할 수 없습니다. 다른 담당자를 선택해 주세요.",
  ASSIGNEE_REQUIRED:
    "재개하려면 활성 상태의 담당 운영자가 필요합니다. 담당자를 지정한 뒤 다시 시도해 주세요.",
  QUOTE_EXPIRED: "견적의 유효기한이 지나 수락하거나 거절할 수 없습니다. 새 견적을 요청해 주세요.",
  QUOTE_SUPERSEDED:
    "새 견적으로 대체되어 이 견적은 수락하거나 거절할 수 없습니다. 최신 견적을 확인해 주세요.",
  IMPORT_BATCH_ALREADY_LINKED:
    "이미 다른 유료 이전 지원에 연결된 이전 건입니다. 연결된 지원 요청을 확인해 주세요.",
  IMPORT_MANAGED_BY_SUPPORT:
    "유료 이전 지원이 진행 중인 건이라 직접 매핑하거나 실행할 수 없습니다. 담당자의 안내를 기다려 주세요.",
  CHANGE_REQUEST_LIMIT_EXCEEDED:
    "표준 범위에 포함된 수정 요청 횟수를 넘었습니다. 추가 수정은 고객지원에 문의해 주세요.",
  MAPPING_REQUIRED:
    "확정된 항목 연결이 없어 검수를 제출할 수 없습니다. 항목 연결을 확정한 뒤 다시 제출해 주세요.",
  APPROVED_MAPPING_MISMATCH:
    "승인한 항목 연결과 실행하려는 연결이 다릅니다. 최신 연결을 다시 확인해 주세요.",
  RAW_ACCESS_EXPIRED: "원문 접근 가능 시간이 지났습니다. 필요하면 다시 요청해 주세요.",
  RAW_ACCESS_REVOKED: "회수된 원문 접근입니다. 필요하면 다시 요청해 주세요.",
  RAW_DOWNLOAD_ALREADY_USED:
    "이미 전달된 파일이라 다시 받을 수 없습니다. 필요하면 새로 요청해 주세요.",
  IDENTITY_NOT_VERIFIED:
    "본인확인이 끝나지 않아 승인하거나 제한할 수 없습니다. 본인확인을 완료한 뒤 진행해 주세요.",
  LAST_SECURITY_ADMIN:
    "마지막 활성 보안관리자는 비활성화하거나 역할을 회수할 수 없습니다. 다른 보안관리자를 먼저 지정해 주세요.",
  VISIT_REQUEST_DUPLICATE_ACTIVE:
    "같은 후보 매물에 대기 중이거나 선택된 신청이 이미 있습니다. 기존 신청을 확인해 주세요.",
  VISIT_REQUEST_INVALID_STATE:
    "현재 신청 상태에서는 할 수 없는 작업입니다. 화면을 새로 고쳐 상태를 확인해 주세요.",
  APPROVER_CONDITION_EXPIRED: "승인자 조건의 적용 기간이 지났습니다. 조건을 새로 등록해 주세요.",
  IMPACT_NOT_ACKNOWLEDGED:
    "조건 변경이 이미 확정된 방문에 영향을 줍니다. 영향 내용을 확인한 뒤 다시 저장해 주세요.",
  VISIT_REVIEW_WINDOW_CLOSED: "방문이 완료되지 않았거나 평가 입력 기한이 지나 평가할 수 없습니다.",
  VISIT_REVIEW_LOCKED:
    "이의 접수, 운영자 삭제 또는 수정 횟수 초과로 평가를 더 바꾸거나 철회할 수 없습니다.",
  VISIT_REVIEW_DISPUTE_EXISTS: "이 평가에는 이미 이의가 접수되었습니다. 처리 결과를 기다려 주세요.",
  VISIT_REVIEW_DISPUTE_WINDOW_CLOSED:
    "평가를 마지막으로 입력한 뒤 30일이 지나 이의를 낼 수 없습니다.",
  PREFERRED_BROKER_DUPLICATE: "이미 선호 중개사로 지정된 중개사입니다.",
  START_CUSTOMER_AGREEMENT_EXISTS:
    "이 사무소에는 시작 고객 합의가 이미 있습니다. 기존 합의를 확인해 주세요.",
  START_CUSTOMER_WINDOW_CLOSED: "시작 고객 이벤트의 가입 기간이 아니라 처리할 수 없습니다.",
  START_CUSTOMER_QUOTA_EXCEEDED: "시작 고객 이벤트의 승인 한도에 도달해 처리할 수 없습니다.",
  PRICE_CHANGE_NOTICE_CLOSED:
    "응답 기한이 지났거나 이미 결정된 가격 변경 안내입니다. 안내 내용을 확인해 주세요.",
  TRIAL_EVENT_WINDOW_OVERLAP:
    "활성 또는 예약된 체험 이벤트와 가입 기간이 겹칩니다. 기간을 조정해 주세요.",
  NOTICE_VERSION_CHANGED:
    "개인정보 안내가 새로 바뀌었습니다. 최신 안내를 확인한 뒤 다시 진행해 주세요.",
  GUEST_INTAKE_ALREADY_CONVERTED: "이미 권리 요청으로 전환된 접수입니다.",
  TAX_DOCUMENT_ALREADY_ISSUED:
    "같은 청구서에 같은 종류의 증빙 발급 기록이 이미 있습니다. 발급 내역을 확인해 주세요.",
  TAX_INVOICE_NOT_ELIGIBLE:
    "증빙을 기록하거나 수정 발급할 수 없는 청구서입니다. 청구서 상태를 확인해 주세요.",
  APPLY_GRANT_DUPLICATE_ACTIVE:
    "같은 출입승인과 대상에 이미 활성 신청 허용이 있습니다. 기존 허용을 확인해 주세요.",
  PRIMARY_APPROVER_EXISTS:
    "같은 기간에 유효한 대표 승인자 출입승인이 이미 있습니다. 기간을 확인해 주세요.",
  APPROVER_APPROVAL_ALREADY_LINKED: "이 출입승인은 이미 다른 승인자 프로필에 연결되어 있습니다.",

  // 413
  FILE_TOO_LARGE: "파일이 너무 큽니다. 20MB 이하의 파일로 올려 주세요.",

  // 422
  CANDIDATE_NOT_ALLOWED:
    "선택할 수 없는 후보 매물이 있습니다. 허용이 없거나 회수된 매물은 제외해 주세요.",
  CANDIDATE_LIMIT_EXCEEDED:
    "후보 매물 수가 허용 범위를 넘었습니다. 후보를 줄인 뒤 다시 시도해 주세요.",
  PERIOD_TOO_LONG: "방문 가능 기간은 오늘부터 30일 안으로 정해 주세요.",
  ACCESS_APPROVAL_MISSING: "출입승인이 없는 매물이 있습니다. 출입승인 상태를 먼저 확인해 주세요.",
  TIME_OUT_OF_RANGE: "선택한 시간이 가능한 범위를 벗어났습니다. 범위 안의 시간을 선택해 주세요.",
  TOKEN_EXPIRED: "인증 시간이 지났습니다. 다시 인증해 주세요.",
  TOKEN_INVALID: "인증 정보가 올바르지 않습니다. 다시 인증해 주세요.",
  VERIFICATION_CODE_INVALID: "인증번호가 맞지 않습니다.",
  APPROVER_CONDITION_MISSING: "승인자 조건이 아직 등록되지 않았습니다. 조건을 먼저 등록해 주세요.",
  APPROVER_CONDITION_VIOLATED:
    "신청한 시간이 승인자 조건이나 고객이 가능한 시간과 맞지 않습니다. 시간을 다시 선택해 주세요.",
  ATTACHMENT_TYPE_NOT_ALLOWED:
    "PDF, JPG, PNG 파일만 첨부할 수 있습니다. 파일 형식을 확인해 주세요.",
  ATTACHMENT_TOO_LARGE:
    "첨부 파일은 파일당 20MB 이하여야 합니다. 파일 크기를 줄여 다시 올려 주세요.",
  ATTACHMENT_LIMIT_EXCEEDED:
    "첨부 파일은 문의당 10개까지 올릴 수 있습니다. 개수를 줄여 다시 올려 주세요.",
  PREFERRED_BROKER_LIMIT_EXCEEDED:
    "출입승인당 선호 중개사는 5명까지 지정할 수 있습니다. 기존 지정을 정리한 뒤 다시 시도해 주세요.",
  PRICE_NOTICE_PERIOD_TOO_SHORT:
    "새 요금표는 안내한 때로부터 30일 뒤 이후에 적용할 수 있습니다. 적용 시각을 늦춰 주세요.",
  MARKETING_EMAIL_REQUIRED: "마케팅 수신 동의에는 인증된 이메일이 필요합니다.",
  GUEST_CONTACT_INVALID: "연락처 형식이 올바르지 않습니다. 연락처를 다시 확인해 주세요.",
  TAX_RECIPIENT_INVALID:
    "세금계산서를 받을 사업자등록번호나 이메일 형식이 올바르지 않습니다. 다시 확인해 주세요.",
  APPLY_GRANT_TARGET_INVALID:
    "신청을 허용할 수 없는 대상입니다. 대상 사무소와 중개사의 승인·인증 상태를 확인해 주세요.",
  APPROVER_CLAIM_NOT_ALLOWED:
    "입력한 번호로는 이 출입승인을 확인할 수 없습니다. 번호를 다시 확인하거나 요청한 사무소에 문의해 주세요.",
  BULK_LIMIT_EXCEEDED:
    "한 번에 적용할 수 있는 출입승인은 20개까지입니다. 개수를 줄여 다시 시도해 주세요.",

  // 429
  RATE_LIMITED: RATE_LIMITED_COPY,
  LOGIN_LOCKED: "로그인이 일시적으로 제한되었습니다. 잠시 뒤에 다시 시도해 주세요.",
  IMPORT_QUOTA_EXCEEDED:
    "이번 달 데이터 이전 가능 횟수를 모두 사용했습니다. 다음 달에 다시 시도하거나 고객지원에 문의해 주세요.",
  MFA_LOCKED: "확인 코드를 연속으로 틀려 잠시 잠겼습니다. 15분 뒤에 다시 시도해 주세요.",
  VISIT_REQUEST_QUOTA_EXCEEDED:
    "동시에 진행할 수 있는 신청 한도에 도달했습니다. 진행 중인 신청을 철회하거나 종결된 뒤 다시 시도해 주세요.",

  // 500, 503
  INTERNAL_ERROR: SERVER_ERROR_COPY,
  SMS_UNAVAILABLE: "지금은 인증번호를 문자로 보낼 수 없습니다. 잠시 뒤에 다시 시도해 주세요.",
  PAYMENT_SYSTEM_UNAVAILABLE:
    "지금 결제 시스템을 점검하고 있습니다. 카드 정보는 저장되지 않았으니 잠시 뒤에 다시 시도해 주세요.",
};

/** 필드 오류 코드별 문구. 입력 칸 아래에 붙으므로 항목 이름 없이 읽혀도 뜻이 통해야 한다. */
export const FIELD_ERROR_CODE_COPY: Record<string, string> = {
  REQUIRED: "필수 입력입니다.",
  TOO_SHORT: "입력한 내용이 너무 짧습니다. 조금 더 입력해 주세요.",
  TOO_LONG: "입력한 내용이 너무 깁니다. 글자 수를 줄여 주세요.",
  INVALID_FORMAT: "형식이 올바르지 않습니다. 입력한 내용을 확인해 주세요.",
  OUT_OF_RANGE: "허용 범위를 벗어났습니다. 값을 확인해 주세요.",
  NOT_ALLOWED: "사용할 수 없는 값입니다. 다른 값을 입력해 주세요.",
  TYPE_MISMATCH: "입력 형식이 맞지 않습니다. 항목에 맞는 값을 입력해 주세요.",
  HTML_NOT_ALLOWED: "특수한 태그 문자는 쓸 수 없습니다. 일반 글자로 입력해 주세요.",
  INVALID_VALUE: "올바르지 않은 값입니다. 입력한 내용을 확인해 주세요.",
};

export const FIELD_ERROR_FALLBACK_COPY = "입력한 내용을 확인해 주세요.";

/** 항목과 코드가 짝으로 정해진 문구. 비밀번호 정책처럼 기준을 알려 줘야 하는 항목만 둔다. */
export const FIELD_ERROR_OVERRIDES: Record<string, string> = {
  "windows.REQUIRED":
    "가능한 시간대를 1개 이상 입력해 주세요. 요일별 시간대나 날짜별 가능 시간 중 하나는 있어야 합니다.",
  "businessNumber.INVALID_FORMAT":
    "사업자등록번호 형식이 올바르지 않습니다. 숫자 10자리를 입력해 주세요. 하이픈(-)은 넣어도 됩니다.",
  "businessNumber.INVALID_VALUE":
    "존재하지 않는 사업자등록번호로 보입니다. 번호를 다시 확인해 주세요.",
  "receiverEmail.INVALID_FORMAT": "이메일 주소 형식이 올바르지 않습니다. 다시 확인해 주세요.",
  "representativePhone.INVALID_FORMAT":
    "연락처 형식이 올바르지 않습니다. 010-0000-0000 형식으로 입력해 주세요.",
  "requestedValues.representativePhone.INVALID_FORMAT":
    "연락처 형식이 올바르지 않습니다. 010-0000-0000 형식으로 입력해 주세요.",
  "requestedValues.businessRegistrationNumber.INVALID_FORMAT":
    "사업자등록번호 형식이 올바르지 않습니다. 숫자 10자리를 입력해 주세요.",
  "requestedValues.businessRegistrationNumber.INVALID_VALUE":
    "존재하지 않는 사업자등록번호로 보입니다. 번호를 다시 확인해 주세요.",
  "password.REQUIRED": "비밀번호를 입력해 주세요.",
  "password.TOO_SHORT": "비밀번호는 8자 이상이어야 합니다.",
  "password.TOO_LONG": "비밀번호는 12자 이하여야 합니다.",
  "password.NOT_ALLOWED": "너무 흔한 비밀번호입니다. 다른 비밀번호를 입력해 주세요.",
  "newPassword.REQUIRED": "비밀번호를 입력해 주세요.",
  "newPassword.TOO_SHORT": "비밀번호는 8자 이상이어야 합니다.",
  "newPassword.TOO_LONG": "비밀번호는 12자 이하여야 합니다.",
  "newPassword.NOT_ALLOWED": "너무 흔한 비밀번호입니다. 다른 비밀번호를 입력해 주세요.",
};

/** 필드 오류 하나를 입력 칸 아래에 보일 문구로 바꾼다. 서버가 준 문장은 쓰지 않는다. */
export function describeFieldError(item: Pick<FieldError, "field" | "code">): string {
  if (!item.code) return FIELD_ERROR_FALLBACK_COPY;
  return (
    FIELD_ERROR_OVERRIDES[`${item.field}.${item.code}`] ??
    FIELD_ERROR_CODE_COPY[item.code] ??
    FIELD_ERROR_FALLBACK_COPY
  );
}

function describeRateLimit(retryAfterSeconds: number | undefined, lead: string): string {
  return retryAfterSeconds
    ? `${lead} ${formatWait(retryAfterSeconds)} 뒤에 다시 시도해 주세요.`
    : `${lead} 잠시 뒤에 다시 시도해 주세요.`;
}

/**
 * 오류를 화면 문구로 바꾼다. 서버 `message`는 읽지 않는다.
 * 순서는 연결 오류, 서버 오류(5xx), 요청 제한, 호출부가 준 맥락별 문구, 공통 사전, 대체 문구다.
 * `INVALID_REQUEST`는 어느 입력이 문제인지 필드 오류가 알려 주는 포괄 코드라서, 호출부가 대체 문구를 줬으면 그 문구를 쓴다.
 */
export function describeApiError(
  error: unknown,
  fallback?: string,
  overrides: Record<string, string> = {},
): string {
  const resolved = fallback ?? GENERIC_ERROR_COPY;
  if (error instanceof ApiNetworkError) return NETWORK_ERROR_COPY[error.kind];
  if (!(error instanceof ApiError)) return resolved;
  if (error.status >= 500) {
    if (error.code === "SMS_UNAVAILABLE" || error.code === "PAYMENT_SYSTEM_UNAVAILABLE") {
      return overrides[error.code] ?? ERROR_CODE_COPY[error.code] ?? SERVER_ERROR_COPY;
    }
    return SERVER_ERROR_COPY;
  }
  if (error.code === "RATE_LIMITED") {
    return describeRateLimit(error.retryAfterSeconds, "요청이 너무 많습니다.");
  }
  if (error.code === "LOGIN_LOCKED") {
    return describeRateLimit(error.retryAfterSeconds, "로그인이 일시적으로 제한되었습니다.");
  }
  if (error.code === "INVALID_REQUEST" && fallback !== undefined && !overrides.INVALID_REQUEST) {
    return fallback;
  }
  const known = overrides[error.code] ?? ERROR_CODE_COPY[error.code];
  if (known) return known;
  if (error.status === 429)
    return describeRateLimit(error.retryAfterSeconds, "요청이 너무 많습니다.");
  return resolved;
}
