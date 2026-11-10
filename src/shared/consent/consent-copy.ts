export const CONSENT_HISTORY_COPY = {
  currentCaption: "현재 동의 상태",
  currentColumns: ["약관", "구분", "상태", "기록 시각", "철회"],
  required: "필수",
  optional: "선택",
  agreed: "동의함",
  notAgreed: "동의하지 않음",
  withdraw: "철회",
  withdrawDone: "동의를 철회했습니다.",
  empty: "동의 내역이 없습니다.",
  reconsentBanner:
    "공지·혜택 안내 수신 동의 내용이 바뀌었습니다. 계속 받으시려면 바뀐 내용을 확인하고 다시 동의해 주세요. 동의하기 전까지 안내를 보내지 않습니다.",
  columns: ["항목", "버전", "상태", "처리 시각", "경로"],
  statuses: { agreed: "동의함", withdrawn: "철회함" },
  paths: [
    "이메일 가입",
    "카카오 가입",
    "내 정보 화면",
    "재동의",
    "수신 거부 링크",
    "이전 기록(경로 미기록)",
  ],
  marketingToggle: {
    label: "이메일로 공지·혜택 안내 받기",
    confirmBeforeOn: "공지·혜택 안내 수신에 동의합니다.",
    onDone: (processedAt: string) => `공지·혜택 안내 수신에 동의했습니다. 처리 시각 ${processedAt}`,
    offDone: (processedAt: string) =>
      `이메일 공지·혜택 안내 수신을 껐습니다. ${processedAt}에 처리되었습니다. 처리 결과를 14일 이내에 이메일로도 알려 드립니다.`,
    requiredWithdrawBlocked:
      "이용약관 동의는 철회할 수 없습니다. 이용을 멈추려면 회원 탈퇴를 진행해 주세요.",
    securityLocked: "계정 보안을 위해 로그인·보안 알림은 끌 수 없습니다.",
    noEmail: "이메일을 연결하면 공지·혜택 안내 수신을 선택할 수 있습니다.",
  },
} as const;
