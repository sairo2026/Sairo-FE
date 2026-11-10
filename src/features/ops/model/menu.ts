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
  { key: "inquiries", label: "문의·티켓", href: "/ops/inquiries", roles: ["SUPPORT"] },
  {
    key: "enterprise-leads",
    label: "기업 도입 문의",
    href: "/ops/enterprise-leads",
    roles: ["SUPPORT"],
  },
  {
    key: "visit-review-disputes",
    label: "평가 이의",
    href: "/ops/visit-review-disputes",
    roles: ["SUPPORT"],
  },
  {
    key: "billing",
    label: "결제·환불·대사",
    href: "/ops/billing",
    roles: ["BILLING"],
    prefixes: ["/ops/billing"],
  },
  { key: "price-changes", label: "가격 변경 안내", href: "/ops/price-changes", roles: ["BILLING"] },
  {
    key: "start-customer-agreements",
    label: "시작 고객 합의",
    href: "/ops/start-customer-agreements",
    roles: ["OPS", "BILLING"],
  },
  { key: "import-support", label: "이전 지원", href: "/ops/import-support", roles: ["MIGRATION"] },
  {
    key: "privacy-requests",
    label: "개인정보 요청",
    href: "/ops/privacy-requests",
    roles: ["PRIVACY"],
  },
  {
    key: "guest-privacy-intakes",
    label: "비회원 권리 요청",
    href: "/ops/guest-privacy-intakes",
    roles: ["PRIVACY"],
  },
  { key: "deletion-queue", label: "파기 큐", href: "/ops/deletion-queue", roles: ["PRIVACY"] },
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
