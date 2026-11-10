import type { OpsHomeResponse } from "@/lib/api/contracts/ops.schema";
import type { OpsRole } from "../../model/roles";

export type HomeQueueCard = {
  key: string;
  label: string;
  href: string;
  roles: readonly OpsRole[];
  count: (home: OpsHomeResponse) => number;
  note?: (home: OpsHomeResponse) => string | null;
  isUrgent?: boolean;
};

export const HOME_QUEUE_CARDS: readonly HomeQueueCard[] = [
  {
    key: "review",
    label: "심사 대기",
    href: "/ops/registrations",
    roles: ["REVIEW"],
    count: (home) => home.pendingReviewCount,
    note: (home) => `기한 초과 ${home.overdueReviewCount}건`,
  },
  {
    key: "inquiry",
    label: "미배정 문의",
    href: "/ops/inquiries",
    roles: ["SUPPORT"],
    count: (home) => home.unassignedInquiryCount,
  },
  {
    key: "payment",
    label: "결제 확인 중",
    href: "/ops/billing",
    roles: ["BILLING"],
    count: (home) => home.paymentPendingCount,
  },
  {
    key: "refund",
    label: "환불 실패",
    href: "/ops/billing/refunds",
    roles: ["BILLING"],
    count: (home) => home.refundFailedCount,
    isUrgent: true,
  },
  {
    key: "migration",
    label: "이전 검수 대기",
    href: "/ops/import-support",
    roles: ["MIGRATION"],
    count: (home) => home.migrationReviewPendingCount,
  },
  {
    key: "privacy",
    label: "권리요청 기한 임박",
    href: "/ops/privacy-requests",
    roles: ["PRIVACY"],
    count: (home) => home.privacyDeadlineApproachingCount,
    isUrgent: true,
  },
  {
    key: "deletion",
    label: "파기 실패",
    href: "/ops/deletion-queue",
    roles: ["PRIVACY"],
    count: (home) => home.deletionFailedCount,
    isUrgent: true,
  },
  {
    key: "incident",
    label: "장애 진행 중",
    href: "/ops/incidents",
    roles: ["OPS"],
    count: (home) => home.activeIncidentCount,
    isUrgent: true,
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;
export const TRIAL_WINDOW_WARNING_DAYS = 60;

type TrialEventLike = { name: string; endsAt: string; status: string; audience: string };

export type TrialWindowStatus =
  | { kind: "none" }
  | { kind: "ending"; name: string; endsAt: string; daysLeft: number }
  | { kind: "ok" };

/** 활성 일반 체험 이벤트가 없거나 가입 창 종료가 60일 이내면 경고 대상이다. */
export function judgeTrialWindow(
  events: readonly TrialEventLike[],
  now: number,
): TrialWindowStatus {
  const active = events.filter(
    (event) => event.audience === "GENERAL" && event.status === "ACTIVE",
  );
  if (active.length === 0) return { kind: "none" };
  const nearest = [...active].sort(
    (left, right) => new Date(left.endsAt).getTime() - new Date(right.endsAt).getTime(),
  )[0];
  if (!nearest) return { kind: "none" };
  const daysLeft = Math.ceil((new Date(nearest.endsAt).getTime() - now) / DAY_MS);
  if (daysLeft <= TRIAL_WINDOW_WARNING_DAYS) {
    return { kind: "ending", name: nearest.name, endsAt: nearest.endsAt, daysLeft };
  }
  return { kind: "ok" };
}

type NoticeLike = { changeKind: string; decision: string; responseDueAt: string };

export function countOverdueIncreaseNotices(notices: readonly NoticeLike[], now: number): number {
  return notices.filter(
    (notice) =>
      notice.changeKind === "INCREASE" &&
      notice.decision === "PENDING" &&
      new Date(notice.responseDueAt).getTime() < now,
  ).length;
}
