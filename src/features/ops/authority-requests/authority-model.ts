import {
  AuthorityRequestListResponseSchema,
  AuthorityRequestResponseSchema,
} from "@/lib/api/contracts/ops.schema";
import type {
  AuthorityRequestListResponse,
  AuthorityRequestResponse,
} from "@/lib/api/contracts/ops.schema";
import type { OpsStatusMap } from "../components/common/ops-status-badge";
import { parsePositiveInt, toSeoulIso } from "../system-common/system-form";

export const AuthorityListSchema = AuthorityRequestListResponseSchema;
export const AuthorityRecordSchema = AuthorityRequestResponseSchema;

export type AuthorityRow = AuthorityRequestListResponse["items"][number];
export type AuthorityRecord = AuthorityRequestResponse;

export const AGENCY_LABELS: Record<string, string> = {
  INVESTIGATION: "수사기관",
  COURT: "법원",
  SUPERVISORY: "감독기관",
  OTHER: "기타",
};

export const AGENCY_OPTIONS = [
  { value: "", label: "기관 종류를 선택해 주세요" },
  ...Object.entries(AGENCY_LABELS).map(([value, label]) => ({ value, label })),
];

export const DECISION_STATUS: OpsStatusMap = {
  PENDING: { label: "결정 전", tone: "amber" },
  PROVIDED: { label: "제공", tone: "blue" },
  PARTIALLY_PROVIDED: { label: "일부 제공", tone: "teal" },
  REFUSED: { label: "거절", tone: "gray" },
  FORWARDED_TO_OFFICE: { label: "사무소 전달", tone: "gray" },
};

export const CLOSE_DECISIONS = ["PROVIDED", "PARTIALLY_PROVIDED", "REFUSED", "FORWARDED_TO_OFFICE"];

export const DECISION_FILTER_OPTIONS = [
  { value: "", label: "전체 결정" },
  ...Object.entries(DECISION_STATUS).map(([value, entry]) => ({ value, label: entry.label })),
];

export const CLOSE_DECISION_OPTIONS = [
  { value: "", label: "제공 결정을 선택해 주세요" },
  ...CLOSE_DECISIONS.map((value) => ({ value, label: DECISION_STATUS[value]?.label ?? value })),
];

export const NOTICE_STATUS: OpsStatusMap = {
  NOT_REVIEWED: { label: "검토 전", tone: "amber" },
  NOTIFIED: { label: "통지함", tone: "green" },
  DEFERRED: { label: "통지 유예", tone: "blue" },
  NOT_ALLOWED: { label: "통지 불가", tone: "gray" },
};

export const NOTICE_OPTIONS = [
  { value: "", label: "통지 검토 결과를 선택해 주세요" },
  ...["NOTIFIED", "DEFERRED", "NOT_ALLOWED"].map((value) => ({
    value,
    label: NOTICE_STATUS[value]?.label ?? value,
  })),
];

export function isProvideDecision(decision: string): boolean {
  return decision === "PROVIDED" || decision === "PARTIALLY_PROVIDED";
}

export const AGENCY_NAME_MAX = 200;
export const DOCUMENT_REF_MAX = 100;

export type AuthorityCreateInput = {
  receivedDate: string;
  receivedTime: string;
  agencyType: string;
  agencyName: string;
  documentReference: string;
  legalBasisNote: string;
  targetOfficeId: string;
  targetUserId: string;
  requestedItems: string;
};

export const EMPTY_AUTHORITY_CREATE: AuthorityCreateInput = {
  receivedDate: "",
  receivedTime: "",
  agencyType: "",
  agencyName: "",
  documentReference: "",
  legalBasisNote: "",
  targetOfficeId: "",
  targetUserId: "",
  requestedItems: "",
};

export type AuthorityCreateErrors = Partial<Record<keyof AuthorityCreateInput, string>>;

export function validateAuthorityCreate(input: AuthorityCreateInput): AuthorityCreateErrors {
  const errors: AuthorityCreateErrors = {};
  if (toSeoulIso(input.receivedDate, input.receivedTime) === null) {
    errors.receivedDate = "요청을 받은 시각을 입력해 주세요.";
  }
  if (!(input.agencyType in AGENCY_LABELS)) errors.agencyType = "기관 종류를 선택해 주세요.";
  const name = input.agencyName.trim();
  if (name === "") errors.agencyName = "기관 이름을 입력해 주세요.";
  else if (name.length > AGENCY_NAME_MAX) {
    errors.agencyName = `기관 이름은 ${AGENCY_NAME_MAX}자 이내로 입력해 주세요.`;
  }
  if (input.documentReference.trim().length > DOCUMENT_REF_MAX) {
    errors.documentReference = `문서 번호는 ${DOCUMENT_REF_MAX}자 이내로 입력해 주세요.`;
  }
  if (input.legalBasisNote.trim() === "") {
    errors.legalBasisNote = "확인한 법적 근거 메모를 입력해 주세요.";
  }
  const office = input.targetOfficeId.trim();
  if (office !== "" && parsePositiveInt(office) === null) {
    errors.targetOfficeId = "대상 사무소 번호는 숫자로 입력해 주세요.";
  }
  const user = input.targetUserId.trim();
  if (user !== "" && parsePositiveInt(user) === null) {
    errors.targetUserId = "대상 회원 번호는 숫자로 입력해 주세요.";
  }
  if (input.requestedItems.trim() === "")
    errors.requestedItems = "요청받은 자료의 범위를 입력해 주세요.";
  return errors;
}

export function toAuthorityCreateBody(input: AuthorityCreateInput) {
  const office = parsePositiveInt(input.targetOfficeId);
  const user = parsePositiveInt(input.targetUserId);
  const reference = input.documentReference.trim();
  return {
    receivedAt: toSeoulIso(input.receivedDate, input.receivedTime) ?? "",
    agencyType: input.agencyType,
    agencyName: input.agencyName.trim(),
    legalBasisNote: input.legalBasisNote.trim(),
    requestedItems: input.requestedItems.trim(),
    ...(reference === "" ? {} : { documentReference: reference }),
    ...(office === null ? {} : { targetOfficeId: office }),
    ...(user === null ? {} : { targetUserId: user }),
  };
}

export type CloseInput = {
  decision: string;
  providedItems: string;
  providedDate: string;
  providedTime: string;
  officeNoticeStatus: string;
  closeNote: string;
};

export const EMPTY_CLOSE_INPUT: CloseInput = {
  decision: "",
  providedItems: "",
  providedDate: "",
  providedTime: "",
  officeNoticeStatus: "",
  closeNote: "",
};

export type CloseErrors = Partial<Record<keyof CloseInput, string>>;

export function validateClose(input: CloseInput): CloseErrors {
  const errors: CloseErrors = {};
  if (!CLOSE_DECISIONS.includes(input.decision)) errors.decision = "제공 결정을 선택해 주세요.";
  if (!(input.officeNoticeStatus in NOTICE_STATUS) || input.officeNoticeStatus === "NOT_REVIEWED") {
    errors.officeNoticeStatus = "사무소 통지 검토 결과를 선택해 주세요.";
  }
  if (isProvideDecision(input.decision)) {
    if (input.providedItems.trim() === "")
      errors.providedItems = "제공한 자료의 범위를 입력해 주세요.";
    if (toSeoulIso(input.providedDate, input.providedTime) === null) {
      errors.providedDate = "제공 시각을 입력해 주세요.";
    }
  }
  return errors;
}

export function toCloseBody(input: CloseInput) {
  const provides = isProvideDecision(input.decision);
  const note = input.closeNote.trim();
  return {
    decision: input.decision,
    officeNoticeStatus: input.officeNoticeStatus,
    ...(provides
      ? {
          providedItems: input.providedItems.trim(),
          providedAt: toSeoulIso(input.providedDate, input.providedTime) ?? "",
        }
      : {}),
    ...(note === "" ? {} : { closeNote: note }),
  };
}

export type CloseAvailability = "OK" | "NO_SECURITY_ADMIN" | "SELF_RECORDED";

export function closeAvailability(
  decision: string,
  input: { isSecurityAdmin: boolean; isSelfRecorded: boolean },
): CloseAvailability {
  if (!isProvideDecision(decision)) return "OK";
  if (!input.isSecurityAdmin) return "NO_SECURITY_ADMIN";
  if (input.isSelfRecorded) return "SELF_RECORDED";
  return "OK";
}
