export const WITHDRAWAL_COPY = {
  title: "회원 탈퇴",
  paragraphs: [
    "탈퇴하면 즉시 로그인할 수 없고 사무소 데이터에 접근할 수 없습니다. 진행 중인 사무소 신청과 참여 요청은 취소됩니다.",
    "계정에 저장된 이메일, 휴대폰 번호, 이름, 카카오 연결 정보는 삭제 작업에 들어가며 지체 없이 삭제하는 것을 목표로 합니다. 법령에 따라 보관해야 하는 기록은 정해진 기간 동안 분리해 보관한 뒤 삭제합니다.",
    "사무소에서 입력한 고객, 매물, 계약 정보는 사무소의 데이터이므로 탈퇴해도 삭제되지 않습니다. 담당 업무는 대표님에게 넘어가고 과거 담당 기록에는 탈퇴한 구성원으로 표시됩니다.",
    "탈퇴 후에는 복구할 수 없습니다. 다시 이용하려면 새로 가입해야 합니다.",
  ],
  kakao: "카카오 계정 연결도 함께 해제를 요청합니다. 요청이 실패하면 자동으로 다시 시도합니다.",
  retainedTitle: "보관 항목 안내",
  retainedIntro: "탈퇴 후에도 아래 항목은 정해진 이유와 기간 동안 별도로 보관합니다.",
  retainedColumns: ["보관 항목", "보관 이유", "근거 법령", "보관 기간"],
  retainedFooter: "근거를 확인하지 못한 항목은 탈퇴 때 함께 파기되며 이 표에 나오지 않습니다.",
  confirmLabel: "위 내용을 확인했습니다.",
  submit: "탈퇴하기",
  cancel: "취소",
  lastOwner: {
    title: "바로 탈퇴할 수 없습니다",
    body: "대표님이 사무소의 유일한 대표라서 바로 탈퇴할 수 없습니다. 아래 중 하나를 먼저 진행해 주세요.",
    transfer: "다른 구성원에게 대표 이전",
    close: "사무소 종료",
  },
  errors: {
    stepUp: "본인 확인이 필요합니다. 비밀번호 또는 카카오 계정으로 다시 인증해 주세요.",
    failed: "탈퇴 처리 중 문제가 생겨 아무것도 변경되지 않았습니다. 잠시 후 다시 시도해 주세요.",
    confirmRequired: "탈퇴 안내를 확인해 주세요.",
  },
  kakaoLoginNotice:
    "카카오 연결이 해제되어 있었습니다. 같은 카카오 계정으로 다시 인증하면 연결이 복구됩니다.",
  kakaoUnlinkNotice:
    "탈퇴나 로그인수단 해제 때 사이로가 카카오에 연결 끊기를 요청합니다. 요청이 실패하면 1분, 5분, 30분, 2시간, 12시간, 24시간 간격으로 다시 시도하고 그 뒤에는 24시간마다 시도합니다. 요청이 끝나지 않아도 카카오 식별자는 암호화해 최대 7일까지만 보관한 뒤 삭제합니다.",
  kakaoUnlinkConfirm:
    "카카오 로그인 수단을 해제하면 카카오 쪽 연결도 함께 해제를 요청합니다. 마지막 로그인 수단은 해제할 수 없습니다.",
  withdrawnMemberDisplay: "탈퇴한 구성원 {번호}에 법정 신분을 붙입니다.",
  nameDeletionGuide:
    "업무 기록에 남은 내 이름의 삭제를 요청할 수 있습니다. 사무소가 입력한 메모 속 이름은 사무소에서 처리합니다.",
} as const;

const ANCHOR_PHRASE: Record<string, string> = {
  WITHDRAWN_AT: "탈퇴한 날부터",
  RECORDED_AT: "기록한 날부터",
  COMPLETED_AT: "처리 완료 후",
  CLOSED_AT: "문의 종료 후",
  ISSUED_AT: "발급한 날부터",
  ACCESSED_AT: "접속한 날부터",
  APPROVAL_END: "출입승인이 끝난 날부터",
  CONTRACT_END: "계약이 끝난 날부터",
};

export function describeRetentionPeriod(retentionDays: number, anchorEvent: string): string {
  const anchor = ANCHOR_PHRASE[anchorEvent] ?? "기록한 날부터";
  const span = retentionDays % 365 === 0 ? `${retentionDays / 365}년` : `${retentionDays}일`;
  return `${anchor} ${span}`;
}
