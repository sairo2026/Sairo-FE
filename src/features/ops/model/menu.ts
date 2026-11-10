import { OPS_WORK_ROLES, hasAnyRole } from "./roles";
import type { OpsRole } from "./roles";

export type OpsMenuItem = {
  key: string;
  label: string;
  href: string;
  /** 비어 있으면 운영자 누구나 본다. */
  roles: readonly OpsRole[];
  /** 같은 메뉴로 묶는 하위 경로 접두사. */
  prefixes?: readonly string[];
};

const ALL: readonly OpsRole[] = [];

export const OPS_MENU: readonly OpsMenuItem[] = [
  { key: "home", label: "운영 홈", href: "/ops", roles: ALL },
  {
    key: "offices",
    label: "고객사",
    href: "/ops/offices",
    roles: [
      "SECURITY_ADMIN",
      "REVIEW",
      "SUPPORT",
      "BILLING",
      "MIGRATION",
      "PRIVACY",
      "OPS",
      "EXEC_VIEW",
    ],
  },
  { key: "members", label: "회원", href: "/ops/members", roles: OPS_WORK_ROLES },
  { key: "registrations", label: "인증 심사", href: "/ops/registrations", roles: ["REVIEW"] },
  { key: "raw-access", label: "원문 접근", href: "/ops/raw-access", roles: ALL },
  {
    key: "operators",
    label: "운영자·감사",
    href: "/ops/operators",
    roles: ["SECURITY_ADMIN"],
    prefixes: ["/ops/audit-log"],
  },
];

function matches(item: OpsMenuItem, pathname: string): boolean {
  const bases = [item.href, ...(item.prefixes ?? [])];
  return bases.some((base) =>
    base === "/ops" ? pathname === "/ops" : pathname === base || pathname.startsWith(`${base}/`),
  );
}

export function visibleMenu(owned: readonly string[]): OpsMenuItem[] {
  return OPS_MENU.filter((item) => hasAnyRole(owned, item.roles));
}

export function activeMenuKey(pathname: string): string | undefined {
  return OPS_MENU.find((item) => matches(item, pathname))?.key;
}
