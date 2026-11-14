import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export type ButtonVariant = "submit" | "cancel" | "outlined" | "ghost";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** 처리 중에는 중복 제출을 막고 aria-busy를 알린다. */
  isLoading?: boolean;
  size?: "md" | "sm";
  fullWidth?: boolean;
};

const variantClass: Record<ButtonVariant, string> = {
  submit: "bg-primary text-white font-bold hover:bg-primary-hover active:bg-primary-pressed",
  cancel: "bg-primary-soft text-ink-2 font-medium hover:bg-primary-line active:bg-primary-line",
  outlined:
    "bg-primary-soft text-primary border border-primary font-semibold hover:bg-primary-line active:bg-primary-line",
  ghost:
    "bg-white text-ink-2 border border-line font-medium hover:border-primary hover:bg-primary-soft hover:text-primary active:bg-primary-line",
};

export function Button({
  variant = "submit",
  isLoading = false,
  size = "md",
  fullWidth = false,
  type = "button",
  disabled,
  className,
  children,
  onClick,
  ...rest
}: ButtonProps) {
  const isBlocked = Boolean(disabled) || isLoading;
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
        onClick?.(event);
      }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-control text-body transition-colors",
        size === "md" ? "h-12 min-w-[120px] px-10" : "h-9 px-3.5 text-caption",
        fullWidth && "w-full",
        variantClass[variant],
        isLoading && "cursor-progress opacity-80",
        disabled &&
          "cursor-not-allowed border border-ink-3 bg-white font-semibold text-ink-3 hover:bg-white hover:text-ink-3 hover:border-ink-3 active:bg-white",
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
