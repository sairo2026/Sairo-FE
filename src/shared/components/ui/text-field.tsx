"use client";

import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { formatPhone } from "@/shared/lib/format";

export type TextFieldKind = "text" | "number" | "tel" | "password";

export type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange" | "value" | "defaultValue"
> & {
  label: string;
  kind?: TextFieldKind;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  hint?: string;
  /** 입력창 오른쪽의 작은 버튼(전송·인증·검색 등). */
  actionLabel?: string;
  onAction?: () => void;
  isActionDisabled?: boolean;
  /** 인증 대기 시간 등 오른쪽에 표시할 남은 시간. */
  timerText?: string;
  /** 인증 상태 문구. */
  statusText?: ReactNode;
  required?: boolean;
};

const inputTypeByKind: Record<TextFieldKind, string> = {
  text: "text",
  number: "text",
  tel: "tel",
  password: "password",
};

export function TextField({
  label,
  kind = "text",
  value,
  onValueChange,
  error,
  hint,
  actionLabel,
  onAction,
  isActionDisabled,
  timerText,
  statusText,
  required,
  id,
  className,
  maxLength,
  ...rest
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const hasMessage = Boolean(error || hint || statusText);

  function handleChange(raw: string) {
    if (kind === "tel") return onValueChange(formatPhone(raw));
    if (kind === "number") return onValueChange(raw.replace(/\D/g, ""));
    return onValueChange(raw);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={inputId} className="text-caption font-semibold text-ink">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-primary">
            *
          </span>
        ) : null}
      </label>
      <div
        className={cn(
          "flex h-14 items-center gap-2 rounded-control border bg-surface px-4 focus-within:border-primary focus-within:bg-white",
          error ? "border-danger" : "border-line",
        )}
      >
        <input
          {...rest}
          id={inputId}
          type={inputTypeByKind[kind]}
          inputMode={kind === "number" ? "numeric" : kind === "tel" ? "tel" : rest.inputMode}
          autoComplete={
            kind === "password" ? (rest.autoComplete ?? "current-password") : rest.autoComplete
          }
          value={value}
          required={required}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={hasMessage ? messageId : undefined}
          onChange={(event) => handleChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-body font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-3 disabled:cursor-not-allowed disabled:text-ink-3"
        />
        {timerText ? (
          <span role="timer" className="text-body font-medium text-danger">
            {timerText}
          </span>
        ) : null}
        {actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            disabled={isActionDisabled}
            className="h-9 shrink-0 rounded-small bg-primary px-4 text-caption font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-white disabled:text-ink-3 disabled:ring-1 disabled:ring-line"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      {hasMessage ? (
        <p
          id={messageId}
          role={error ? "alert" : undefined}
          className={cn("text-caption", error ? "text-danger" : "text-ink-2")}
        >
          {error ?? statusText ?? hint}
        </p>
      ) : null}
      {maxLength && !error ? (
        <p className="text-right text-caption text-ink-3" aria-hidden="true">
          {Array.from(value).length}/{maxLength}
        </p>
      ) : null}
    </div>
  );
}
