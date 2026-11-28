"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { cn } from "@/shared/lib/cn";

export type SideNavItemProps = {
  href: string;
  label: string;
  isActive?: boolean;
  /** 사무소 메뉴는 20px, 운영 콘솔처럼 좁은 메뉴는 본문 크기를 쓴다. */
  size?: "lg" | "md";
};

/** 좌측 메뉴 항목. 현재 위치는 색·밑줄과 aria-current로 함께 알린다. */
export function SideNavItem({ href, label, isActive = false, size = "lg" }: SideNavItemProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    // 좁은 화면에서는 메뉴가 가로로 스크롤되므로 현재 메뉴가 화면 밖에 있지 않게 맞춘다.
    if (isActive) ref.current?.scrollIntoView?.({ block: "nearest", inline: "center" });
  }, [isActive]);
  return (
    <Link
      ref={ref}
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "inline-block w-fit shrink-0 whitespace-nowrap lg:shrink lg:whitespace-normal border-b-2 py-2 font-semibold transition-colors active:text-primary-pressed",
        size === "lg" ? "text-body lg:text-h3" : "text-body",
        isActive
          ? "border-primary text-primary"
          : "border-transparent text-ink hover:border-primary-line hover:bg-primary-soft hover:text-primary",
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
  { key: "data", label: "데이터 관리", href: "/import" },
  { key: "office", label: "사무소 관리", href: "/settlements" },
] as const;
