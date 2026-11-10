import type {
  OpsTrialEventCreateRequest,
  OpsTrialEventListResponse,
} from "@/lib/api/contracts/ops.schema";
import { ApiError } from "@/shared/api/client";
import type { OpsStatusMap } from "../components/common/ops-status-badge";
import { describeContentError } from "../content-common/content-error";
import { EMPTY_DATE_TIME, isPositiveInt, toSeoulIso } from "../content-common/seoul-time";
import type { SeoulDateTime } from "../content-common/seoul-time";

export type TrialEventItem = OpsTrialEventListResponse["items"][number];

export const TRIAL_STATUS: OpsStatusMap = {
  DRAFT: { label: "초안", tone: "gray" },
  REVIEW: { label: "승인 대기", tone: "amber" },
  SCHEDULED: { label: "예약", tone: "blue" },
  ACTIVE: { label: "진행 중", tone: "green" },
  ENDED: { label: "종료", tone: "gray" },
};

export const AUDIENCE_LABELS: Record<string, string> = {
  GENERAL: "일반",
  START_CUSTOMER: "시작 고객",
};

export const AUDIENCE_OPTIONS = [
  { value: "GENERAL", label: "일반" },
  { value: "START_CUSTOMER", label: "시작 고객" },
];

export const FREE_END_MODE_LABELS: Record<string, string> = {
  DURATION: "기간 방식",
  FIXED_END: "고정 종료 시각",
};

export const FREE_END_MODE_OPTIONS = [
  { value: "DURATION", label: "기간 방식" },
  { value: "FIXED_END", label: "고정 종료 시각" },
];

export const NAME_MAX = 100;

export const TRIAL_RULE_TEXTS = [
  "시작 시각은 포함하고 종료 시각은 제외하며 모두 서울 시간 기준입니다.",
  "기간 방식 체험은 60×24시간을 유지합니다. 이벤트를 종료해도 이미 부여된 체험은 취소하지 않습니다.",
  "같은 대상의 활성·예약 상태 일반 이벤트와 가입 창이 겹치면 저장할 수 없습니다.",
  "작성자와 다른 운영담당이 승인해야 이벤트가 예약되거나 시작됩니다.",
];

export const STOP_NOTICE_TEXT =
  "이벤트를 중단해도 이미 부여한 체험은 소급해서 바꾸지 않습니다. 중단 기록은 감사 로그에 남고 되돌릴 수 없습니다.";

export type TrialForm = {
  name: string;
  audience: string;
  startsAt: SeoulDateTime;
  endsAt: SeoulDateTime;
  officeCreatedDuring: boolean;
  firstApplicationDuring: boolean;
  freeEndMode: string;
  fixedFreeEndsAt: SeoulDateTime;
  maxOffices: string;
};

export const EMPTY_TRIAL_FORM: TrialForm = {
  name: "",
  audience: "GENERAL",
  startsAt: EMPTY_DATE_TIME,
  endsAt: EMPTY_DATE_TIME,
  officeCreatedDuring: true,
  firstApplicationDuring: true,
  freeEndMode: "DURATION",
  fixedFreeEndsAt: EMPTY_DATE_TIME,
  maxOffices: "",
};

export type TrialErrors = Partial<
  Record<"name" | "startsAt" | "endsAt" | "fixedFreeEndsAt" | "maxOffices", string>
>;

export function validateTrialForm(form: TrialForm): TrialErrors {
  const errors: TrialErrors = {};
  const name = form.name.trim();
  if (name === "") errors.name = "이벤트명을 입력해 주세요.";
  else if (name.length > NAME_MAX) errors.name = `이벤트명은 ${NAME_MAX}자 이내로 입력해 주세요.`;
  const startsAt = toSeoulIso(form.startsAt);
  const endsAt = toSeoulIso(form.endsAt);
  if (startsAt === null) errors.startsAt = "시작 날짜와 시각을 입력해 주세요.";
  if (endsAt === null) errors.endsAt = "종료 날짜와 시각을 입력해 주세요.";
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
    errors.endsAt = "종료 시각은 시작 시각보다 뒤여야 합니다.";
  }
  if (form.freeEndMode === "FIXED_END") {
    const fixed = toSeoulIso(form.fixedFreeEndsAt);
    if (fixed === null) errors.fixedFreeEndsAt = "고정 무료 종료 날짜와 시각을 입력해 주세요.";
    else if (endsAt && Date.parse(fixed) < Date.parse(endsAt)) {
      errors.fixedFreeEndsAt = "고정 무료 종료 시각은 이벤트 종료 시각 이후여야 합니다.";
    }
  }
  if (form.audience === "START_CUSTOMER" && !isPositiveInt(form.maxOffices)) {
    errors.maxOffices = "시작 고객 이벤트의 승인 사무소 상한을 1 이상의 숫자로 입력해 주세요.";
  }
  return errors;
}

export function toTrialRequest(form: TrialForm): OpsTrialEventCreateRequest | null {
  const startsAt = toSeoulIso(form.startsAt);
  const endsAt = toSeoulIso(form.endsAt);
  if (startsAt === null || endsAt === null) return null;
  const isFixed = form.freeEndMode === "FIXED_END";
  const fixed = isFixed ? toSeoulIso(form.fixedFreeEndsAt) : null;
  if (isFixed && fixed === null) return null;
  return {
    name: form.name.trim(),
    startsAt,
    endsAt,
    officeCreatedDuring: form.officeCreatedDuring,
    firstApplicationDuring: form.firstApplicationDuring,
    freeEndMode: isFixed ? "FIXED_END" : "DURATION",
    fixedFreeEndsAt: fixed,
    audience: form.audience === "START_CUSTOMER" ? "START_CUSTOMER" : "GENERAL",
    maxOffices: form.audience === "START_CUSTOMER" ? Number(form.maxOffices) : null,
  };
}

export function describeTrialError(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.code === "SELF_APPROVAL_FORBIDDEN") {
    return "작성자 본인은 승인할 수 없습니다. 다른 운영담당이 승인해 주세요.";
  }
  if (error instanceof ApiError && error.code === "TRIAL_EVENT_WINDOW_OVERLAP") {
    return "같은 대상의 활성·예약 상태 일반 이벤트와 가입 창이 겹쳐 저장할 수 없습니다. 기간을 조정해 주세요.";
  }
  return describeContentError(error, fallback);
}
