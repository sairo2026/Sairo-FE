"use client";

import { DateTimeField } from "@/shared/components/ui/date-time-field";

export function DateTimePair({
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
  error,
}: {
  label: string;
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-caption font-semibold text-ink">{label}</legend>
      <div className="flex flex-wrap gap-3">
        <DateTimeField
          label={`${label} 날짜`}
          kind="date"
          value={date}
          onValueChange={onDateChange}
          error={error}
        />
        <DateTimeField
          label={`${label} 시각`}
          kind="time"
          value={time}
          onValueChange={onTimeChange}
        />
      </div>
    </fieldset>
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "success"; children: string }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={tone === "error" ? "text-caption text-danger" : "text-caption text-ink-2"}
    >
      {children}
    </p>
  );
}

export function DraftNotice({ extra }: { extra?: string }) {
  return (
    <p className="rounded-card-flat border border-line bg-surface px-4 py-3 text-caption text-ink-2">
      {extra ? `${extra} ` : ""}변호사 검토 전 초안이며 법적 효력과 적합성은 검토 뒤 확정합니다.
    </p>
  );
}
