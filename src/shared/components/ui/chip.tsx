"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import { formatTimeSlot } from "@/shared/lib/format";

export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isSelected: boolean;
  isInvalid?: boolean;
};

/** 거래유형 선택 버튼, 날짜 숫자 칩처럼 눌러서 선택하는 칩. */
export function Chip({
  isSelected,
  isInvalid,
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
        "inline-flex min-h-11 items-center justify-center rounded-control border px-4 text-caption font-medium transition-colors disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-ink-3",
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
