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
    <span className="inline-flex min-w-[60px] items-center justify-center rounded-control bg-surface px-4 py-2 text-body font-medium text-ink">
      {tradeLabel[type]}
    </span>
  );
}

/** 만기까지 남은 일수. 만기 당일은 D-0으로 표시하고 값이 없으면 "없음"이다. */
export function DDayTag({ daysLeft }: { daysLeft: number | null }) {
  if (daysLeft === null) {
    return (
      <span className="inline-flex h-10 min-w-[100px] items-center justify-center rounded-control border border-line bg-white px-3 text-body font-medium text-ink-3">
        없음
      </span>
    );
  }
  const isUnder90 = daysLeft <= 90;
  return (
    <span
      className={cn(
        "inline-flex h-10 min-w-[100px] items-center justify-center rounded-control border px-3 text-body",
        isUnder90
          ? "border-primary bg-primary-soft font-semibold text-primary"
          : "border-line bg-white font-medium text-ink-2",
      )}
    >
      D-{Math.max(0, daysLeft)}
    </span>
  );
}

export type ScheduleTagProps = {
  tone: BadgeTone;
  label: string;
  count: number;
  className?: string;
};

/** 홈의 조율 현황 칸. 상태 이름과 건수를 한 덩어리로 보여준다. 색만으로 뜻을 전하지 않도록 이름을 함께 쓴다. */
export function ScheduleTag({ tone, label, count, className }: ScheduleTagProps) {
  return (
    <span
      data-tone={tone}
      className={cn(
        "flex min-h-[92px] min-w-[132px] flex-col justify-between rounded-control px-4 py-3",
        toneClass[tone],
        className,
      )}
    >
      <span className="text-body font-medium">{label}</span>
      <span className="text-h2 font-bold">
        {count}
        <span className="text-caption font-medium">건</span>
      </span>
    </span>
  );
}
