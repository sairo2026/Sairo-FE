"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { useMoreBelow, useWindowMoreBelow } from "@/shared/hooks/use-more-below";
import { cn } from "@/shared/lib/cn";

const HINT_TEXT = "아래로 스크롤하면 더 볼 수 있습니다";

type HintTone = "white" | "surface";

const GRADIENT: Record<HintTone, string> = {
  white: "from-white via-white/85 to-transparent",
  surface: "from-surface via-surface/85 to-transparent",
};

function HintPill() {
  return (
    <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-caption font-medium text-ink-2 shadow-popup">
      {HINT_TEXT}
      <svg
        viewBox="0 0 16 16"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="motion-safe:animate-bounce"
      >
        <path d="M3 6l5 5 5-5" />
      </svg>
    </span>
  );
}

/** 장식용 표시다. 스크린리더에는 숨기고 마우스·터치를 가로채지 않는다. */
export function MoreBelowHint({
  isVisible,
  tone = "white",
  placement,
  className,
}: {
  isVisible: boolean;
  tone?: HintTone;
  placement: "fixed" | "absolute";
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      data-testid="more-below-hint"
      data-visible={isVisible}
      className={cn(
        "pointer-events-none inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t transition-opacity duration-150",
        placement === "fixed" ? "fixed z-30 h-20" : "absolute z-10 h-14",
        GRADIENT[tone],
        isVisible ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      <HintPill />
    </div>
  );
}

/** 문서 아래쪽에 내용이 더 있을 때만 화면 아래에 안내를 띄우고, 맨 아래에 닿으면 감춘다. */
export function WindowScrollHint({
  tone = "white",
  className,
}: {
  tone?: HintTone;
  className?: string;
}) {
  const hasMore = useWindowMoreBelow();
  return <MoreBelowHint isVisible={hasMore} tone={tone} placement="fixed" className={className} />;
}

export type ScrollAreaProps = {
  /** 키보드로 스크롤할 수 있도록 알리는 이름. */
  label: string;
  children: ReactNode;
  className?: string;
  tone?: HintTone;
};

/**
 * 높이가 제한된 안쪽 스크롤 영역. 항상 보이는 얇은 스크롤바, 항목 단위 스크롤 맞춤,
 * 아래에 내용이 더 있을 때의 안내를 함께 준다. 높이 제한은 className으로 정한다.
 */
export function ScrollArea({ label, children, className, tone = "white" }: ScrollAreaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const hasMore = useMoreBelow(ref);
  return (
    <div className="relative">
      <div
        ref={ref}
        role="group"
        aria-label={label}
        tabIndex={0}
        className={cn("scroll-area overflow-y-auto overscroll-contain", className)}
      >
        {children}
      </div>
      <MoreBelowHint isVisible={hasMore} tone={tone} placement="absolute" />
    </div>
  );
}
