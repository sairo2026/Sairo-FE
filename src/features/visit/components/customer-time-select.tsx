"use client";

import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { cn } from "@/shared/lib/cn";
import {
  SLOT_MINUTES,
  minutesToTime,
  slotStartTimes,
  summarizeDrafts,
  weekdayLabel,
} from "../model/customer-times";
import type { SelectedBlocks, SlotDraft } from "../model/customer-times";

const TIME_COLUMNS = 4;

export type CustomerTimeSelectProps = {
  dates: string[];
  activeDate: string;
  onActiveDateChange: (date: string) => void;
  selected: SelectedBlocks;
  onToggle: (date: string, minutes: number) => void;
  /** 이미 지난 칸은 고를 수 없다. */
  isPast: (date: string, minutes: number) => boolean;
  isDisabled: boolean;
  drafts: SlotDraft[];
};

function dateParts(date: string) {
  const [, month = "", day = ""] = date.split("-");
  return { month: Number(month), day: Number(day), weekday: weekdayLabel(date) };
}

/** 날짜 칩 한 줄과 30분 단위 시간 칩 격자. 눌러서 고르고 다시 누르면 해제된다. */
export function CustomerTimeSelect({
  dates,
  activeDate,
  onActiveDateChange,
  selected,
  onToggle,
  isPast,
  isDisabled,
  drafts,
}: CustomerTimeSelectProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const active = dateParts(activeDate);
  const activeSelected = new Set(selected[activeDate] ?? []);

  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    const step: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: TIME_COLUMNS,
      ArrowUp: -TIME_COLUMNS,
    };
    const delta = step[event.key];
    if (delta === undefined) return;
    const buttons = Array.from(
      gridRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [],
    );
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    const target = buttons[index + delta];
    if (!target) return;
    event.preventDefault();
    target.focus();
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label="날짜 선택"
        className="flex gap-2 overflow-x-auto pb-1"
        data-testid="date-chips"
      >
        {dates.map((date) => {
          const parts = dateParts(date);
          const isActive = date === activeDate;
          const hasSelection = (selected[date]?.length ?? 0) > 0;
          return (
            <button
              key={date}
              type="button"
              aria-label={`${parts.month}월 ${parts.day}일 (${parts.weekday})`}
              aria-pressed={isActive}
              onClick={() => onActiveDateChange(date)}
              className={cn(
                "relative flex h-[58px] min-w-[72px] flex-1 items-center justify-center rounded-control border px-3 text-body font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary text-white hover:bg-primary-hover active:bg-primary-pressed"
                  : "border-line bg-surface text-ink hover:border-primary hover:bg-primary-soft hover:text-primary active:bg-primary-line",
                hasSelection && !isActive && "border-primary",
              )}
            >
              <span aria-hidden="true">
                {parts.day} {parts.weekday}
              </span>
              {hasSelection ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute right-2 top-2 h-1.5 w-1.5 rounded-full",
                    isActive ? "bg-white" : "bg-primary",
                  )}
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="text-caption font-semibold text-ink-2">
        {active.month}월 {active.day}일 ({active.weekday})
      </p>
      <div
        ref={gridRef}
        role="group"
        aria-label={`${active.month}월 ${active.day}일 시작 시각`}
        onKeyDown={moveFocus}
        className="grid grid-cols-4 gap-2"
      >
        {slotStartTimes().map((minutes) => {
          const isOn = activeSelected.has(minutes);
          const past = isPast(activeDate, minutes);
          return (
            <button
              key={minutes}
              type="button"
              aria-pressed={isOn}
              disabled={isDisabled || past}
              onClick={() => onToggle(activeDate, minutes)}
              className={cn(
                "h-[58px] rounded-control border px-1 text-body tabular-nums transition-colors disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-ink-3",
                isOn
                  ? "border-primary bg-primary-soft font-semibold text-primary enabled:hover:bg-primary-line enabled:active:bg-primary-line"
                  : "border-line bg-surface font-medium text-ink enabled:hover:border-primary enabled:hover:bg-primary-soft enabled:hover:text-primary enabled:active:bg-primary-line",
              )}
            >
              {minutesToTime(minutes)}
            </button>
          );
        })}
      </div>
      <p className="text-caption text-ink-2">
        한 칸은 {SLOT_MINUTES}분이고 이어서 고르면 하나의 시간대로 보냅니다.
      </p>
      <p aria-live="polite" className="text-caption font-medium text-primary">
        {drafts.length === 0
          ? "선택한 시간이 없습니다."
          : `선택한 시간 · ${summarizeDrafts(drafts)}`}
      </p>
    </div>
  );
}
