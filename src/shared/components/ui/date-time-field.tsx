"use client";

import { useId } from "react";
import { cn } from "@/shared/lib/cn";
import { FIELD_GAP_CLASS, FieldLabel } from "./field-label";

export type DateTimeFieldProps = {
  label: string;
  kind: "date" | "time";
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

/** 날짜는 YYYY-MM-DD, 시각은 HH:mm으로 받는다. 표시와 해석은 서울 시간대다. */
export function DateTimeField({
  label,
  kind,
  value,
  onValueChange,
  error,
  min,
  max,
  disabled,
  required,
  className,
}: DateTimeFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={cn("flex flex-col", FIELD_GAP_CLASS, className)}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <input
        id={id}
        type={kind}
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(
          "h-14 rounded-control border bg-surface px-4 text-body font-medium text-ink focus:border-primary focus:bg-white disabled:cursor-not-allowed disabled:text-ink-3",
          error ? "border-danger" : "border-line",
        )}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
