import { describeAuthError, isApiCode } from "@/shared/lib/api-messages";

export const SETTINGS_COPY = {
  title: "내 계정",
  description: "본인 정보, 알림 수신, 동의 내역과 계정 설정을 관리합니다.",
  profileTitle: "내 정보",
  nameLabel: "표시 이름",
  nameRequired: "표시 이름을 입력해 주세요.",
  nameTooLong: "표시 이름은 50자까지 입력할 수 있습니다.",
  nameSave: "이름 저장",
  nameSaved: "표시 이름을 저장했습니다.",
  contactTitle: "연락처와 로그인 방식",
  email: "이메일",
  phone: "휴대폰",
  none: "등록되지 않음",
  verified: "인증됨",
  unverified: "인증 전",
  contactChange: "이메일·휴대폰 변경",
  loginMethods: "로그인 방식 관리",
  loginMethodsLabel: "연결된 로그인 방식",
  methodEmail: "이메일",
  methodKakao: "카카오",
  reauthNote: "변경과 연결·해제는 본인 확인을 한 번 더 합니다.",
  officeTitle: "소속 사무소",
  officeNone: "소속된 사무소가 없습니다.",
  officeRole: "역할",
  officeAccess: "접근 상태",
  officeManage: "사무소 관리",
  roleOwner: "대표",
  roleAgent: "소속공인중개사",
  roleDeputy: "중개보조원",
  leave: "사무소 나가기",
  leaveConfirmTitle: "사무소에서 나갈까요?",
  leaveConfirm:
    "소속이 풀리고 이 사무소의 업무 화면에 더 이상 들어갈 수 없습니다. 계정은 그대로 유지됩니다.",
  leaveDone: "사무소에서 나왔습니다.",
  ownerLeaveBlocked:
    "유일한 대표는 사무소를 나갈 수 없습니다. 대표를 먼저 다른 사람에게 넘기거나 사무소를 종료해 주세요.",
  ownerTransfer: "대표 이전",
  officeClose: "사무소 종료",
  notificationsTitle: "알림 수신 설정",
  notificationsIntro:
    "방문, 로그인·보안, 공지·혜택 세 가지로 나뉩니다. 법정 고지성 알림과 서비스 필수 알림은 설정과 관계없이 항상 보냅니다.",
  visitReminder: "방문 일정·확정·재조율·결과 입력 알림",
  security: "로그인·보안 알림",
  marketing: "이메일로 공지·혜택 안내 받기",
  mandatoryNote:
    "사무소 인증 심사, 구성원 승인, 초대, 결제, 반환·파기 예정, 문의 답변 같은 서비스 필수 알림은 끌 수 없고 항상 발송됩니다.",
  saved: "알림 설정을 저장했습니다.",
  marketingEnableConfirm: "동의하고 켜기",
  marketingFullText: "전문 보기",
  marketingNeedsAgreement: "동의에 체크해야 켤 수 있습니다.",
  reconsentButton: "바뀐 내용 확인하고 다시 동의",
  loginHistoryTitle: "최근 로그인",
  loginHistoryEmpty: "로그인 기록이 없습니다.",
  loginHistoryColumns: ["방식", "IP 주소", "브라우저", "시각"],
  consentsMenuTitle: "동의 내역",
  consentsMenuDescription: "약관 동의와 철회 이력을 확인하고 선택 항목을 켜거나 끕니다.",
  consentsMenuLink: "동의 내역 보기",
  securityTitle: "보안과 계정",
  logout: "로그아웃",
  withdrawal: "회원 탈퇴",
  withdrawalDescription:
    "탈퇴하면 업무 접근과 로그인 연결이 폐기됩니다. 탈퇴 전에 안내를 확인해 주세요.",
  consentsTitle: "동의 내역",
  consentsPageDescription: "내가 한 동의와 철회의 이력입니다.",
  consentsCurrent: "현재 동의 상태",
  consentsHistory: "동의·철회 이력",
  consentsHistoryEmpty: "동의·철회 이력이 없습니다.",
  pathLabel: {
    SIGNUP_EMAIL: "이메일 가입",
    SIGNUP_KAKAO: "카카오 가입",
    ACCOUNT_SETTINGS: "내 정보 화면",
    RECONSENT: "재동의",
    UNSUBSCRIBE_LINK: "수신 거부 링크",
    UNKNOWN: "이전 기록(경로 미기록)",
  } as Record<string, string>,
  closeTitle: "사무소 종료",
  closeDescription: "사무소를 종료하면 모든 구성원의 소속이 풀리고 자동결제가 멈춥니다.",
  closeMembers: "구성원",
  closeSubscription: "구독 현황",
  closeReturn:
    "종료한 날부터 30일 동안 일반 업무 자료를 조회하고 내려받을 수 있습니다. 이 기간이 지나면 일반 업무 데이터는 복원되지 않고 파기됩니다.",
  closeEffects: [
    "모든 구성원의 업무 접근이 바로 끝나고 소속이 풀립니다.",
    "구독이 종료되고 자동결제가 멈춥니다.",
    "진행 중인 청구, 환불, 대표 이전이 있어도 종료할 수 있으며 그 책임은 대표가 확인한 것으로 처리됩니다.",
  ],
  closeArchiveLegend: "장기 문서 보관계약",
  closeArchiveRequest: "신청합니다",
  closeArchiveDecline: "신청하지 않습니다",
  closeArchiveNote:
    "계약서처럼 법령에 따라 보존해야 하는 서류는 별도 보관 계약을 맺은 경우에만 읽기 전용으로 보관됩니다. 신청하지 않으면 대표가 반환받아 직접 보존해야 합니다.",
  closeArchiveRequired: "보관계약 신청 여부를 선택해 주세요.",
  closeConfirmLabel: "위 내용을 확인했고 사무소를 종료합니다.",
  closeConfirmRequired: "종료 확인에 체크해 주세요.",
  closeSubmit: "사무소 종료",
  closeDoneTitle: "사무소가 종료되었습니다",
  closeDone: (expires: string) => `반환 권한 만료일은 ${expires}입니다.`,
  closeArchiveRequested: "보관계약 신청이 접수되었습니다. 운영자 승인 뒤 보관 권한이 발급됩니다.",
  closeReturnLink: "자료 반환 안내",
  ownerOnly: "사무소 종료는 대표만 할 수 있습니다.",
} as const;

const SETTINGS_ERRORS: Record<string, string> = {
  MARKETING_EMAIL_REQUIRED: "이메일을 연결하면 공지·혜택 안내 수신을 선택할 수 있습니다.",
  TERMS_VERSION_CHANGED: "약관 내용이 바뀌었습니다. 바뀐 내용을 확인한 뒤 다시 동의해 주세요.",
  TERMS_WITHDRAWAL_NOT_ALLOWED:
    "이용약관 동의는 철회할 수 없습니다. 이용을 멈추려면 회원 탈퇴를 진행해 주세요.",
  LAST_OWNER:
    "유일한 대표는 사무소를 나갈 수 없습니다. 대표 이전이나 사무소 종료를 먼저 해 주세요.",
  STEP_UP_REQUIRED: "본인 확인이 필요합니다. 확인 후 이어서 진행해 주세요.",
  INVALID_TRANSITION: "현재 상태에서는 이 작업을 할 수 없습니다. 화면을 새로 고쳐 확인해 주세요.",
  FORBIDDEN: "이 작업을 할 권한이 없습니다.",
};

export function describeSettingsError(error: unknown, fallback: string): string {
  for (const code of Object.keys(SETTINGS_ERRORS)) {
    if (isApiCode(error, code)) return SETTINGS_ERRORS[code] ?? fallback;
  }
  return describeAuthError(error, fallback);
}
