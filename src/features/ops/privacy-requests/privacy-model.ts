import {
  OpsArchiveGrantListResponseSchema,
  OpsPrivacyRequestDetailResponseSchema,
  OpsPrivacyRequestListResponseSchema,
  OpsReturnGrantListResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type { OpsPrivacyRequestDetailResponse } from "@/lib/api/contracts/ops.schema";
import type { OpsStatusMap } from "../components/common/ops-status-badge";

export const PrivacyListSchema = OpsPrivacyRequestListResponseSchema;
export const PrivacyDetailSchema = OpsPrivacyRequestDetailResponseSchema;
export type PrivacyDetail = OpsPrivacyRequestDetailResponse;
export const ReturnGrantListSchema = OpsReturnGrantListResponseSchema;
export const ArchiveGrantListSchema = OpsArchiveGrantListResponseSchema;

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  ACCESS: "열람",
  CORRECTION: "정정",
  DELETION: "삭제",
  SUSPENSION: "처리정지",
  WITHDRAWAL: "동의철회",
  PORTABILITY: "이전",
};

export const IDENTITY_STATUS: OpsStatusMap = {
  PENDING: { label: "확인 대기", tone: "amber" },
  VERIFIED: { label: "확인 완료", tone: "green" },
  FAILED: { label: "확인 실패", tone: "red" },
};

export const PRIVACY_STATUS: OpsStatusMap = {
  RECEIVED: { label: "접수", tone: "blue" },
  FORWARDED: { label: "전달됨", tone: "teal" },
  WAITING_FOR_INFO: { label: "보완 대기", tone: "amber" },
  REVIEWING: { label: "검토 중", tone: "blue" },
  APPROVED: { label: "승인", tone: "green" },
  PARTIALLY_RESTRICTED: { label: "일부 제한", tone: "amber" },
  EXECUTING: { label: "실행 중", tone: "teal" },
  COMPLETED: { label: "완료", tone: "green" },
  REJECTED: { label: "거절", tone: "red" },
};

export const DUE_STATE: OpsStatusMap = {
  ON_TRACK: { label: "정상", tone: "green" },
  APPROACHING: { label: "기한 임박", tone: "amber" },
  OVERDUE: { label: "법정 기한 초과", tone: "red" },
};

export const DUE_STATE_HELP =
  "기한 임박은 내부 목표 기한이 지나고 법정 기한 전인 상태이고, 법정 기한 초과는 법정 기한이 지난 상태입니다. 보완 대기로 기한이 정지되지 않습니다.";

export const REQUEST_TYPE_OPTIONS = [
  { value: "", label: "전체" },
  ...Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

export const STATUS_OPTIONS = [
  { value: "", label: "전체" },
  ...Object.entries(PRIVACY_STATUS).map(([value, entry]) => ({ value, label: entry.label })),
];

export const TERMINAL_STATUSES: readonly string[] = ["COMPLETED", "REJECTED"];

export type ProcessAction =
  | "FORWARD"
  | "REQUEST_COOPERATION"
  | "REQUEST_SUPPLEMENT"
  | "APPROVE"
  | "RESTRICT"
  | "REJECT"
  | "EXECUTE"
  | "COMPLETE";

export const ACTION_LABELS: Record<ProcessAction, string> = {
  FORWARD: "책임 사무소에 전달",
  REQUEST_COOPERATION: "협조 요청",
  REQUEST_SUPPLEMENT: "요청자에게 보완 요청",
  APPROVE: "승인",
  RESTRICT: "일부 제한",
  REJECT: "거절",
  EXECUTE: "실행 시작",
  COMPLETE: "완료 처리",
};

const DECISION_FROM: readonly string[] = ["RECEIVED", "REVIEWING"];

const ALLOWED_FROM: Record<ProcessAction, readonly string[] | null> = {
  FORWARD: null,
  REQUEST_COOPERATION: null,
  REQUEST_SUPPLEMENT: null,
  APPROVE: DECISION_FROM,
  RESTRICT: DECISION_FROM,
  REJECT: DECISION_FROM,
  EXECUTE: ["APPROVED", "PARTIALLY_RESTRICTED"],
  COMPLETE: ["RECEIVED", "REVIEWING", "EXECUTING"],
};

export const NEEDS_IDENTITY: readonly ProcessAction[] = ["APPROVE", "RESTRICT"];
export const NEEDS_NOTE: readonly ProcessAction[] = ["RESTRICT", "REJECT"];
export const NEEDS_EVIDENCE: readonly ProcessAction[] = ["COMPLETE"];
export const CONFIRM_ACTIONS: readonly ProcessAction[] = ["REJECT", "COMPLETE"];

export const PROCESS_ACTIONS = Object.keys(ACTION_LABELS) as ProcessAction[];

export function isActionAvailable(action: ProcessAction, status: string): boolean {
  if (TERMINAL_STATUSES.includes(status)) return false;
  const allowed = ALLOWED_FROM[action];
  return allowed === null || allowed.includes(status);
}

export type ProcessUnavailable = "status" | "identity" | null;

export function unavailableReason(
  action: ProcessAction,
  status: string,
  identityStatus: string,
): ProcessUnavailable {
  if (!isActionAvailable(action, status)) return "status";
  if (NEEDS_IDENTITY.includes(action) && identityStatus !== "VERIFIED") return "identity";
  return null;
}

export const NOTE_MAX_LENGTH = 1000;
export const EVIDENCE_MAX_LENGTH = 200;

export function validateProcess(
  action: ProcessAction,
  note: string,
  evidence: string,
): { note?: string; evidence?: string } {
  const errors: { note?: string; evidence?: string } = {};
  if (NEEDS_NOTE.includes(action) && note.trim() === "") {
    errors.note = "결정 사유를 입력해 주세요. 요청자에게 안내되는 문구입니다.";
  }
  if (note.length > NOTE_MAX_LENGTH) {
    errors.note = `${NOTE_MAX_LENGTH}자 이하로 입력해 주세요.`;
  }
  if (NEEDS_EVIDENCE.includes(action) && evidence.trim() === "") {
    errors.evidence = "완료 증빙 위치를 입력해 주세요.";
  }
  if (evidence.length > EVIDENCE_MAX_LENGTH) {
    errors.evidence = `${EVIDENCE_MAX_LENGTH}자 이하로 입력해 주세요.`;
  }
  return errors;
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  RECEIVE: "접수",
  FORWARD: "전달",
  REQUEST_COOPERATION: "협조 요청",
  REQUEST_SUPPLEMENT: "보완 요청",
  APPROVE: "승인",
  RESTRICT: "일부 제한",
  REJECT: "거절",
  EXECUTE: "실행",
  COMPLETE: "완료",
};

export type GrantKind = "return" | "archive";

export type TransferInput = {
  newGranteeUserId: string;
  identityEvidenceReference: string;
  registrationRelationReference: string;
  contractReference: string;
};

export type TransferErrors = Partial<Record<keyof TransferInput, string>>;

export function validateTransfer(kind: GrantKind, input: TransferInput): TransferErrors {
  const errors: TransferErrors = {};
  const userId = input.newGranteeUserId.trim();
  if (userId === "") errors.newGranteeUserId = "새 권한자의 회원 번호를 입력해 주세요.";
  else if (!/^[1-9]\d*$/.test(userId))
    errors.newGranteeUserId = "회원 번호는 숫자로 입력해 주세요.";
  if (input.identityEvidenceReference.trim() === "") {
    errors.identityEvidenceReference = "본인확인 증빙 참조를 입력해 주세요.";
  }
  if (input.registrationRelationReference.trim() === "") {
    errors.registrationRelationReference = "등록관계 증빙 참조를 입력해 주세요.";
  }
  if (kind === "archive" && input.contractReference.trim() === "") {
    errors.contractReference = "새 보관계약 참조를 입력해 주세요.";
  }
  return errors;
}

export function grantStatus(
  kind: GrantKind,
  row: { expiresAt: string | null; revokedAt?: string | null; terminatedAt?: string | null },
  now: number,
): "ACTIVE" | "ENDED" | "EXPIRED" {
  if (kind === "return" ? row.revokedAt : row.terminatedAt) return "ENDED";
  if (row.expiresAt && Date.parse(row.expiresAt) <= now) return "EXPIRED";
  return "ACTIVE";
}

export const GRANT_STATUS: OpsStatusMap = {
  ACTIVE: { label: "유효", tone: "green" },
  ENDED: { label: "종료", tone: "gray" },
  EXPIRED: { label: "만료", tone: "amber" },
};
