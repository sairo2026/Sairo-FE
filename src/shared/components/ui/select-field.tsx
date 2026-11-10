"use client";

import { useId } from "react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export type SelectOption = { value: string; label: string; isDisabled?: boolean };

export type SelectFieldProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "onChange" | "value"
> & {
  label: string;
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
};

export function SelectField({
  label,
  value,
  options,
  onValueChange,
  placeholder,
  error,
  required,
  id,
  className,
  ...rest
}: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={selectId} className="text-caption font-semibold text-ink">
        {label}
      </label>
      <select
        {...rest}
        id={selectId}
        value={value}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(
          "h-14 rounded-control border bg-surface px-4 text-body font-medium text-ink focus:border-primary focus:bg-white disabled:cursor-not-allowed disabled:text-ink-3",
          error ? "border-danger" : "border-line",
        )}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.isDisabled}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={errorId} role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type RadioGroupProps = {
  legend: string;
  name: string;
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  error?: string;
};

export function RadioGroup({
  legend,
  name,
  value,
  options,
  onValueChange,
  error,
}: RadioGroupProps) {
  return (
    <fieldset className="flex flex-col gap-2" aria-invalid={error ? true : undefined}>
      <legend className="mb-2 text-caption font-semibold text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-4">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "inline-flex items-center gap-2 text-body text-ink",
              option.isDisabled && "cursor-not-allowed text-ink-3",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={option.isDisabled}
              onChange={() => onValueChange(option.value)}
              className="h-5 w-5 accent-primary"
            />
            {option.label}
          </label>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export type CheckboxProps = {
  label: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  id?: string;
};

/** 선택 전·선택·비활성 상태와 키보드 포커스를 표시하는 체크박스. */
export function Checkbox({ label, checked, onCheckedChange, disabled, name, id }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <label
      htmlFor={inputId}
      className={cn(
        "inline-flex items-center gap-2 text-caption text-ink",
        disabled && "cursor-not-allowed text-ink-3",
      )}
    >
      <input
        id={inputId}
        name={name}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-control border border-line bg-surface text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
          checked && "border-primary bg-primary",
          disabled && !checked && "opacity-60",
        )}
      >
        {checked ? (
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
            <path
              d="M3 8.5l3.2 3L13 4.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      {label}
    </label>
  );
}

export type ToggleProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function Toggle({ label, checked, onCheckedChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-ink-3",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

export type TermsItemProps = {
  label: string;
  isRequired: boolean;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  href?: string;
  onViewFull?: () => void;
  viewFullLabel?: string;
};

/** 항목별 체크, 필수·선택 표시, 전문 보기 링크를 한 행에 둔다. */
export function TermsItem({
  label,
  isRequired,
  checked,
  onCheckedChange,
  href,
  onViewFull,
  viewFullLabel,
}: TermsItemProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        label={
          <span>
            {label}{" "}
            <span className="font-semibold text-primary">({isRequired ? "필수" : "선택"})</span>
          </span>
        }
      />
      {onViewFull ? (
        <button
          type="button"
          onClick={onViewFull}
          aria-label={viewFullLabel}
          className="shrink-0 text-caption text-ink-2 underline"
        >
          전문 보기
        </button>
      ) : href ? (
        <a
          href={href}
          className="text-caption text-ink-2 underline"
          target="_blank"
          rel="noreferrer"
        >
          전문 보기
        </a>
      ) : null}
    </div>
  );
}
