"use client";

import { useMemo, useState } from "react";
import {
  MAX_CANDIDATE_TIMES,
  formatCandidateLabel,
  generateTimeSlots,
  isPastSlot,
  isSameDay,
  isSameSlot,
} from "../model/coordination";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

type CandidateTimePickerProps = {
  value: Date[];
  onChange: (next: Date[]) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  /** 지정하면 이 목록에 포함된 일시만 선택할 수 있다(재시작 등 후보 범위가 고정된 경우). 생략하면 미래의 모든 날짜·시간을 자유롭게 선택한다. */
  allowedSlots?: Date[];
  title?: string;
  backLabel?: string;
  submitLabel?: string;
};

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildMonthGrid(month: Date): (Date | null)[] {
  const first = startOfMonth(month);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = new Array(first.getDay()).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), day));
  }
  return cells;
}

export function CandidateTimePicker({
  value,
  onChange,
  onBack,
  onSubmit,
  isSubmitting,
  allowedSlots,
  title = "임장 후보 시간 등록",
  backLabel = "뒤로",
  submitLabel = "완료",
}: CandidateTimePickerProps) {
  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => new Date(now.getFullYear(), now.getMonth(), now.getDate()), [now]);
  const firstAllowedSlot = allowedSlots?.[0];
  const initialDate = firstAllowedSlot
    ? new Date(
        firstAllowedSlot.getFullYear(),
        firstAllowedSlot.getMonth(),
        firstAllowedSlot.getDate(),
      )
    : today;
  const [activeMonth, setActiveMonth] = useState(() => startOfMonth(initialDate));
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const monthCells = useMemo(() => buildMonthGrid(activeMonth), [activeMonth]);
  const slots = useMemo(
    () =>
      allowedSlots
        ? allowedSlots.filter((slot) => isSameDay(slot, selectedDate))
        : generateTimeSlots(selectedDate),
    [allowedSlots, selectedDate],
  );
  const morningSlots = slots.filter((slot) => slot.getHours() < 12);
  const afternoonSlots = slots.filter((slot) => slot.getHours() >= 12);
  const isMaxed = value.length >= MAX_CANDIDATE_TIMES;

  function toggleSlot(slot: Date) {
    const existingIndex = value.findIndex((item) => isSameSlot(item, slot));
    if (existingIndex >= 0) {
      onChange(value.filter((_, index) => index !== existingIndex));
      return;
    }
    if (isMaxed) return;
    onChange([...value, slot].sort((a, b) => a.getTime() - b.getTime()));
  }

  function removeCandidate(target: Date) {
    onChange(value.filter((item) => !isSameSlot(item, target)));
  }

  function renderSlotButton(slot: Date) {
    const selected = value.some((item) => isSameSlot(item, slot));
    const disabled = !selected && (allowedSlots ? isMaxed : isPastSlot(slot, now) || isMaxed);
    return (
      <button
        key={slot.getTime()}
        type="button"
        disabled={disabled}
        onClick={() => toggleSlot(slot)}
        className={`h-12 rounded-lg border font-semibold ${
          selected
            ? "border-[#3937b8] bg-[#3937b8] text-white"
            : "border-[#dfe3ec] bg-white text-[#182033] disabled:cursor-not-allowed disabled:opacity-40"
        }`}
      >
        {slot.getHours().toString().padStart(2, "0")}:
        {slot.getMinutes().toString().padStart(2, "0")}
      </button>
    );
  }

  return (
    <div>
      <h1 className="mb-10 text-3xl font-bold">{title}</h1>
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="mb-5 text-lg font-bold">가능한 날짜와 시간 선택</h2>
          <div className="mb-8 max-w-[620px] rounded-2xl border border-[#dfe3ec] p-6">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setActiveMonth(new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1))
                }
                aria-label="이전 달"
                className="rounded-md px-2 py-1 font-semibold text-slate-500 hover:bg-[#f0f0ff]"
              >
                ‹
              </button>
              <span className="font-bold text-[#3937b8]">{activeMonth.getMonth() + 1}월</span>
              <button
                type="button"
                onClick={() =>
                  setActiveMonth(new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1))
                }
                aria-label="다음 달"
                className="rounded-md px-2 py-1 font-semibold text-slate-500 hover:bg-[#f0f0ff]"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-sm font-semibold text-slate-500">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {monthCells.map((cell, index) => {
                if (!cell) return <span key={`empty-${index}`} />;
                const disabled = allowedSlots
                  ? !allowedSlots.some((slot) => isSameDay(slot, cell))
                  : cell.getTime() < today.getTime();
                const selected = isSameDay(cell, selectedDate);
                return (
                  <button
                    key={cell.getTime()}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedDate(cell)}
                    className={`h-10 rounded-lg border font-semibold ${
                      selected
                        ? "border-[#3937b8] text-[#3937b8]"
                        : "border-transparent text-[#182033] disabled:text-slate-300"
                    }`}
                  >
                    {cell.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <h3 className="mb-4 text-base font-bold">
            {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 오전
          </h3>
          <div className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {morningSlots.map(renderSlotButton)}
          </div>
          <h3 className="mb-4 text-base font-bold">
            {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 오후
          </h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {afternoonSlots.map(renderSlotButton)}
          </div>

          <div className="mt-16 flex gap-4">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg bg-[#f0f0ff] px-10 py-4 font-semibold text-slate-600"
            >
              {backLabel}
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={value.length === 0 || isSubmitting}
              className="rounded-lg bg-[#3937b8] px-12 py-4 font-semibold text-white disabled:opacity-50"
            >
              {isSubmitting ? "처리 중" : submitLabel}
            </button>
          </div>
        </div>

        <div>
          <h2 className="mb-5 text-lg font-bold">
            선택된 일정 후보 목록{" "}
            <span className="font-medium text-slate-400">(최대 {MAX_CANDIDATE_TIMES}개)</span>
          </h2>
          {value.length === 0 ? (
            <p className="text-sm text-slate-500">아직 선택한 후보 시간이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {value.map((candidate) => (
                <li
                  key={candidate.getTime()}
                  className="flex items-center justify-between rounded-lg border border-[#dfe3ec] bg-[#f8f9fd] px-5 py-4 text-sm font-semibold"
                >
                  <span>{formatCandidateLabel(candidate)}</span>
                  <button
                    type="button"
                    onClick={() => removeCandidate(candidate)}
                    aria-label={`${formatCandidateLabel(candidate)} 후보 제거`}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
