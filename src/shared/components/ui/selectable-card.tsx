"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export type SelectableCardProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isSelected: boolean;
  isInvalid?: boolean;
  /** radio는 하나만 고르는 묶음, toggle은 눌림 상태만 알리는 단독 선택이다. */
  selectionRole?: "radio" | "toggle";
  /** outline-card는 연한 바탕에 보라 테두리, option은 연한 바탕에 선택 시 보라 글씨와 테두리만 바뀌는 모양이다. */
  variant?: "default" | "outline-card" | "option";
};

const HOVER_SHADOW = "enabled:hover:shadow-[0_2px_8px_rgb(51_53_166/0.14)]";

function stateClass(
  variant: NonNullable<SelectableCardProps["variant"]>,
  isSelected: boolean,
  isInvalid: boolean | undefined,
): string {
  if (variant === "option") {
    return isSelected
      ? cn("border-primary bg-surface font-semibold text-primary", HOVER_SHADOW)
      : cn(
          "border-line bg-surface font-medium text-ink enabled:cursor-pointer enabled:hover:border-primary",
          HOVER_SHADOW,
        );
  }
  if (isSelected) {
    return cn(
      "border-primary bg-primary-soft ring-1 ring-inset ring-primary enabled:hover:bg-primary-line enabled:hover:shadow-[0_2px_8px_rgb(51_53_166/0.14)] enabled:active:ring-2 enabled:active:shadow-none",
      variant === "outline-card" && "text-primary",
    );
  }
  const base =
    variant === "outline-card"
      ? "bg-surface text-primary enabled:cursor-pointer enabled:hover:border-primary enabled:hover:bg-primary-soft enabled:hover:shadow-[0_2px_8px_rgb(51_53_166/0.14)] enabled:active:bg-primary-line"
      : "bg-white enabled:cursor-pointer enabled:hover:border-primary enabled:hover:bg-primary-soft enabled:hover:shadow-[0_2px_8px_rgb(51_53_166/0.14)] enabled:active:bg-primary-line";
  const border = variant === "outline-card" ? "border-brand-border" : "border-control";
  return cn(base, isInvalid ? "border-danger" : border);
}

/** 카드·행·큰 버튼 모양의 선택 항목. 크기와 배치는 className으로 정하고 선택 상태 표시는 여기서 맡는다. */
export function SelectableCard({
  isSelected,
  isInvalid,
  selectionRole = "toggle",
  variant = "default",
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
        "border transition-[color,background-color,border-color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-ink-3",
        stateClass(variant, isSelected, isInvalid),
        className,
      )}
    >
      {children}
    </button>
  );
}
