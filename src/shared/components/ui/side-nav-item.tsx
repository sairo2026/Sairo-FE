import Link from "next/link";
import { cn } from "@/shared/lib/cn";

export type SideNavItemProps = {
  href: string;
  label: string;
  isActive?: boolean;
  /** 사무소 메뉴는 H3(24), 운영 콘솔처럼 좁은 메뉴는 md(20)를 쓴다. */
  size?: "lg" | "md";
};

/** 좌측 메뉴 항목. 현재 위치는 색·밑줄과 aria-current로 함께 알린다. */
export function SideNavItem({ href, label, isActive = false, size = "lg" }: SideNavItemProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "inline-block w-fit border-b-2 py-2 font-semibold transition-colors active:text-primary-pressed",
        size === "lg" ? "text-h3" : "text-h2",
        isActive ? "border-primary text-primary" : "border-transparent text-ink hover:text-primary",
      )}
    >
      {label}
    </Link>
  );
}

export const OFFICE_NAV_ITEMS = [
  { key: "home", label: "홈 (오늘 할 일)", href: "/home" },
  { key: "properties", label: "매물 관리", href: "/properties" },
  { key: "customers", label: "고객 관리", href: "/customers" },
  { key: "coordinations", label: "방문 조율", href: "/coordinations" },
  { key: "contracts", label: "계약 관리", href: "/contracts" },
  { key: "settlements", label: "월말결산", href: "/settlements" },
] as const;
