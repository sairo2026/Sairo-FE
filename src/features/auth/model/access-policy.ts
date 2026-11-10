import type { AuthContextResponse } from "@/lib/api/contracts/common.schema";
import { AUTH_ROUTES } from "./routes";

export type AccessCondition = AuthContextResponse["accessCondition"];
export type OfficeRole = "OWNER" | "AGENT" | "DEPUTY";

/** 화면이 속한 접근 영역. 영역마다 허용되는 접근 상태가 다르다. */
export type RouteArea = "account" | "verification" | "billing" | "business";

const ROUTE_AREA_PREFIXES: ReadonlyArray<readonly [string, RouteArea]> = [
  [AUTH_ROUTES.account, "account"],
  [AUTH_ROUTES.settings, "account"],
  [AUTH_ROUTES.support, "account"],
  [AUTH_ROUTES.privacyRequests, "account"],
  [AUTH_ROUTES.officeVerification, "verification"],
  [AUTH_ROUTES.billing, "billing"],
];

/** 대표만 열 수 있는 업무 화면과 중개보조원에게 닫힌 업무 화면. */
const BUSINESS_ROUTE_ROLES: ReadonlyArray<readonly [string, readonly OfficeRole[]]> = [
  ["/office", ["OWNER"]],
  ["/members", ["OWNER"]],
  ["/properties", ["OWNER", "AGENT"]],
  ["/customers", ["OWNER", "AGENT"]],
  ["/contracts", ["OWNER", "AGENT"]],
  ["/settlements", ["OWNER", "AGENT"]],
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function routeAreaOf(pathname: string): RouteArea {
  const matched = ROUTE_AREA_PREFIXES.find(([prefix]) => matchesPrefix(pathname, prefix));
  return matched ? matched[1] : "business";
}

export function isOfficeRole(value: string | null | undefined): value is OfficeRole {
  return value === "OWNER" || value === "AGENT" || value === "DEPUTY";
}

export type AccessDecision =
  { kind: "allow"; isReadOnly: boolean } | { kind: "redirect"; to: string } | { kind: "forbidden" };

export function loginRedirect(pathname: string): AccessDecision {
  const isSafeNext = pathname.startsWith("/") && !pathname.startsWith("//");
  const query = isSafeNext && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
  return { kind: "redirect", to: `${AUTH_ROUTES.login}${query}` };
}

function canUseBusinessRoute(pathname: string, role: OfficeRole | null): boolean {
  const restriction = BUSINESS_ROUTE_ROLES.find(([prefix]) => matchesPrefix(pathname, prefix));
  if (!restriction) return role !== null;
  return role !== null && restriction[1].includes(role);
}

/**
 * 접근 상태와 역할로 화면 접근을 판정한다.
 * 허용 범위는 기능명세서의 접근 제한별 허용 범위 표를 따른다.
 */
export function decideAccess(
  context: AuthContextResponse | null,
  pathname: string,
): AccessDecision {
  if (context === null) return loginRedirect(pathname);

  const area = routeAreaOf(pathname);
  if (area === "account") return { kind: "allow", isReadOnly: false };

  if (context.reconsentRequired) return { kind: "redirect", to: AUTH_ROUTES.reconsent };

  const role = isOfficeRole(context.role) ? context.role : null;
  const notice: AccessDecision = { kind: "redirect", to: AUTH_ROUTES.accessNotice };
  const { accessCondition } = context;

  switch (area) {
    case "verification":
      if (accessCondition === "PRE_VERIFICATION" || accessCondition === "OFFICE_UNDER_REVIEW") {
        return { kind: "allow", isReadOnly: false };
      }
      if (accessCondition === "AUTH_REVOKED" && role === "OWNER") {
        return { kind: "allow", isReadOnly: false };
      }
      return notice;
    case "billing": {
      const canOpen =
        accessCondition === "VERIFIED_UNPAID" ||
        accessCondition === "ACTIVE" ||
        accessCondition === "PAYMENT_OVERDUE" ||
        accessCondition === "AUTH_REVOKED";
      if (!canOpen) return notice;
      return role === "OWNER" ? { kind: "allow", isReadOnly: false } : { kind: "forbidden" };
    }
    case "business":
      if (accessCondition === "ACTIVE" || accessCondition === "PAYMENT_OVERDUE") {
        if (!canUseBusinessRoute(pathname, role)) return { kind: "forbidden" };
        return { kind: "allow", isReadOnly: accessCondition === "PAYMENT_OVERDUE" };
      }
      return notice;
  }
}

/** 운영 콘솔은 사무소 세션과 분리돼 있어 운영자 확인 결과만으로 판정한다. */
export function decideOpsAccess(isOperator: boolean): AccessDecision {
  if (isOperator) return { kind: "allow", isReadOnly: false };
  return { kind: "redirect", to: AUTH_ROUTES.opsLogin };
}
