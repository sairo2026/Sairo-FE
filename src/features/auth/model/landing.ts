type AccessInfo = { accessCondition: string; role?: string | null };

export function landingPathFor(context: AccessInfo): string {
  switch (context.accessCondition) {
    case "ACTIVE":
      return context.role === "OWNER" ? "/billing/card-guide" : "/";
    case "PRE_VERIFICATION":
      return "/office/start";
    case "OFFICE_UNDER_REVIEW":
      return "/office/review";
    case "VERIFIED_UNPAID":
    case "PAYMENT_OVERDUE":
      return "/billing";
    case "AUTH_REVOKED":
      return "/office/verification";
    case "REMOVED":
      return "/removed";
    default:
      return "/return";
  }
}

export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  if (next.startsWith("/login") || next.startsWith("/signup")) return null;
  return next;
}
