export const OPS_ROLES = [
  "SECURITY_ADMIN",
  "REVIEW",
  "SUPPORT",
  "BILLING",
  "MIGRATION",
  "PRIVACY",
  "OPS",
  "EXEC_VIEW",
] as const;

export type OpsRole = (typeof OPS_ROLES)[number];

export const OPS_ROLE_LABELS: Record<OpsRole, string> = {
  SECURITY_ADMIN: "보안관리자",
  REVIEW: "심사담당",
  SUPPORT: "고객지원",
  BILLING: "결제담당",
  MIGRATION: "이전담당",
  PRIVACY: "개인정보담당",
  OPS: "운영담당",
  EXEC_VIEW: "경영조회",
};

/** 경영조회를 제외한 7개 업무 역할. 회원·고객사 상세처럼 원문에 가까운 화면에 쓴다. */
export const OPS_WORK_ROLES: readonly OpsRole[] = OPS_ROLES.filter((role) => role !== "EXEC_VIEW");

function isOpsRole(value: string): value is OpsRole {
  return (OPS_ROLES as readonly string[]).includes(value);
}

export function toOpsRoles(values: readonly string[]): OpsRole[] {
  return values.filter(isOpsRole);
}

/** required가 비어 있으면 로그인한 운영자 누구나 쓸 수 있다. */
export function hasAnyRole(owned: readonly string[], required: readonly OpsRole[]): boolean {
  if (required.length === 0) return true;
  return required.some((role) => owned.includes(role));
}
