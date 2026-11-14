"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export type SelectableCardProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isSelected: boolean;
  isInvalid?: boolean;
  /** radio는 하나만 고르는 묶음, toggle은 눌림 상태만 알리는 단독 선택이다. */
  selectionRole?: "radio" | "toggle";
};

/** 카드·행·큰 버튼 모양의 선택 항목. 크기와 배치는 className으로 정하고 선택 상태 표시는 여기서 맡는다. */
export function SelectableCard({
  isSelected,
  isInvalid,
  selectionRole = "toggle",
  className,
  type = "button",
  children,
  ...rest
}: SelectableCardProps) {
  const roleProps =
    selectionRole === "radio"
      ? ({ role: "radio", "aria-checked": isSelected } as const)
      : ({ "aria-pressed": isSelected } as const);
  return (
    <button
      {...rest}
      {...roleProps}
      type={type}
      className={cn(
        "border transition-colors disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-ink-3",
        isSelected
          ? "border-primary bg-primary-soft ring-1 ring-inset ring-primary enabled:hover:bg-primary-line"
          : cn(
              "bg-white enabled:cursor-pointer enabled:hover:border-primary enabled:hover:bg-primary-soft",
              isInvalid ? "border-danger" : "border-control",
            ),
        className,
      )}
    >
      {children}
    </button>
  );
}
