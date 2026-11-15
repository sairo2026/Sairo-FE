"use client";

import { useId } from "react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import { FIELD_GAP_CLASS, FieldLabel } from "./field-label";

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
    <div className={cn("flex flex-col", FIELD_GAP_CLASS, className)}>
      <FieldLabel htmlFor={selectId} required={required}>
        {label}
      </FieldLabel>
      <select
        {...rest}
        id={selectId}
        value={value}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(
          "h-14 min-w-0 max-w-full rounded-control border bg-surface px-4 text-body font-medium text-ink focus:border-primary focus:bg-white disabled:cursor-not-allowed disabled:text-ink-3",
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

const CHECK_PATH = "M3 8.5l3.2 3L13 4.5";

export type RadioProps = {
  label?: ReactNode;
  ariaLabel?: string;
  name: string;
  value?: string;
  checked: boolean;
  onSelect: () => void;
  disabled?: boolean;
  isInvalid?: boolean;
  id?: string;
  className?: string;
};

/** 선택 전·호버·선택·포커스·비활성·오류 상태를 표시하는 라디오. 라벨 전체가 클릭 영역이다. */
export function Radio({
  label,
  ariaLabel,
  name,
  value,
  checked,
  onSelect,
  disabled,
  isInvalid,
  id,
  className,
}: RadioProps) {
  return (
    <label
      className={cn(
        "group inline-flex min-h-11 items-center gap-3 text-body text-ink",
        disabled ? "cursor-not-allowed text-ink-3" : "cursor-pointer",
        className,
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={onSelect}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "box-border h-[18px] w-[18px] shrink-0 rounded-full bg-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
          disabled
            ? checked
              ? "border-[5px] border-ink-3"
              : "border-[1.5px] border-line bg-surface"
            : checked
              ? "border-[5px] border-primary group-hover:border-primary-hover"
              : cn(
                  "border-[1.5px] group-hover:border-primary group-hover:bg-primary-soft",
                  isInvalid ? "border-danger" : "border-control",
                ),
        )}
      />
      {label}
    </label>
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
    <fieldset className="flex min-w-0 flex-col gap-2" aria-invalid={error ? true : undefined}>
      <FieldLabel as="legend">{legend}</FieldLabel>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            label={option.label}
            checked={value === option.value}
            disabled={option.isDisabled}
            isInvalid={Boolean(error)}
            onSelect={() => onValueChange(option.value)}
          />
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
  label?: ReactNode;
  ariaLabel?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  isInvalid?: boolean;
  name?: string;
  id?: string;
  className?: string;
};

/** 선택 전·호버·선택·포커스·비활성·오류 상태를 표시하는 체크박스. 라벨 전체가 클릭 영역이다. */
export function Checkbox({
  label,
  ariaLabel,
  checked,
  onCheckedChange,
  disabled,
  isInvalid,
  name,
  id,
  className,
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <label
      htmlFor={inputId}
      className={cn(
        "group inline-flex min-h-11 items-center gap-3 text-body text-ink",
        disabled ? "cursor-not-allowed text-ink-3" : "cursor-pointer",
        className,
      )}
    >
      <input
        id={inputId}
        name={name}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={isInvalid ? true : undefined}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-small border-[1.5px] text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
          disabled
            ? checked
              ? "border-ink-3 bg-ink-3"
              : "border-line bg-surface"
            : checked
              ? "border-primary bg-primary group-hover:border-primary-hover group-hover:bg-primary-hover"
              : cn(
                  "bg-white group-hover:border-primary group-hover:bg-primary-soft",
                  isInvalid ? "border-danger" : "border-control",
                ),
        )}
      >
        {checked ? (
          <svg viewBox="0 0 16 16" width="20" height="20" fill="none">
            <path
              d={CHECK_PATH}
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
  isInvalid?: boolean;
};

/** 켜짐은 브랜드 색과 오른쪽 손잡이, 꺼짐은 회색과 왼쪽 손잡이로 구분하는 스위치. */
export function Toggle({ label, checked, onCheckedChange, disabled, isInvalid }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-invalid={isInvalid ? true : undefined}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-9 w-[66px] shrink-0 cursor-pointer items-center rounded-full transition-colors after:absolute after:-inset-x-2 after:-inset-y-1 after:content-[''] disabled:cursor-not-allowed",
        disabled
          ? checked
            ? "bg-ink-3"
            : "bg-line"
          : checked
            ? "bg-primary hover:bg-primary-hover"
            : "bg-control hover:bg-ink-2",
        isInvalid && "ring-2 ring-danger ring-offset-2",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-7 w-7 rounded-full bg-white transition-transform",
          checked ? "translate-x-[34px]" : "translate-x-1",
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
        className="font-medium"
        label={
          <span>
            {label}{" "}
            <span className="font-medium text-primary">({isRequired ? "필수" : "선택"})</span>
          </span>
        }
      />
      {onViewFull ? (
        <button
          type="button"
          onClick={onViewFull}
          aria-label={viewFullLabel}
          className="shrink-0 text-caption text-ink-2 underline hover:text-primary active:text-primary-pressed"
        >
          전문 보기
        </button>
      ) : href ? (
        <a
          href={href}
          className="text-caption text-ink-2 underline hover:text-primary active:text-primary-pressed"
          target="_blank"
          rel="noreferrer"
        >
          전문 보기
        </a>
      ) : null}
    </div>
  );
}
