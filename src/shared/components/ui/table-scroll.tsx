"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export type TableScrollProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

/** 좁은 화면에서 표를 가로로 넘기는 컨테이너. 실제로 넘칠 때만 키보드 포커스를 받아 스크롤할 수 있게 한다. */
export function TableScroll({ label, children, className }: TableScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const update = () => setIsOverflowing(element.scrollWidth > element.clientWidth + 1);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      role={isOverflowing ? "group" : undefined}
      aria-label={isOverflowing ? `${label} 가로 스크롤` : undefined}
      tabIndex={isOverflowing ? 0 : undefined}
      className={cn("overflow-x-auto", className)}
    >
      {children}
    </div>
  );
}
