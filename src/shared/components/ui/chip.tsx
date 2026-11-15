"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import { formatTimeSlot } from "@/shared/lib/format";

export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isSelected: boolean;
  isInvalid?: boolean;
  /** lg는 거래유형·날짜·시간처럼 눌러서 고르는 선택 버튼 규격(높이 58)이고 sm은 필터 칩이다. */
  size?: "sm" | "lg";
};

/** 거래유형 선택 버튼, 날짜 숫자 칩처럼 눌러서 선택하는 칩. */
export function Chip({
  isSelected,
  isInvalid,
  size = "sm",
  className,
  type = "button",
  children,
  ...rest
}: ChipProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-pressed={isSelected}
      className={cn(
        "inline-flex items-center justify-center rounded-control border font-medium transition-colors disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-ink-3",
        size === "lg" ? "min-h-[58px] px-6 text-body" : "min-h-11 px-4 text-caption",
        isSelected
          ? "border-primary bg-primary font-semibold text-white enabled:hover:border-primary-hover enabled:hover:bg-primary-hover"
          : cn(
              "bg-white text-ink enabled:cursor-pointer enabled:hover:border-primary enabled:hover:bg-primary-soft enabled:hover:text-primary",
              isInvalid ? "border-danger" : "border-control",
            ),
        className,
      )}
    >
      {children}
    </button>
  );
}

export type TimeSlotChipProps = {
  startsAt: string | Date;
  isSelected: boolean;
  isDisabled?: boolean;
  onToggle?: () => void;
};

/** "8월 20일 오전 10:30" 형태로 서울 시각을 표시하는 시간 슬롯 칩. */
export function TimeSlotChip({ startsAt, isSelected, isDisabled, onToggle }: TimeSlotChipProps) {
  return (
    <Chip isSelected={isSelected} disabled={isDisabled} onClick={onToggle}>
      {formatTimeSlot(startsAt)}
    </Chip>
  );
}
