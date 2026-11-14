import { CONSENT_HISTORY_COPY } from "@/shared/consent/consent-copy";

export const SIGNUP_TERMS_COPY = {
  sectionTitle: "약관 동의",
  tosLabel: "만 14세 이상이며 사이로 이용약관에 동의합니다.",
  privacyLabel: "개인정보처리방침을 확인했습니다.",
  marketingLabel: "이메일로 공지·혜택 안내를 받고, 이를 위한 개인정보 수집·이용에 동의합니다.",
  marketingSummary:
    "이메일 주소와 이름을 새 기능·이벤트·혜택 안내 이메일에 씁니다. 문자로는 광고를 보내지 않습니다. 동의를 철회하거나 회원 탈퇴할 때까지 보관합니다. 동의하지 않아도 사이로의 모든 기능을 그대로 쓸 수 있습니다.",
  footerNotice:
    "필수 항목에 동의하지 않으면 계정을 만들 수 없습니다. 선택 항목에 동의하지 않아도 서비스를 이용할 수 있습니다.",
  requiredError: "이용약관에 동의해야 가입할 수 있습니다.",
  noEmailMarketingNotice: "이메일을 연결하면 내 정보에서 공지·혜택 안내 수신을 선택할 수 있습니다.",
  changedBadge: "바뀜",
  versionCaption: (version: string) => `시행 버전 ${version}`,
} as const;

export const PRIVACY_NOTICE_COPY = {
  notice: "회원가입과 서비스 이용에 필요한 정보는 개인정보처리방침에 따라 처리됩니다.",
  linkLabel: "개인정보처리방침 보기",
} as const;

export const PHONE_VERIFICATION_NOTICE =
  "입력한 휴대폰 번호는 계정 소유 확인과 계정 복구에만 사용합니다. 인증번호는 문자로 보내며 5분 안에 입력해 주세요.";

export const PHONE_UNVERIFIED_NOTICE =
  "이메일로 본인을 확인하며 휴대폰 번호는 인증 없이 저장됩니다.";

export const KAKAO_LINK_NOTICE =
  "카카오 계정으로 가입하면 카카오가 제공하는 회원번호가 사이로 계정에 연결됩니다. 사이로는 카카오 비밀번호와 카카오톡 대화 내용에 접근하지 않습니다. 카카오 참고 이메일은 선택 항목이며 입력하지 않아도 가입됩니다. 입력한 참고 이메일은 로그인에 사용되지 않습니다. 사이로의 카카오 연결은 내 계정에서 이메일 로그인 수단을 연결한 뒤 해제할 수 있으며 회원 탈퇴를 하면 사이로가 카카오에 연결 끊기를 함께 요청합니다. 카카오에서 먼저 연결을 끊어도 사이로 계정과 업무 데이터는 삭제되지 않습니다.";

export const KAKAO_EXTRA_INFO_NOTICE =
  "카카오 계정만으로는 가입이 끝나지 않습니다. 이름과 휴대폰 번호 인증을 마쳐야 계정이 만들어집니다.";

export const COLLECTION_TABLE_COPY = {
  title: "개인정보 수집·이용 안내",
  intro:
    "가입과 서비스 이용을 위해 다음 정보를 처리합니다. 아래 표의 처리는 서비스 이용계약의 이행에 필요하며 개인정보처리방침에서 자세히 안내합니다.",
  columns: ["항목", "수집 목적", "보유 기간", "필수 여부"],
  rows: [
    ["이메일", "로그인, 인증 메일, 계정 복구, 보안 알림", "탈퇴 시 삭제", "이메일 가입은 필수"],
    [
      "비밀번호",
      "로그인. 암호화되어 저장되며 회사는 원문을 알 수 없습니다",
      "탈퇴 시 삭제",
      "이메일 가입은 필수",
    ],
    ["이름", "계정 표시, 업무 기록의 담당자 표시", "탈퇴 시 삭제", "필수"],
    ["휴대폰 번호와 인증 시각", "계정 소유 확인, 계정 복구", "탈퇴 시 삭제", "필수"],
    ["카카오 회원번호", "카카오 로그인 연결", "탈퇴 시 삭제", "카카오 가입은 필수"],
    ["카카오 참고 이메일", "안내와 연락의 참고", "탈퇴 시 삭제", "선택"],
    ["로그인 기록", "계정 보호와 부정 이용 방지", "기록한 날부터 1년", "자동 기록"],
    ["약관 동의와 철회 기록", "동의 사실의 확인과 분쟁 대응", "탈퇴한 날부터 3년", "자동 기록"],
  ],
  footer: "동의를 거부할 권리가 있으며 필수 항목을 제공하지 않으면 회원가입이 되지 않습니다.",
} as const;

export const TERMS_CHANGED_COPY = {
  dialogTitle: "약관이 바뀌었습니다",
  notRegistered: "아직 가입되지 않았습니다.",
  body: "가입하시는 동안 약관이 바뀌었습니다. 아직 가입되지 않았습니다. 바뀐 항목을 확인하고 다시 동의해 주세요.",
  keptNotice: "이름과 인증 정보는 그대로 두었습니다.",
  confirmLabel: "바뀐 약관 확인",
} as const;

export const RECONSENT_COPY = {
  title: "사이로 이용약관이 바뀌었습니다",
  body: (effectiveDate: string | null) =>
    `${effectiveDate ? `${effectiveDate}부터 ` : ""}바뀐 약관이 적용됩니다. 주요 변경 내용을 확인하고 동의해 주세요.`,
  changedLink: "바뀐 내용 보기",
  previousLink: "이전 약관 보기",
  footer:
    "동의하지 않으면 서비스를 계속 이용할 수 없습니다. 이용을 멈추려면 회원 탈퇴를 진행해 주세요. 로그아웃, 개인정보 권리 요청, 지원 문의는 동의하지 않아도 할 수 있습니다.",
  requiredError: "새 약관에 동의하셔야 계속 이용할 수 있습니다.",
  marketingBanner: CONSENT_HISTORY_COPY.reconsentBanner,
} as const;

export { CONSENT_HISTORY_COPY };
