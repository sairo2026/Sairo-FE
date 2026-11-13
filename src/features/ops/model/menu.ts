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
  { key: "owner-transfers", label: "대표 이전", href: "/ops/owner-transfers", roles: ["REVIEW"] },
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
  { key: "announcements", label: "공지", href: "/ops/announcements", roles: ["OPS"] },
  {
    key: "policy-documents",
    label: "정책 문서",
    href: "/ops/policy-documents",
    roles: ["OPS"],
  },
  { key: "trial-events", label: "체험 이벤트", href: "/ops/trial-events", roles: ["OPS"] },
  { key: "price-schedules", label: "요금표", href: "/ops/price-schedules", roles: ["BILLING"] },
  { key: "company-info", label: "회사 정보", href: "/ops/company-info", roles: ["OPS"] },
  { key: "launch", label: "출시 활성화", href: "/ops/launch", roles: ["OPS"] },
  {
    key: "system-jobs",
    label: "시스템 작업",
    href: "/ops/system-jobs",
    roles: ["OPS", "BILLING", "PRIVACY", "MIGRATION"],
  },
  { key: "incidents", label: "장애·사고", href: "/ops/incidents", roles: ["OPS", "PRIVACY"] },
  {
    key: "integrations",
    label: "연동 설정",
    href: "/ops/integrations",
    roles: ["OPS", "PRIVACY"],
  },
  {
    key: "retention-rules",
    label: "보관 규칙",
    href: "/ops/retention-rules",
    roles: ["PRIVACY"],
  },
  {
    key: "terms-hash-checks",
    label: "약관 해시 점검",
    href: "/ops/terms-hash-checks",
    roles: ["OPS"],
  },
  {
    key: "authority-requests",
    label: "수사기관 요청",
    href: "/ops/authority-requests",
    // 제공 종결은 보안관리자도 하므로 목록을 함께 연다(백엔드 OpsPrivacyRecordController).
    roles: ["PRIVACY", "SECURITY_ADMIN"],
  },
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
