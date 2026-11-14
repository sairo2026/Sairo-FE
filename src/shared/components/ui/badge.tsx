import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export type BadgeTone = "blue" | "red" | "yellow" | "green" | "amber" | "teal" | "gray";

const toneClass: Record<BadgeTone, string> = {
  blue: "bg-tag-blue text-tag-blue-ink",
  red: "bg-tag-red text-tag-red-ink",
  yellow: "bg-tag-yellow text-tag-yellow-ink",
  green: "bg-tag-green text-tag-green-ink",
  amber: "bg-tag-amber text-tag-amber-ink",
  teal: "bg-tag-teal text-tag-teal-ink",
  gray: "border border-line bg-white text-ink-3",
};

export type BadgeProps = { tone: BadgeTone; children: ReactNode; className?: string };

/** 상태 표시 배지. 색만으로 뜻을 전하지 않도록 항상 글자를 함께 쓴다. */
export function Badge({ tone, children, className }: BadgeProps) {
  return (
    <span
      data-tone={tone}
      className={cn(
        "inline-flex h-10 min-w-[100px] items-center justify-center whitespace-nowrap rounded-control px-5 text-body font-medium",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export type TradeType = "monthly" | "jeonse" | "sale";

const tradeLabel: Record<TradeType, string> = { monthly: "월세", jeonse: "전세", sale: "매매" };

export function TradeTypeTag({ type }: { type: TradeType }) {
  return (
    <span className="inline-flex h-10 min-w-[60px] items-center justify-center rounded-control bg-surface px-3 text-caption font-semibold text-ink">
      {tradeLabel[type]}
    </span>
  );
}

/** 만기까지 남은 일수. 만기 당일은 D-0으로 표시하고 값이 없으면 "없음"이다. */
export function DDayTag({ daysLeft }: { daysLeft: number | null }) {
  if (daysLeft === null) {
    return (
      <span className="inline-flex h-10 min-w-[100px] items-center justify-center rounded-control border border-line bg-white px-3 text-caption text-ink-3">
        없음
      </span>
    );
  }
  const isUnder90 = daysLeft <= 90;
  return (
    <span
      className={cn(
        "inline-flex h-10 min-w-[100px] items-center justify-center rounded-control border px-3 text-caption font-medium",
        isUnder90 ? "border-primary bg-primary-soft text-primary" : "border-line bg-white text-ink",
      )}
    >
      D-{Math.max(0, daysLeft)}
    </span>
  );
}
