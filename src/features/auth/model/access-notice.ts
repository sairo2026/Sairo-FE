import type { AuthContextResponse } from "@/lib/api/contracts/common.schema";
import { formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { isOfficeRole } from "./access-policy";
import { AUTH_ROUTES } from "./routes";

export type AccessNoticeAction = { label: string; href: string };

export type AccessNotice = {
  title: string;
  description: string;
  details: string[];
  actions: AccessNoticeAction[];
};

const ACCOUNT_ACTIONS: AccessNoticeAction[] = [
  { label: "내 계정", href: AUTH_ROUTES.account },
  { label: "지원 문의", href: AUTH_ROUTES.support },
];

function describeRejection(context: AuthContextResponse): string[] {
  const rejection = context.unresolvedRejection;
  if (!rejection) return [];
  const reason = typeof rejection.reason === "string" ? rejection.reason : null;
  return reason ? [`거절 사유: ${reason}`] : ["처리되지 않은 거절 내역이 있습니다."];
}

function describePreVerification(context: AuthContextResponse): AccessNotice {
  const isWaitingMembership =
    context.pendingMembershipId !== null && context.pendingMembershipId !== undefined;
  return {
    title: isWaitingMembership
      ? "사무소 참여 승인을 기다리고 있습니다"
      : "사무소 인증이 필요합니다",
    description: isWaitingMembership
      ? "사무소 대표가 참여 요청을 승인하면 업무 화면을 사용할 수 있습니다. 그동안 요청 상태 확인과 철회, 계정 관리만 할 수 있습니다."
      : "본인 인증과 사무소 인증 신청을 마치면 업무 화면을 사용할 수 있습니다. 작성 중인 신청은 이어서 작성하고 증빙을 제출할 수 있습니다.",
    details: describeRejection(context),
    actions: [
      { label: "사무소 인증 신청", href: AUTH_ROUTES.officeVerification },
      ...ACCOUNT_ACTIONS,
    ],
  };
}

function describeRestriction(context: AuthContextResponse): AccessNotice {
  const isOwner = context.role === "OWNER";
  const isSuspended = context.restrictionReason === "REVERIFICATION_SUSPENDED";
  const base = isSuspended
    ? {
        title: "재인증이 중단되어 접근이 제한되었습니다",
        description:
          "사업자 재인증이 중단되어 업무 화면을 사용할 수 없습니다. 대표는 인증 소명과 구독, 반환용 조회와 내보내기를 할 수 있습니다.",
      }
    : {
        title: "사무소 인증이 회수되어 접근이 제한되었습니다",
        description:
          "사업자 인증이 회수되어 업무 화면을 사용할 수 없습니다. 대표는 인증 소명과 구독, 반환용 조회와 내보내기를 할 수 있습니다.",
      };
  return {
    ...base,
    details: isOwner ? [] : ["직원은 대표가 인증을 정리할 때까지 사무소 데이터를 볼 수 없습니다."],
    actions: isOwner
      ? [
          { label: "인증 소명", href: AUTH_ROUTES.officeVerification },
          { label: "구독·결제", href: AUTH_ROUTES.billing },
          ...ACCOUNT_ACTIONS,
        ]
      : ACCOUNT_ACTIONS,
  };
}

function describeRemoved(context: AuthContextResponse): AccessNotice {
  const titles = {
    RESIGNED: "사무소에서 나가셨습니다",
    REMOVED: "사무소에서 내보내졌습니다",
    SUSPENDED: "사무소 접근이 정지되었습니다",
  } as const;
  const reason = context.removalReason ?? "REMOVED";
  return {
    title: titles[reason],
    description:
      "사무소 데이터는 더 이상 볼 수 없습니다. 본인 계정 관리와 소속 해제, 지원 문의는 계속 사용할 수 있습니다.",
    details: [],
    actions: ACCOUNT_ACTIONS,
  };
}

export function describeAccess(context: AuthContextResponse): AccessNotice | null {
  const isOwner = isOfficeRole(context.role) && context.role === "OWNER";
  switch (context.accessCondition) {
    case "ACTIVE":
      return null;
    case "PRE_VERIFICATION":
      return describePreVerification(context);
    case "OFFICE_UNDER_REVIEW":
      return {
        title: "사무소 인증을 심사하고 있습니다",
        description: isOwner
          ? "심사가 끝나면 알려 드립니다. 심사 중에는 인증 서류와 심사 상태 확인, 지원 문의, 탈퇴만 할 수 있고 업무 데이터는 사용할 수 없습니다."
          : "사무소 인증 심사가 끝나면 업무 화면을 사용할 수 있습니다.",
        details: describeRejection(context),
        actions: [
          ...(isOwner ? [{ label: "심사 상태 확인", href: AUTH_ROUTES.officeVerification }] : []),
          ...ACCOUNT_ACTIONS,
        ],
      };
    case "VERIFIED_UNPAID":
      return {
        title: "결제를 기다리고 있습니다",
        description: isOwner
          ? "사무소 인증이 끝났습니다. 구독 결제를 마치면 업무 화면을 사용할 수 있습니다."
          : "사무소 인증은 끝났고 대표가 결제를 마치면 업무 화면을 사용할 수 있습니다. 결제는 대표만 할 수 있습니다.",
        details: [],
        actions: [
          ...(isOwner ? [{ label: "구독·결제", href: AUTH_ROUTES.billing }] : []),
          ...ACCOUNT_ACTIONS,
        ],
      };
    case "PAYMENT_OVERDUE":
      return {
        title: "결제가 지연되어 읽기만 가능합니다",
        description:
          "미납 기간이 길어져 새 내용을 저장할 수 없습니다. 기존 내용을 보고 허용된 내보내기를 할 수 있습니다. 대표는 결제와 해지를 할 수 있습니다.",
        details: context.returnPeriodEndsAt
          ? [`반환 기간 종료: ${formatSeoulDate(context.returnPeriodEndsAt)}`]
          : [],
        actions: [
          ...(isOwner ? [{ label: "구독·결제", href: AUTH_ROUTES.billing }] : []),
          ...ACCOUNT_ACTIONS,
        ],
      };
    case "AUTH_REVOKED":
      return describeRestriction(context);
    case "REMOVED":
      return describeRemoved(context);
    case "RETURN_EXPIRED":
      return {
        title: "데이터 반환 기간이 끝났습니다",
        description:
          "사무소 업무 데이터에는 더 이상 접근할 수 없습니다. 보관 문서는 별도의 보관권한자만 열람할 수 있습니다.",
        details: [],
        actions: ACCOUNT_ACTIONS,
      };
  }
}

/** 구독이 정상이지만 미납 유예 중일 때 업무 화면 위에 띄우는 안내 문구. */
export function describeGrace(context: AuthContextResponse): string | null {
  if (context.accessCondition !== "ACTIVE" || !context.graceUntil) return null;
  return `결제가 확인되지 않았습니다. ${formatSeoulDateTime(context.graceUntil)}까지 결제를 마치지 않으면 읽기만 가능해집니다.`;
}
