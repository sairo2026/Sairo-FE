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
  gray: "border border-line bg-white text-muted",
};

const semanticStatusClass = {
  progress: "bg-status-progress-bg text-status-progress-text",
  success: "bg-status-success-bg text-status-success-text",
  warning: "bg-status-warning-bg text-status-warning-text",
  danger: "bg-status-danger-bg text-status-danger-text",
  neutral: "bg-status-neutral-bg text-status-neutral-text",
} as const;

type SemanticStatus = keyof typeof semanticStatusClass;

/** 상태가 아닌 역할·거래유형 태그는 기존 색을 유지한다. */
const STATUS_LABELS: Record<SemanticStatus, readonly string[]> = {
  progress: [
    "시간 수집 중",
    "조율 가능",
    "신청·확정 대기",
    "신청 진행",
    "신청 대기",
    "작성 중",
    "심사 중",
    "예정",
    "기간 중",
    "체험",
  ],
  success: ["확정 완료", "확정", "방문 완료", "체결", "인증 완료", "구독 중", "완료"],
  warning: ["재조율 필요", "보완 요청", "만기 도래", "확인 필요", "미납 유예", "일부 지급"],
  danger: ["재검증 실패", "반려", "미납 제한", "인증 중단", "무효"],
  neutral: [
    "미방문 종료",
    "취소",
    "시간 마감",
    "기간 만료",
    "신청 철회",
    "확정 취소",
    "종료",
    "해제",
    "회수",
    "초안",
    "시작 전",
    "미정",
    "지급 없음",
    "결제 전",
  ],
};

function semanticStatus(label: string): SemanticStatus | null {
  for (const [group, labels] of Object.entries(STATUS_LABELS) as [
    SemanticStatus,
    readonly string[],
  ][]) {
    if (labels.includes(label)) return group;
  }
  return null;
}

export type BadgeProps = { tone: BadgeTone; children: ReactNode; className?: string };

/** 상태 표시 배지. 색만으로 뜻을 전하지 않도록 항상 글자를 함께 쓴다. */
export function Badge({ tone, children, className }: BadgeProps) {
  const status = typeof children === "string" ? semanticStatus(children.trim()) : null;
  return (
    <span
      data-tone={tone}
      data-status-group={status ?? undefined}
      className={cn(
        "inline-flex h-9 min-w-[100px] items-center justify-center whitespace-nowrap rounded-control px-5 text-caption font-semibold",
        status ? semanticStatusClass[status] : toneClass[tone],
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
      <span className="inline-flex h-10 min-w-[100px] items-center justify-center rounded-control border border-line bg-white px-5 text-body font-medium text-muted">
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
            ? "border-line bg-white font-medium text-muted"
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
  const status = semanticStatus(label);
  return (
    <span
      data-tone={tone}
      data-status-group={status ?? undefined}
      className={cn(
        "flex h-[92px] w-[132px] flex-col items-center justify-center gap-2 rounded-control px-5 py-2",
        status
          ? semanticStatusClass[status]
          : tone === "gray"
            ? "border border-line bg-white text-ink-2"
            : toneClass[tone],
        isInteractive && "clickable-tile",
        className,
      )}
    >
      <span className="text-body font-medium">{label}</span>
      <span className="text-h2 font-semibold">{count}건</span>
    </span>
  );
}
