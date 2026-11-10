import { OFFICE_NAV_ITEMS } from "@/shared/components/ui/side-nav-item";
import type { OfficeRole } from "./access-policy";

export type MenuItem = { key: string; label: string; href: string };

const DEPUTY_MENU_KEYS: readonly string[] = ["home", "coordinations"];
const AGENT_MENU_KEYS: readonly string[] = OFFICE_NAV_ITEMS.map((item) => item.key);

const OWNER_EXTRA_ITEMS: readonly MenuItem[] = [
  { key: "office", label: "사무소 관리", href: "/office" },
  { key: "import", label: "데이터 이전", href: "/import" },
  { key: "billing", label: "구독·결제", href: "/billing" },
];

/** 역할별 사무소 메뉴. 중개보조원은 홈과 담당 방문 조율만, 대표는 사무소 관리와 결제 메뉴를 더 본다. */
export function getOfficeMenu(role: OfficeRole): MenuItem[] {
  const allowedKeys = role === "DEPUTY" ? DEPUTY_MENU_KEYS : AGENT_MENU_KEYS;
  const base: MenuItem[] = OFFICE_NAV_ITEMS.filter((item) => allowedKeys.includes(item.key)).map(
    (item) => ({ key: item.key, label: item.label, href: item.href }),
  );
  return role === "OWNER" ? [...base, ...OWNER_EXTRA_ITEMS] : base;
}
