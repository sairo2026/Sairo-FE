"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useMoreBelow } from "@/shared/hooks/use-more-below";
import { cn } from "@/shared/lib/cn";
import { MoreBelowHint } from "./scroll-more-hint";

export type TableScrollProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

/** 좁은 화면에서 표를 가로로 넘기는 컨테이너. 가로나 세로로 실제로 넘칠 때만 키보드 포커스를 받아 스크롤할 수 있게 한다. */
export function TableScroll({ label, children, className }: TableScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isTall, setIsTall] = useState(false);
  const hasMoreBelow = useMoreBelow(ref);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const update = () => {
      setIsOverflowing(element.scrollWidth > element.clientWidth + 1);
      setIsTall(element.scrollHeight > element.clientHeight + 1);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative">
      <div
        ref={ref}
        role={isOverflowing || isTall ? "group" : undefined}
        aria-label={isOverflowing ? `${label} 가로 스크롤` : isTall ? `${label} 스크롤` : undefined}
        tabIndex={isOverflowing || isTall ? 0 : undefined}
        className={cn(
          "scroll-area overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
          className,
        )}
      >
        {children}
      </div>
      <MoreBelowHint
        isVisible={hasMoreBelow}
        placement="absolute"
        className="rounded-b-card-flat"
      />
    </div>
  );
}
