import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

/** 목록 화면의 보조 이동 링크. 흰 바탕에 선이 있는 버튼 모양이고 sm은 카드 안의 작은 버튼 규격이다. */
export function SecondaryLink({
  href,
  children,
  size = "md",
}: {
  href: string;
  children: ReactNode;
  size?: "md" | "sm";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-control border border-line bg-white font-medium text-ink-2 clickable-control",
        size === "md" ? "h-12 px-6 text-body" : "h-9 px-3.5 text-caption",
      )}
    >
      {children}
    </Link>
  );
}
