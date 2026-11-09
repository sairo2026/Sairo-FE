"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import { formatTimeSlot } from "@/shared/lib/format";

export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isSelected: boolean;
};

/** 거래유형 선택 버튼, 날짜 숫자 칩처럼 눌러서 선택하는 칩. */
export function Chip({ isSelected, className, type = "button", children, ...rest }: ChipProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-pressed={isSelected}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-control border px-4 text-caption font-medium transition-colors disabled:cursor-not-allowed disabled:text-ink-3",
        isSelected
          ? "border-primary bg-primary-soft font-semibold text-primary"
          : "border-line bg-white text-ink hover:border-primary",
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
