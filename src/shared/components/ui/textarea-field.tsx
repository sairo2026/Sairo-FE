"use client";

import { useId } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import { FIELD_GAP_CLASS, FieldLabel } from "./field-label";

export type TextAreaFieldProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange" | "value"
> & {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  hint?: string;
};

export function TextAreaField({
  label,
  value,
  onValueChange,
  error,
  hint,
  id,
  rows = 5,
  className,
  ...rest
}: TextAreaFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  return (
    <div className={cn("flex flex-col", FIELD_GAP_CLASS)}>
      <FieldLabel htmlFor={fieldId} required={rest.required}>
        {label}
      </FieldLabel>
      <textarea
        {...rest}
        id={fieldId}
        rows={rows}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(
          "rounded-control border bg-surface p-4 text-body text-ink focus:border-primary focus:bg-white disabled:cursor-not-allowed disabled:text-ink-3",
          error ? "border-danger" : "border-line",
          className,
        )}
      />
      {error ? (
        <p id={messageId} role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-caption text-ink-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
