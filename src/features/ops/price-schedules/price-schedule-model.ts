import type {
  OpsPriceScheduleCreateRequest,
  OpsPriceScheduleListResponse,
} from "@/lib/api/contracts/ops.schema";
import { ApiError } from "@/shared/api/client";
import type { OpsStatusMap } from "../components/common/ops-status-badge";
import { describeContentError } from "../content-common/content-error";
import {
  EMPTY_DATE_TIME,
  isAtLeastDaysBefore,
  isFutureIso,
  toSeoulIso,
} from "../content-common/seoul-time";
import type { SeoulDateTime } from "../content-common/seoul-time";

export type PriceScheduleItem = OpsPriceScheduleListResponse["items"][number];

export const PRICE_STATUS: OpsStatusMap = {
  DRAFT: { label: "초안", tone: "gray" },
  REVIEW: { label: "검토", tone: "amber" },
  SCHEDULED: { label: "예약", tone: "blue" },
  ACTIVE: { label: "시행 중", tone: "green" },
  ENDED: { label: "종료", tone: "gray" },
};

export const PRICE_AUDIENCE_LABELS: Record<string, string> = {
  STANDARD: "표준",
  START_CUSTOMER: "시작 고객",
};

export const PRICE_AUDIENCE_OPTIONS = [
  { value: "STANDARD", label: "표준" },
  { value: "START_CUSTOMER", label: "시작 고객" },
];

export const NOTICE_DAYS = 30;

export const PRICE_RULE_TEXTS = [
  "표시 금액은 모두 부가가치세를 포함한 월 금액입니다.",
  "버전은 저장할 때 서버가 부여하며 저장한 버전은 바꿀 수 없습니다.",
  "공지 시각은 시행 시각의 30일 전 이전이어야 합니다.",
  "작성자와 다른 결제담당이 승인해야 요금표가 예약되거나 시행됩니다.",
];

export function monthlyAmount(
  members: number,
  prices: { soloAmount: number; teamFirstExtra: number; teamAfterFourExtra: number },
): number {
  if (members <= 1) return prices.soloAmount;
  if (members <= 4) return prices.soloAmount + (members - 1) * prices.teamFirstExtra;
  return prices.soloAmount + 3 * prices.teamFirstExtra + (members - 4) * prices.teamAfterFourExtra;
}

export const SAMPLE_MEMBER_COUNTS = [1, 2, 4, 5, 10];

export type PriceForm = {
  audience: string;
  soloAmount: string;
  teamFirstExtra: string;
  teamAfterFourExtra: string;
  effectiveAt: SeoulDateTime;
  noticeAt: SeoulDateTime;
};

export const EMPTY_PRICE_FORM: PriceForm = {
  audience: "STANDARD",
  soloAmount: "",
  teamFirstExtra: "",
  teamAfterFourExtra: "",
  effectiveAt: EMPTY_DATE_TIME,
  noticeAt: EMPTY_DATE_TIME,
};

export type PriceErrors = Partial<
  Record<
    "soloAmount" | "teamFirstExtra" | "teamAfterFourExtra" | "effectiveAt" | "noticeAt",
    string
  >
>;

const MAX_AMOUNT = 10_000_000;

export function validatePriceForm(form: PriceForm): PriceErrors {
  const errors: PriceErrors = {};
  const solo = form.soloAmount === "" ? NaN : Number(form.soloAmount);
  if (!Number.isInteger(solo) || solo < 1 || solo > MAX_AMOUNT) {
    errors.soloAmount = "Solo 기준액을 1원 이상의 숫자로 입력해 주세요.";
  }
  const first = form.teamFirstExtra === "" ? NaN : Number(form.teamFirstExtra);
  if (!Number.isInteger(first) || first < 0 || first > MAX_AMOUNT) {
    errors.teamFirstExtra = "2~4인 추가액을 0원 이상의 숫자로 입력해 주세요.";
  }
  const after = form.teamAfterFourExtra === "" ? NaN : Number(form.teamAfterFourExtra);
  if (!Number.isInteger(after) || after < 0 || after > MAX_AMOUNT) {
    errors.teamAfterFourExtra = "5인 이상 추가액을 0원 이상의 숫자로 입력해 주세요.";
  }
  const effectiveAt = toSeoulIso(form.effectiveAt);
  const noticeAt = toSeoulIso(form.noticeAt);
  if (effectiveAt === null) errors.effectiveAt = "효력일 날짜와 시각을 입력해 주세요.";
  else if (!isFutureIso(effectiveAt)) errors.effectiveAt = "효력일은 현재 이후여야 합니다.";
  if (noticeAt === null) errors.noticeAt = "안내 날짜와 시각을 입력해 주세요.";
  else if (effectiveAt && !isAtLeastDaysBefore(noticeAt, effectiveAt, NOTICE_DAYS)) {
    errors.noticeAt = `안내 시각은 효력 시각의 ${NOTICE_DAYS}일 전 이전이어야 합니다.`;
  }
  return errors;
}

export function toPriceRequest(form: PriceForm): OpsPriceScheduleCreateRequest | null {
  const effectiveAt = toSeoulIso(form.effectiveAt);
  const noticeAt = toSeoulIso(form.noticeAt);
  if (effectiveAt === null || noticeAt === null) return null;
  return {
    soloAmount: Number(form.soloAmount),
    teamFirstExtra: Number(form.teamFirstExtra),
    teamAfterFourExtra: Number(form.teamAfterFourExtra),
    effectiveAt,
    noticeAt,
    audience: form.audience === "START_CUSTOMER" ? "START_CUSTOMER" : "STANDARD",
  };
}

export function describePriceScheduleError(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.code === "SELF_APPROVAL_FORBIDDEN") {
    return "작성자 본인은 승인할 수 없습니다. 다른 결제담당이 승인해 주세요.";
  }
  return describeContentError(error, fallback);
}
