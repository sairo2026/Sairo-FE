import type {
  OpsPolicyDocumentCreateRequest,
  OpsPolicyDocumentListResponse,
} from "@/lib/api/contracts/ops.schema";
import { ApiError } from "@/shared/api/client";
import type { OpsStatusMap } from "../components/common/ops-status-badge";
import { describeContentError } from "../content-common/content-error";
import { EMPTY_DATE_TIME, toSeoulIso } from "../content-common/seoul-time";
import type { SeoulDateTime } from "../content-common/seoul-time";

export type PolicyDocumentItem = OpsPolicyDocumentListResponse["items"][number];

export const DOC_TYPE_LABELS: Record<string, string> = {
  TERMS: "이용약관",
  PRIVACY: "개인정보처리방침",
  PROCESSING_OUTSOURCING: "처리위탁 조건",
  ARCHIVE: "보관 조건",
  REFUND: "환불 안내",
  SUBPROCESSORS: "수탁업무 목록",
  PRICING: "요금표",
};

export const DOC_TYPE_OPTIONS = Object.entries(DOC_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const POLICY_STATUS: OpsStatusMap = {
  DRAFT: { label: "초안", tone: "gray" },
  REVIEW: { label: "검토", tone: "amber" },
  SCHEDULED: { label: "예약", tone: "blue" },
  PUBLISHED: { label: "게시", tone: "green" },
  ENDED: { label: "종료", tone: "gray" },
};

export const PRICING_NOTICE_TEXT =
  "요금 변경 문서는 시행 30일 전까지만 게시하거나 예약할 수 있습니다. 시행까지 30일 미만이면 게시할 수 없습니다.";

export const NO_OVERWRITE_TEXT =
  "게시한 문서는 덮어쓰지 않습니다. 내용을 바꾸려면 새 버전을 등록해 주세요.";

export const VERSION_MAX = 40;
export const SUMMARY_MAX = 1000;

export type PolicyForm = {
  docType: string;
  version: string;
  body: string;
  changeSummary: string;
  noticeAt: SeoulDateTime;
  requiresConsent: boolean;
  effectiveAt: SeoulDateTime;
};

export const EMPTY_POLICY_FORM: PolicyForm = {
  docType: "TERMS",
  version: "",
  body: "",
  changeSummary: "",
  noticeAt: EMPTY_DATE_TIME,
  requiresConsent: false,
  effectiveAt: EMPTY_DATE_TIME,
};

export type PolicyErrors = Partial<
  Record<"version" | "body" | "changeSummary" | "noticeAt" | "effectiveAt", string>
>;

export function validatePolicyForm(form: PolicyForm): PolicyErrors {
  const errors: PolicyErrors = {};
  const version = form.version.trim();
  if (version === "") errors.version = "버전을 입력해 주세요.";
  else if (version.length > VERSION_MAX) {
    errors.version = `버전은 ${VERSION_MAX}자 이내로 입력해 주세요.`;
  }
  if (form.body.trim() === "") errors.body = "본문을 입력해 주세요.";
  if (form.changeSummary.trim() === "") errors.changeSummary = "변경 요약을 입력해 주세요.";
  else if (form.changeSummary.length > SUMMARY_MAX) {
    errors.changeSummary = `변경 요약은 ${SUMMARY_MAX}자 이내로 입력해 주세요.`;
  }
  const noticeAt = toSeoulIso(form.noticeAt);
  const effectiveAt = toSeoulIso(form.effectiveAt);
  if (noticeAt === null) errors.noticeAt = "공지일 날짜와 시각을 입력해 주세요.";
  if (effectiveAt === null) errors.effectiveAt = "시행일 날짜와 시각을 입력해 주세요.";
  if (noticeAt && effectiveAt && Date.parse(noticeAt) > Date.parse(effectiveAt)) {
    errors.noticeAt = "공지일은 시행일보다 늦을 수 없습니다.";
  }
  return errors;
}

export function toPolicyRequest(form: PolicyForm): OpsPolicyDocumentCreateRequest | null {
  const noticeAt = toSeoulIso(form.noticeAt);
  const effectiveAt = toSeoulIso(form.effectiveAt);
  if (noticeAt === null || effectiveAt === null) return null;
  return {
    docType: form.docType,
    version: form.version.trim(),
    body: form.body,
    changeSummary: form.changeSummary.trim(),
    noticeAt,
    requiresConsent: form.requiresConsent,
    effectiveAt,
  };
}

export function describePolicyPublishError(error: unknown): string {
  if (error instanceof ApiError && error.status === 400) {
    return "요금 변경 문서는 시행 30일 전까지만 게시하거나 예약할 수 있습니다. 시행일과 공지일을 확인해 주세요.";
  }
  if (error instanceof ApiError && error.code === "INVALID_TRANSITION") {
    return "검토 단계의 문서만 게시할 수 있습니다. 화면을 새로 고쳐 상태를 확인해 주세요.";
  }
  return describeContentError(error, "문서를 게시하지 못했습니다.");
}
