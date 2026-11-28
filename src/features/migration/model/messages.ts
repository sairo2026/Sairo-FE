import { describeApiError } from "@/shared/lib/error-copy";

export const IMPORT_COPY = {
  uploadTitle: "데이터 이전",
  uploadDescription:
    "예전에 쓰던 엑셀 파일을 올려 고객, 매물, 계약 자료를 옮깁니다. 대표만 할 수 있습니다.",
  quota: (remaining: number, limit: number) =>
    `이번 달 직접 실행 ${remaining}회 남음 (월 ${limit}회)`,
  quotaExhausted: "이번 달 직접 실행 횟수를 모두 사용했습니다. 다음 달에 다시 실행할 수 있습니다.",
  ownerOnly: "데이터 이전은 사무소 대표만 할 수 있습니다.",
  fileRequired: "올릴 파일을 선택해 주세요.",
  targetRequired: "이전할 자료의 종류를 선택해 주세요.",
  extension: "엑셀(XLS, XLSX) 또는 CSV 파일만 올릴 수 있습니다.",
  emptyFile: "내용이 없는 파일입니다. 고객 또는 매물 자료가 들어 있는 파일을 올려 주세요.",
  steps: [
    "파일 올리기",
    "열 연결 확인",
    "미리보기로 점검",
    "이전 실행",
    "결과 확인과 실패한 줄 고치기",
  ],
  fileTips: [
    "첫 줄은 열 이름이어야 하고 둘째 줄부터 자료로 읽습니다. 시트 하나에 최대 1만 줄, 100열까지 올릴 수 있습니다.",
    "CSV는 UTF-8과 엑셀 기본 한글 형식(EUC-KR) 모두 읽습니다. 엑셀 파일은 수식이 아니라 저장된 값만 읽습니다.",
    "이전은 새로 만들거나 이미 이전한 자료와 연결하는 것만 하며 기존 자료를 덮어쓰지 않습니다. 같은 파일을 다시 올려도 이미 이전된 줄은 중복으로 건너뜁니다.",
  ],
  guideColumnNote:
    "열 이름이 달라도 다음 단계에서 직접 연결할 수 있습니다. 연결하지 않은 열은 이전되지 않습니다.",
  guidePickTarget: "이전할 자료를 선택하면 필요한 열과 샘플 파일을 보여 줍니다.",
  tooLarge: "파일 크기는 20MB를 넘을 수 없습니다.",
  uploaded: "파일을 올렸습니다. 매핑을 확인해 주세요.",
  historyTitle: "이전 이력",
  historyEmpty: "아직 올린 이전 파일이 없습니다.",
  managedBySupport:
    "유료 이전 지원 신청에 연결된 파일입니다. 신청이 끝나거나 취소될 때까지 직접 매핑과 실행은 할 수 없고 매핑 제안과 미리보기만 볼 수 있습니다.",
  sheetLabel: "이전할 시트",
  sourceSystemLabel: "원본 시스템 이름",
  sourceSystemRequired: "원본 시스템 이름을 입력해 주세요.",
  requiredFieldMissing: (labels: string) => `${labels} 항목을 한 열에 연결해 주세요.`,
  duplicateTarget: (label: string) =>
    `${label} 항목이 여러 열에 연결되어 있습니다. 한 열만 연결해 주세요.`,
  sourceSystemHint:
    "예: 사용하던 프로그램 이름과 연도. 같은 프로그램에서 나온 파일은 같은 이름으로 써야 이미 이전한 자료를 알아보고 중복으로 만들지 않습니다.",
  mappingRequiredHint:
    "(필수) 표시 항목은 꼭 연결해야 합니다. 원본 번호 열은 선택입니다. 연결하지 않거나 칸이 비어 있으면 사이로가 번호를 붙여 새로 등록합니다.",
  mappingSaved: "매핑을 저장했습니다. 미리보기를 확인해 주세요.",
  noTargetFields: "이 종류는 아직 연결할 수 있는 항목이 없습니다. 고객 또는 매물을 선택해 주세요.",
  previewIntro: "이 단계에서는 아무 데이터도 만들어지지 않습니다.",
  errorRowNotice:
    "오류가 있는 행은 실행할 때 이전되지 않고 실패 건수로 남습니다. 원본 파일을 고쳐 새로 올리거나 실행 후 실패한 줄만 다시 처리할 수 있습니다.",
  executeConfirm: (newCount: number, errors: number, skipped: number) =>
    `${newCount}개 행을 새로 이전합니다. 오류 행 ${errors}개${
      skipped > 0 ? `와 중복으로 제외되는 행 ${skipped}개` : ""
    }는 이전되지 않습니다. 직접 실행은 이번 달 횟수를 사용하며 실행 전 대표의 확인이 필요합니다.`,
  nothingToImport:
    "새로 이전할 행이 없어 실행할 수 없습니다. 모든 행이 오류이거나 이미 사이로에 있는 자료와 겹칩니다. 원본 파일을 확인해 주세요.",
  skippedHint: "중복으로 제외된 행은 새로 만들지 않고 건너뜁니다.",
  skippedReasonsTitle: "제외된 건수의 사유",
  executeStarted: "이전을 시작했습니다. 진행 상태가 자동으로 갱신됩니다.",
  progress: (done: number, total: number) => `${done} / ${total}건 처리`,
  cancelConfirm:
    "실행한 이전을 취소합니다. 외부 연결, 이전 후 수정, 법정 보존 서류가 생긴 항목은 취소되지 않고 남습니다.",
  cancelWindow: (until: string) => `${until}까지 취소할 수 있습니다.`,
  cancelExpired: "취소할 수 있는 기간이 지났습니다.",
  resultHeadline: (total: number, succeeded: number, failed: number, skipped: number) =>
    `전체 ${total}건 중 성공 ${succeeded}건, 실패 ${failed}건, 제외 ${skipped}건입니다.`,
  failedGuide:
    "실패한 줄은 아래에서 원인을 보고 값을 고쳐 저장한 뒤 '실패한 줄만 다시 처리'를 눌러 주세요. 이미 성공한 줄은 다시 만들지 않습니다. 파일에서 고치려면 실패한 줄을 내려받아 고친 뒤 같은 원본 시스템 이름으로 새로 올려 주세요. 이미 이전된 줄은 자동으로 제외됩니다.",
  readyToRetry: "고친 값을 저장했습니다. 위의 '실패한 줄만 다시 처리'를 누르면 이 줄이 이전됩니다.",
  correctionNothing: "바꾼 값이 없습니다. 값을 고친 뒤 저장해 주세요.",
  fixInFile:
    "이 줄은 앱에서 고칠 수 없는 원인입니다. 실패한 줄을 내려받아 파일에서 고친 뒤 새로 올리거나 잠시 뒤 다시 처리해 주세요.",
  noRowsInTab: {
    SUCCEEDED: "성공한 줄이 없습니다.",
    FAILED: "실패한 줄이 없습니다. 모든 줄이 처리됐습니다.",
    SKIPPED: "제외한 줄이 없습니다.",
  },
  retryDone: "실패한 줄을 다시 처리하고 있습니다. 이번 달 실행 횟수는 더 사용하지 않습니다.",
} as const;

export const MIGRATION_ERROR_BY_CODE: Record<string, string> = {
  ENCRYPTED_FILE_REJECTED: "암호가 걸린 파일은 올릴 수 없습니다. 암호를 풀고 다시 올려 주세요.",
  UNSUPPORTED_FILE_TYPE: "엑셀(XLS, XLSX) 또는 CSV 파일만 올릴 수 있습니다.",
  FILE_TOO_LARGE: "파일 크기는 20MB를 넘을 수 없습니다.",
  IMPORT_LIMIT_EXCEEDED: "시트당 1만 행, 100열을 넘는 파일은 올릴 수 없습니다. 나누어 올려 주세요.",
  IMPORT_QUOTA_EXCEEDED:
    "이번 달 직접 실행 횟수를 모두 사용했습니다. 다음 달에 다시 실행할 수 있습니다.",
  IMPORT_MANAGED_BY_SUPPORT: "유료 이전 지원에 연결된 파일이라 직접 매핑과 실행을 할 수 없습니다.",
  IMPORT_NOT_CANCELLABLE: "취소할 수 있는 기간이 지났거나 취소할 수 있는 데이터가 없습니다.",
  IMPORT_BATCH_ALREADY_LINKED: "이미 다른 이전 지원 신청에 연결된 파일입니다.",
  INVALID_TRANSITION:
    "현재 상태에서는 이 작업을 할 수 없습니다. 화면을 새로 고쳐 상태를 확인해 주세요.",
  VERSION_CONFLICT: "다른 곳에서 먼저 바뀌었습니다. 화면을 새로 고친 뒤 다시 시도해 주세요.",
  RESOURCE_NOT_FOUND: "대상을 찾을 수 없습니다. 이전 이력에서 다시 선택해 주세요.",
  STEP_UP_REQUIRED: "본인 확인이 필요합니다. 확인 후 이어서 진행해 주세요.",
  EXPORT_EXPIRED: "내보내기 파일이 만료됐습니다. 다시 내보내기를 요청해 주세요.",
  CHANGE_REQUEST_LIMIT_EXCEEDED: "표준 범위의 수정 요청은 1회까지입니다.",
  PAYMENT_FAILED: "결제가 승인되지 않았습니다. 결제된 금액은 없습니다. 다시 시도해 주세요.",
  PAYMENT_VERIFYING:
    "직전 결제 결과를 확인하고 있습니다. 확인이 끝날 때까지 다시 결제할 수 없습니다.",
};

export function describeMigrationError(error: unknown, fallback: string): string {
  return describeApiError(error, fallback, MIGRATION_ERROR_BY_CODE);
}
