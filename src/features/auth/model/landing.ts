type AccessInfo = {
  accessCondition: string;
  role?: string | null;
  pendingRegistrationId?: number | null;
  pendingMembershipId?: number | null;
};

function hasValue(id: number | null | undefined): boolean {
  return id !== null && id !== undefined;
}

function isNonOwner(role: string | null | undefined): boolean {
  return role !== null && role !== undefined && role !== "OWNER";
}

export function landingPathFor(context: AccessInfo): string {
  switch (context.accessCondition) {
    case "ACTIVE":
      return "/home";
    case "PRE_VERIFICATION":
      if (hasValue(context.pendingRegistrationId)) return "/office/review";
      if (hasValue(context.pendingMembershipId)) return "/office/membership";
      return "/office/start";
    case "OFFICE_UNDER_REVIEW":
      return "/office/review";
    case "VERIFIED_UNPAID":
      return isNonOwner(context.role) ? "/access" : "/billing";
    case "PAYMENT_OVERDUE":
      return isNonOwner(context.role) ? "/home" : "/billing";
    case "AUTH_REVOKED":
      return "/office/verification";
    case "REMOVED":
      return "/removed";
    default:
      return "/return";
  }
}

export function safeNextPath(next: string | null | undefined): string | null {
  if (!next?.startsWith("/") || next.startsWith("//") || /[\\\p{Cc}]/u.test(next)) return null;
  const base = "https://internal.invalid";
  const target = new URL(next, base);
  if (target.origin !== base || target.pathname.startsWith("//")) return null;
  if (target.pathname.startsWith("/login") || target.pathname.startsWith("/signup")) return null;
  return target.pathname + target.search + target.hash;
}
