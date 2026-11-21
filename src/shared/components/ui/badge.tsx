import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { formatDDay } from "@/shared/lib/format";

export type BadgeTone =
  | "blue"
  | "red"
  | "yellow"
  | "green"
  | "amber"
  | "teal"
  | "rose"
  | "orange"
  | "lime"
  | "mint"
  | "violet"
  | "silver"
  | "crimson"
  | "gray";

const toneClass: Record<BadgeTone, string> = {
  blue: "bg-tag-blue text-tag-blue-ink",
  red: "bg-tag-red text-tag-red-ink",
  yellow: "bg-tag-yellow text-tag-yellow-ink",
  green: "bg-tag-green text-tag-green-ink",
  amber: "bg-tag-amber text-tag-amber-ink",
  teal: "bg-tag-teal text-tag-teal-ink",
  rose: "bg-tag-rose text-tag-rose-ink",
  orange: "bg-tag-orange text-tag-orange-ink",
  lime: "bg-tag-lime text-tag-lime-ink",
  mint: "bg-tag-mint text-tag-mint-ink",
  violet: "bg-tag-violet text-tag-violet-ink",
  silver: "bg-tag-silver text-tag-silver-ink",
  crimson: "bg-tag-crimson text-tag-crimson-ink",
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
    <span className="inline-flex min-w-[60px] items-center justify-center bg-surface px-4 py-2 text-body font-medium text-ink">
      {tradeLabel[type]}
    </span>
  );
}

/** 만기까지 남은 일수. 만기 당일은 D-0, 지난 뒤는 D+n으로 표시하고 값이 없으면 "없음"이다. 90일 이내(D-90 이하, D-0 포함)만 강조한다. */
export function DDayTag({ daysLeft }: { daysLeft: number | null }) {
  if (daysLeft === null) {
    return (
      <span className="inline-flex h-10 min-w-[100px] items-center justify-center rounded-control border border-line bg-white px-5 text-body font-medium text-ink-3">
        없음
      </span>
    );
  }
  const isUnder90 = daysLeft >= 0 && daysLeft <= 90;
  const isOverdue = daysLeft < 0;
  return (
    <span
      aria-label={isOverdue ? `만기 ${-daysLeft}일 지남` : undefined}
      className={cn(
        "inline-flex h-10 min-w-[100px] items-center justify-center rounded-control border px-5 text-body",
        isUnder90
          ? "border-primary bg-primary-soft font-semibold text-primary"
          : isOverdue
            ? "border-line bg-white font-medium text-ink-3"
            : "border-line bg-white font-medium text-ink-2",
      )}
    >
      {formatDDay(daysLeft)}
    </span>
  );
}

export type ScheduleTagProps = {
  tone: BadgeTone;
  label: string;
  count: number;
  /** 링크 안에 놓아 눌러서 이동하는 타일일 때만 켠다. 호버·눌림에서 타일 색이 한 단계 진해진다. */
  isInteractive?: boolean;
  className?: string;
};

/** 홈의 조율 현황 칸. 상태 이름과 건수를 한 덩어리로 보여준다. 색만으로 뜻을 전하지 않도록 이름을 함께 쓴다. */
export function ScheduleTag({ tone, label, count, isInteractive, className }: ScheduleTagProps) {
  return (
    <span
      data-tone={tone}
      className={cn(
        "flex h-[92px] w-[132px] flex-col items-center justify-center gap-2 rounded-control px-5 py-2",
        tone === "gray" ? "border border-line bg-white text-ink-2" : toneClass[tone],
        isInteractive && "clickable-tile",
        className,
      )}
    >
      <span className="text-body font-medium">{label}</span>
      <span className="text-h2 font-semibold">{count}건</span>
    </span>
  );
}
