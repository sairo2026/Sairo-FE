export const SUPPORT_REQUEST_COPY = {
  title: "유료 이전 지원",
  description:
    "직접 하기 어려우면 올린 이전 파일의 정리와 매핑을 맡길 수 있습니다. 대표만 신청할 수 있습니다.",
  applyTitle: "이전 지원 신청",
  noEligible: "신청할 수 있는 이전 파일이 없습니다. 먼저 이전 파일을 올려 주세요.",
  fileLabel: "신청할 이전 파일",
  filePlaceholder: "이전 파일을 선택해 주세요",
  fileRequired: "신청할 이전 파일을 선택해 주세요.",
  sourceSystemRequired: "원본 시스템 이름을 입력해 주세요.",
  rowCountInvalid: "예상 레코드 수를 1 이상의 숫자로 입력해 주세요.",
  standardScope: "표준 범위는 원본 시스템 1종, 최대 5만 레코드, 수정 요청 1회입니다.",
  listTitle: "내 이전 지원 신청",
  listEmpty: "접수한 이전 지원 신청이 없습니다.",
  statusFilter: "상태",
  allStatuses: "전체 상태",
  applied: "이전 지원을 신청했습니다. 견적이 도착하면 이 화면에서 확인할 수 있습니다.",
  requestedWait: "운영팀이 견적을 준비하고 있습니다. 견적이 도착하면 이메일로 알려 드립니다.",
  quoteTitle: "견적",
  quoteStandard:
    "표준 범위 원본 시스템 1종, 최대 5만 레코드, 수정 요청 1회, 결제 후 5영업일 납품 목표",
  quoteVat: "금액은 부가가치세를 포함합니다.",
  acceptQuote: "견적 수락하고 결제",
  acceptedWait: "견적을 수락했습니다. 결제를 마치면 처리가 시작됩니다.",
  payNow: "결제하기",
  paymentPreparing: "결제 기능을 준비하고 있습니다. 준비가 끝나면 이 화면에서 결제할 수 있습니다.",
  paymentOpenFailed: "결제창을 열지 못했습니다. 잠시 뒤에 다시 시도해 주세요.",
  paidWait:
    "결제가 확인되었습니다. 이전담당이 처리를 시작하면 이 화면에서 진행 상황을 볼 수 있습니다. 결제 후에는 대표가 신청을 취소할 수 없습니다.",
  processing: (name: string | null | undefined) =>
    `${name ? `${name} 담당이` : "이전담당이"} 자료를 정리하고 매핑하고 있습니다. 대표 검수 단계에서 알려 드립니다.`,
  changeInProgress: (reason: string) =>
    `요청하신 수정 내용을 반영하고 있습니다. 요청 사유: ${reason}`,
  reviewTitle: "매핑 검수",
  reviewIntro:
    "제출된 열 대응과 미리보기 요약을 확인해 승인하거나 수정을 요청해 주세요. 승인한 매핑 버전으로만 실행됩니다.",
  approve: "승인",
  approveConfirm: (version: number) =>
    `매핑 버전 ${version}을 승인합니다. 승인한 뒤에는 매핑을 바꿀 수 없고 이 버전으로만 실행됩니다.`,
  requestChanges: "수정 요청",
  changeLimit: "표준 범위의 수정 요청 1회를 이미 사용했습니다.",
  changeReason: "수정을 요청하는 내용",
  changeReasonRequired: "수정을 요청하는 내용을 입력해 주세요.",
  rowPreviewLink: "행 단위 미리보기 보기",
  approvedNotice: (version: number | null | undefined) =>
    `매핑 버전 ${version ?? "-"}을 승인했습니다. 승인한 뒤에는 매핑을 바꿀 수 없습니다.`,
  deliveredNotice: "이전이 완료되어 납품되었습니다.",
  cancelButton: "신청 취소",
  cancelConfirm:
    "신청을 취소합니다. 취소하면 바로 직접 매핑과 실행을 할 수 있습니다. 결제 후에는 취소할 수 없습니다.",
  cancelReason: "취소 사유 (선택)",
  paidCannotCancel: "결제 후에는 대표가 취소할 수 없습니다.",
  cancelledNotice:
    "신청이 취소되었습니다. 이 파일은 다시 직접 매핑하고 실행할 수 있고 새로 신청할 수도 있습니다.",
  rejectedNotice: (reason: string | null | undefined) =>
    `신청이 거절되었습니다.${reason ? ` 사유: ${reason}` : ""} 이 파일은 다시 직접 매핑하고 실행할 수 있습니다.`,
  directWork: "직접 작업",
  directWorkAllowed: "직접 작업 가능",
  directWorkBlocked: "직접 작업 불가",
  paymentResultTitle: "결제 확인",
  paymentConfirming: "결제 결과를 확인하고 있습니다. 창을 닫거나 다시 누르지 마세요.",
  paymentDone: "결제가 확인되었습니다. 이전담당이 처리를 시작합니다.",
  paymentFailedTitle: "결제가 완료되지 않았습니다",
  paymentCanceled:
    "결제가 취소되었거나 완료되지 않았습니다. 결제된 금액은 없습니다. 신청 화면에서 다시 시도해 주세요.",
  paymentMissing: "결제 확인에 필요한 정보가 없습니다. 신청 화면에서 다시 시도해 주세요.",
  backToRequest: "신청 보기",
} as const;

export const EXPORT_COPY = {
  title: "데이터 내보내기",
  description: "사이로에 있는 데이터를 파일로 내려받습니다.",
  createTitle: "내보내기 만들기",
  scopeLabel: "내보낼 범위",
  scopeFull: "전체 자료와 첨부 (대표 전용, 본인 확인 필요)",
  scopeTables: "표 선택",
  tablesLabel: "내보낼 표",
  tablesRequired: "내보낼 표를 하나 이상 선택해 주세요.",
  noAllowedTables:
    "대표가 허용한 표가 없어 내려받을 수 있는 데이터가 없습니다. 대표에게 허용을 요청해 주세요.",
  submit: "내보내기 만들기",
  creating: "내보내기를 만들고 있습니다. 완료되면 이 화면에서 내려받을 수 있습니다.",
  completed: "내보내기가 완료되었습니다.",
  download: "파일 내려받기",
  downloadNote: "이 주소는 10분 뒤 만료됩니다. 만료되면 이력에서 새 주소를 받을 수 있습니다.",
  failed: (reason: string | null | undefined) =>
    `내보내기를 만들지 못했습니다.${reason ? ` ${reason}` : ""} 다시 만들어 주세요.`,
  expired: "내보내기 파일이 만료되어 삭제되었습니다. 다시 만들어 주세요.",
  fileExpires: (at: string) => `파일은 ${at}에 삭제됩니다.`,
  historyTitle: "최근 내보내기",
  historyEmpty: "최근 24시간 안에 만든 내보내기가 없습니다.",
  historyNote: "파일은 24시간 뒤 삭제되므로 이력에는 삭제 전 파일만 보입니다.",
  openLink: "내려받기 주소 받기",
  policyTitle: "소속공인중개사에게 허용할 표",
  policyIntro:
    "선택한 표만 소속공인중개사가 내려받을 수 있습니다. 저장하면 선택한 목록이 허용 목록 전체를 대신합니다.",
  policySave: "허용 목록 저장",
  policySaved: (labels: string) => `허용 목록을 저장했습니다. 현재 허용: ${labels || "없음"}`,
  returnGuide: "소속이 해제된 뒤에는 자료 반환 안내에서 내려받을 수 있습니다.",
  scopeFullLabel: "전체",
  scopeTablesLabel: "표",
} as const;
