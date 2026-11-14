import type {
  OpsAnnouncementCreateRequest,
  OpsAnnouncementListResponse,
} from "@/lib/api/contracts/ops.schema";
import type { OpsStatusMap } from "../components/common/ops-status-badge";
import {
  EMPTY_DATE_TIME,
  isPositiveInt,
  toSeoulIso,
  toSeoulParts,
} from "../content-common/seoul-time";
import type { SeoulDateTime } from "../content-common/seoul-time";

export type AnnouncementItem = OpsAnnouncementListResponse["items"][number];

export const ANNOUNCEMENT_STATUS: OpsStatusMap = {
  DRAFT: { label: "초안", tone: "gray" },
  REVIEW: { label: "검토", tone: "amber" },
  SCHEDULED: { label: "예약", tone: "blue" },
  PUBLISHED: { label: "게시 중", tone: "green" },
  ENDED: { label: "종료", tone: "gray" },
};

export const AUDIENCE_OPTIONS = [
  { value: "ALL", label: "전체 사무소" },
  { value: "SUBSCRIPTION_STATUS", label: "구독 상태별" },
  { value: "OFFICE", label: "특정 사무소" },
];

export const SUBSCRIPTION_STATUS_OPTIONS = [
  { value: "TRIAL", label: "체험" },
  { value: "ACTIVE", label: "유료 정상" },
  { value: "PAST_DUE_GRACE", label: "미납 유예" },
  { value: "PAST_DUE_RESTRICTED", label: "미납 제한" },
  { value: "ENDED", label: "종료" },
];

export const IMPORTANCE_OPTIONS = [
  { value: "NORMAL", label: "일반" },
  { value: "IMPORTANT", label: "중요" },
  { value: "CRITICAL", label: "긴급" },
];

export const TITLE_MAX = 100;
export const CONTENT_MAX = 4000;

export const MARKETING_RULE_TEXT =
  "마케팅 공지는 마케팅 수신에 동의하지 않은 대상을 제외하고 보냅니다. 필수 안내는 마케팅 미동의자에게 선택 마케팅 경로로 보내지 않습니다.";

export function audienceLabel(item: AnnouncementItem): string {
  if (item.audienceType === "ALL") return "전체 사무소";
  if (item.audienceType === "OFFICE") return `사무소 ${item.audienceOfficeId ?? "-"}`;
  const status = SUBSCRIPTION_STATUS_OPTIONS.find((option) => option.value === item.audienceStatus);
  return `구독 상태: ${status?.label ?? item.audienceStatus ?? "-"}`;
}

export function importanceLabel(value: string): string {
  return IMPORTANCE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export type AnnouncementForm = {
  title: string;
  content: string;
  audienceType: string;
  audienceStatus: string;
  audienceOfficeId: string;
  startsAt: SeoulDateTime;
  endsAt: SeoulDateTime;
  importance: string;
  detailUrl: string;
  marketing: boolean;
};

export const EMPTY_ANNOUNCEMENT_FORM: AnnouncementForm = {
  title: "",
  content: "",
  audienceType: "ALL",
  audienceStatus: "",
  audienceOfficeId: "",
  startsAt: EMPTY_DATE_TIME,
  endsAt: EMPTY_DATE_TIME,
  importance: "NORMAL",
  detailUrl: "",
  marketing: false,
};

export function formFromAnnouncement(item: AnnouncementItem): AnnouncementForm {
  return {
    title: item.title,
    content: item.content,
    audienceType: item.audienceType,
    audienceStatus: item.audienceStatus ?? "",
    audienceOfficeId: item.audienceOfficeId === null ? "" : String(item.audienceOfficeId),
    startsAt: toSeoulParts(item.startsAt),
    endsAt: toSeoulParts(item.endsAt),
    importance: item.importance,
    detailUrl: item.detailUrl ?? "",
    marketing: item.marketing,
  };
}

export type AnnouncementErrors = Partial<
  Record<
    | "title"
    | "content"
    | "audienceStatus"
    | "audienceOfficeId"
    | "startsAt"
    | "endsAt"
    | "detailUrl",
    string
  >
>;

function isValidDetailUrl(value: string): boolean {
  return /^https:\/\/\S+$/.test(value) || /^\/(?!\/)\S*$/.test(value);
}

export function validateAnnouncementForm(form: AnnouncementForm): AnnouncementErrors {
  const errors: AnnouncementErrors = {};
  if (form.title.trim() === "") errors.title = "제목을 입력해 주세요.";
  else if (form.title.trim().length > TITLE_MAX) {
    errors.title = `제목은 ${TITLE_MAX}자 이내로 입력해 주세요.`;
  }
  if (form.content.trim() === "") errors.content = "본문을 입력해 주세요.";
  else if (form.content.length > CONTENT_MAX) {
    errors.content = `본문은 ${CONTENT_MAX}자 이내로 입력해 주세요.`;
  }
  if (form.audienceType === "SUBSCRIPTION_STATUS" && form.audienceStatus === "") {
    errors.audienceStatus = "대상 구독 상태를 선택해 주세요.";
  }
  if (form.audienceType === "OFFICE" && !isPositiveInt(form.audienceOfficeId)) {
    errors.audienceOfficeId = "대상 사무소 ID를 숫자로 입력해 주세요.";
  }
  const startsAt = toSeoulIso(form.startsAt);
  const endsAt = toSeoulIso(form.endsAt);
  if (startsAt === null) errors.startsAt = "노출 시작 날짜와 시각을 입력해 주세요.";
  if (endsAt === null) errors.endsAt = "노출 종료 날짜와 시각을 입력해 주세요.";
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
    errors.endsAt = "노출 종료는 시작보다 뒤여야 합니다.";
  }
  const url = form.detailUrl.trim();
  if (url !== "" && !isValidDetailUrl(url)) {
    errors.detailUrl = "상세 링크는 https:// 로 시작하거나 / 로 시작하는 경로로 입력해 주세요.";
  }
  return errors;
}

export function toAnnouncementRequest(form: AnnouncementForm): OpsAnnouncementCreateRequest | null {
  const startsAt = toSeoulIso(form.startsAt);
  const endsAt = toSeoulIso(form.endsAt);
  if (startsAt === null || endsAt === null) return null;
  const url = form.detailUrl.trim();
  return {
    title: form.title.trim(),
    content: form.content,
    audienceType: form.audienceType,
    audienceStatus: form.audienceType === "SUBSCRIPTION_STATUS" ? form.audienceStatus : null,
    audienceOfficeId: form.audienceType === "OFFICE" ? Number(form.audienceOfficeId) : null,
    startsAt,
    endsAt,
    importance: form.importance,
    detailUrl: url === "" ? null : url,
    marketing: form.marketing,
  };
}
