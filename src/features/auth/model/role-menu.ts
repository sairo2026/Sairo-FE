import type { OfficeRole } from "./access-policy";

const ALL_ROLES: readonly OfficeRole[] = ["OWNER", "AGENT", "DEPUTY"];
const OWNER_AND_AGENT: readonly OfficeRole[] = ["OWNER", "AGENT"];
const OWNER_ONLY: readonly OfficeRole[] = ["OWNER"];

export type MenuTabConfig = {
  key: string;
  label: string;
  href: string;
  roles: readonly OfficeRole[];
  /** 이 탭이 선택된 것으로 보는 주소 접두어. 가장 긴 접두어가 이긴다. */
  matchPrefixes: readonly string[];
};

export type MenuSectionConfig = {
  key: string;
  label: string;
  /** 탭이 없는 메뉴가 바로 여는 주소. 탭이 있는 메뉴는 보이는 첫 탭의 주소를 쓴다. */
  href?: string;
  roles?: readonly OfficeRole[];
  matchPrefixes?: readonly string[];
  tabs?: readonly MenuTabConfig[];
};

/**
 * 왼쪽 메뉴와 그 안의 탭을 정하는 유일한 설정이다.
 * 월말결산처럼 위치를 바꿀 화면은 이 표에서 탭의 소속만 옮기면 된다.
 * 메뉴·탭 표시는 접근 권한과 별개이며, 주소 접근 판정은 access-policy가 계속 맡는다.
 */
export const OFFICE_MENU_CONFIG: readonly MenuSectionConfig[] = [
  {
    key: "home",
    label: "홈 (오늘 할 일)",
    href: "/home",
    roles: ALL_ROLES,
    matchPrefixes: ["/home", "/tasks", "/notifications"],
  },
  {
    key: "properties",
    label: "매물 관리",
    href: "/properties",
    roles: OWNER_AND_AGENT,
    matchPrefixes: ["/properties"],
  },
  {
    key: "customers",
    label: "고객 관리",
    href: "/customers",
    roles: OWNER_AND_AGENT,
    matchPrefixes: ["/customers"],
  },
  {
    key: "coordinations",
    label: "방문 조율",
    href: "/coordinations",
    roles: ALL_ROLES,
    matchPrefixes: ["/coordinations", "/granted-properties"],
  },
  {
    key: "contracts",
    label: "계약 관리",
    href: "/contracts",
    roles: OWNER_AND_AGENT,
    matchPrefixes: ["/contracts"],
  },
  {
    key: "data",
    label: "데이터 관리",
    tabs: [
      {
        key: "import",
        label: "데이터 이전",
        href: "/import",
        roles: OWNER_ONLY,
        matchPrefixes: ["/import"],
      },
      {
        key: "exports",
        label: "데이터 내보내기",
        href: "/exports",
        roles: OWNER_AND_AGENT,
        matchPrefixes: ["/exports"],
      },
    ],
  },
  {
    key: "office",
    label: "사무소 관리",
    tabs: [
      {
        key: "settlements",
        label: "월말결산",
        href: "/settlements",
        roles: OWNER_AND_AGENT,
        matchPrefixes: ["/settlements"],
      },
      {
        key: "members",
        label: "구성원",
        href: "/members",
        roles: ALL_ROLES,
        matchPrefixes: ["/members"],
      },
      {
        key: "office-info",
        label: "사무소 정보",
        href: "/office",
        roles: OWNER_ONLY,
        matchPrefixes: ["/office"],
      },
      {
        key: "verification",
        label: "인증",
        href: "/billing/auth-suspension",
        roles: OWNER_ONLY,
        matchPrefixes: ["/billing/auth-suspension", "/office/verification"],
      },
      {
        key: "billing",
        label: "구독·결제",
        href: "/billing",
        roles: OWNER_ONLY,
        matchPrefixes: ["/billing"],
      },
    ],
  },
];

export type MenuTab = { key: string; label: string; href: string };
export type MenuItem = { key: string; label: string; href: string; tabs?: MenuTab[] };

/** 주소 접근 가능 여부. 주어지면 접근 규칙상 열 수 없는 탭을 숨기고 부모 메뉴의 첫 화면도 그에 맞춘다. */
export type CanOpen = (href: string) => boolean;

function matchPrefixLength(pathname: string, prefix: string): number {
  return pathname === prefix || pathname.startsWith(`${prefix}/`) ? prefix.length : -1;
}

function visibleTabs(section: MenuSectionConfig, role: OfficeRole, canOpen?: CanOpen): MenuTab[] {
  return (section.tabs ?? [])
    .filter((tab) => tab.roles.includes(role))
    .filter((tab) => (canOpen ? canOpen(tab.href) : true))
    .map(({ key, label, href }) => ({ key, label, href }));
}

/** 역할별 사무소 메뉴. 역할에 보이는 탭이 하나도 없는 부모 메뉴는 표시하지 않는다. */
export function getOfficeMenu(role: OfficeRole, canOpen?: CanOpen): MenuItem[] {
  const items: MenuItem[] = [];
  for (const section of OFFICE_MENU_CONFIG) {
    if (!section.tabs) {
      if (section.roles?.includes(role) && section.href) {
        items.push({ key: section.key, label: section.label, href: section.href });
      }
      continue;
    }
    const roleTabs = visibleTabs(section, role);
    const openTabs = visibleTabs(section, role, canOpen);
    const entry = openTabs[0] ?? roleTabs[0];
    if (!entry) continue;
    items.push({ key: section.key, label: section.label, href: entry.href, tabs: openTabs });
  }
  return items;
}

export type ActiveMenu = { sectionKey: string; tabKey: string | null };

/**
 * 주소로 선택된 메뉴와 탭을 찾는다. 하위 경로도 가장 긴 접두어로 부모를 찾는다.
 * 주소로 못 찾으면 화면이 넘긴 기존 키(메뉴 키 또는 탭 키)로 찾는다.
 */
export function resolveActiveMenu(pathname: string, fallbackKey?: string): ActiveMenu | null {
  const candidates: Array<ActiveMenu & { length: number }> = [];
  for (const section of OFFICE_MENU_CONFIG) {
    for (const prefix of section.matchPrefixes ?? []) {
      candidates.push({
        length: matchPrefixLength(pathname, prefix),
        sectionKey: section.key,
        tabKey: null,
      });
    }
    for (const tab of section.tabs ?? []) {
      for (const prefix of tab.matchPrefixes) {
        candidates.push({
          length: matchPrefixLength(pathname, prefix),
          sectionKey: section.key,
          tabKey: tab.key,
        });
      }
    }
  }
  const found = candidates
    .filter((candidate) => candidate.length >= 0)
    .sort((a, b) => b.length - a.length)[0];
  if (found) return { sectionKey: found.sectionKey, tabKey: found.tabKey };
  if (!fallbackKey) return null;
  for (const section of OFFICE_MENU_CONFIG) {
    if (section.key === fallbackKey) return { sectionKey: section.key, tabKey: null };
    const tab = section.tabs?.find((candidate) => candidate.key === fallbackKey);
    if (tab) return { sectionKey: section.key, tabKey: tab.key };
  }
  return null;
}
