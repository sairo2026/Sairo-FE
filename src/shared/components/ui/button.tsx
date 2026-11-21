"use client";

import { useEffect, useRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export type ButtonVariant = "submit" | "cancel" | "outlined" | "ghost";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** 처리 중에는 중복 제출을 막고 aria-busy를 알린다. */
  isLoading?: boolean;
  size?: "md" | "sm";
  fullWidth?: boolean;
  /** 안내 화면의 긴 단일 버튼. 폭 230을 쓴다. */
  isWide?: boolean;
  /** 서버에 한 번만 보내야 하는 버튼에 쓴다. 더블 클릭의 두 번째 클릭은 처리 중 표시가 그려지기 전이라 무시한다. */
  guardDoubleClick?: boolean;
};

const variantClass: Record<ButtonVariant, string> = {
  submit: "bg-primary text-white font-bold hover:bg-primary-hover active:bg-primary-pressed",
  cancel: "bg-primary-soft text-ink-2 font-medium hover:bg-primary-line active:bg-primary-line",
  outlined:
    "bg-primary-soft text-primary border border-primary font-semibold hover:bg-primary-line hover:shadow-[0_2px_8px_rgb(51_53_166/0.18)] active:bg-primary-line active:shadow-none",
  ghost: "bg-white text-ink-2 border border-line font-medium clickable-control",
};

const DOUBLE_CLICK_GUARD_MS = 300;

export function Button({
  variant = "submit",
  isLoading = false,
  size = "md",
  fullWidth = false,
  isWide = false,
  guardDoubleClick = false,
  type = "button",
  disabled,
  className,
  children,
  onClick,
  ...rest
}: ButtonProps) {
  const isBlocked = Boolean(disabled) || isLoading;
  const lockedUntil = useRef(0);
  // 처리가 끝나 다시 눌러도 되는 상태가 되면 잠금을 푼다.
  useEffect(() => {
    if (!isLoading) return;
    return () => {
      lockedUntil.current = 0;
    };
  }, [isLoading]);
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      aria-disabled={isBlocked || undefined}
      aria-busy={isLoading || undefined}
      onClick={(event) => {
        if (isBlocked) {
          event.preventDefault();
          return;
        }
        const now = Date.now();
        if (guardDoubleClick && onClick) {
          if (now < lockedUntil.current) {
            event.preventDefault();
            return;
          }
          lockedUntil.current = now + DOUBLE_CLICK_GUARD_MS;
        }
        onClick?.(event);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-control text-body transition-[color,background-color,border-color,box-shadow] duration-150",
        size === "md" ? "h-12 min-w-[120px] gap-2 px-10" : "h-9 gap-1.5 px-3.5 text-caption",
        fullWidth && "w-full",
        isWide && !fullWidth && "w-[230px]",
        !disabled && variantClass[variant],
        isLoading && "cursor-progress opacity-80",
        disabled && "cursor-not-allowed border border-ink-3 bg-white font-semibold text-ink-3",
        className,
      )}
    >
      {isLoading ? <Spinner /> : null}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}
