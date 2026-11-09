import Link from "next/link";
import { cn } from "@/shared/lib/cn";

export type SideNavItemProps = {
  href: string;
  label: string;
  isActive?: boolean;
};

/** 좌측 메뉴 항목. 현재 위치는 색·밑줄과 aria-current로 함께 알린다. */
export function SideNavItem({ href, label, isActive = false }: SideNavItemProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "inline-block w-fit border-b-2 pb-2 text-h2 font-semibold transition-colors",
        isActive ? "border-primary text-primary" : "border-transparent text-ink hover:text-primary",
      )}
    >
      {label}
    </Link>
  );
}

export const OFFICE_NAV_ITEMS = [
  { key: "home", label: "홈 (오늘 할 일)", href: "/" },
  { key: "properties", label: "매물 관리", href: "/properties" },
  { key: "customers", label: "고객 관리", href: "/customers" },
  { key: "coordinations", label: "방문 조율", href: "/coordinations" },
  { key: "contracts", label: "계약 관리", href: "/contracts" },
  { key: "settlements", label: "월말결산", href: "/settlements" },
] as const;
