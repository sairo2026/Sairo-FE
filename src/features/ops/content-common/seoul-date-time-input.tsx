"use client";

import { DateTimeField } from "@/shared/components/ui/date-time-field";
import type { SeoulDateTime } from "./seoul-time";

export function SeoulDateTimeInput({
  label,
  value,
  onChange,
  error,
  disabled,
}: {
  label: string;
  value: SeoulDateTime;
  onChange: (next: SeoulDateTime) => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <DateTimeField
        label={`${label} 날짜`}
        kind="date"
        value={value.date}
        disabled={disabled}
        error={error}
        onValueChange={(date) => onChange({ ...value, date })}
      />
      <DateTimeField
        label={`${label} 시각`}
        kind="time"
        value={value.time}
        disabled={disabled}
        onValueChange={(time) => onChange({ ...value, time })}
      />
    </div>
  );
}
