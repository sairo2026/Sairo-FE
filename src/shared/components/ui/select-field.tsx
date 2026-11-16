"use client";

import { useId } from "react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import { FieldLabel, useFieldGapClass } from "./field-label";
import { RequirementMark } from "./requirement-mark";

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
  /** inline은 필터 막대용으로 라벨을 선택 상자 왼쪽에 둔다. block은 입력 칸과 같은 58px 높이로 폭을 가득 채운다. */
  layout?: "stacked" | "inline" | "block";
};

function SelectChevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink"
    >
      <path
        d="M5 7.5l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  layout = "stacked",
  ...rest
}: SelectFieldProps) {
  const fieldGapClass = useFieldGapClass();
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;
  const isInline = layout === "inline";
  const isBlock = layout === "block";
  return (
    <div
      className={cn(
        "flex",
        isInline ? "flex-row items-center gap-5" : cn("flex-col", fieldGapClass),
        className,
      )}
    >
      {isInline ? (
        <label htmlFor={selectId} className="shrink-0 text-body font-semibold text-ink-2">
          {label}
        </label>
      ) : (
        <FieldLabel htmlFor={selectId} required={required}>
          {label}
        </FieldLabel>
      )}
      <div className={cn("relative max-w-full", isBlock ? "w-full" : "min-w-[115px] self-start")}>
        <select
          {...rest}
          id={selectId}
          value={value}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onValueChange(event.target.value)}
          className={cn(
            "w-full min-w-0 max-w-full appearance-none text-body font-medium text-ink focus:border-primary disabled:cursor-not-allowed disabled:text-ink-3",
            isBlock
              ? "h-[58px] rounded-control border bg-surface pl-5 pr-12 focus:bg-white"
              : "h-[42px] rounded-small border bg-white pl-[10px] pr-10",
            error ? "border-danger" : isBlock ? "border-line" : "border-[#9ca3af]",
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
        <SelectChevron />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const CHECK_PATH = "M3 8.5l3.2 3L13 4.5";

/**
 * 시각적으로 숨긴 입력은 라벨(relative) 안에 고정한다. sr-only(위치 기준 없는 absolute)를 쓰면 스크롤 영역 안에서
 * 라벨을 눌러 포커스가 옮겨질 때 브라우저가 그 입력을 화면에 보이려고 문서와 스크롤 영역을 맨 위나 아래로 움직인다.
 */
const HIDDEN_INPUT_CLASS =
  "peer absolute inset-0 m-0 h-full w-full cursor-[inherit] appearance-none opacity-0";

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
        "group relative inline-flex min-h-11 items-center gap-3 text-body text-ink",
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
        className={HIDDEN_INPUT_CLASS}
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
  /** segmented는 선택지를 58px 높이의 칸 버튼으로 보여 준다. 선택된 칸은 브랜드 테두리와 글자색을 쓴다. */
  variant?: "default" | "segmented";
  required?: boolean;
};

export function RadioGroup({
  legend,
  name,
  value,
  options,
  onValueChange,
  error,
  variant = "default",
  required,
}: RadioGroupProps) {
  const isSegmented = variant === "segmented";
  return (
    <fieldset className="flex min-w-0 flex-col gap-2" aria-invalid={error ? true : undefined}>
      <FieldLabel as="legend" required={required}>
        {legend}
      </FieldLabel>
      <div className={cn("flex flex-wrap", isSegmented ? "gap-4" : "gap-x-6 gap-y-1")}>
        {options.map((option) =>
          isSegmented ? (
            <label
              key={option.value}
              className={cn(
                "relative inline-flex h-[58px] items-center justify-center rounded-control border bg-surface px-6 text-body font-medium focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary",
                option.isDisabled ? "cursor-not-allowed" : "cursor-pointer",
                value === option.value ? "border-primary text-primary" : "border-line text-ink",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                disabled={option.isDisabled}
                onChange={() => onValueChange(option.value)}
                className={HIDDEN_INPUT_CLASS}
              />
              {option.label}
            </label>
          ) : (
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
          ),
        )}
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
  /** 동의·확인 항목이면 라벨 뒤에 필수·선택 표시를 붙인다. */
  requirement?: "required" | "optional";
  /** form은 가입 약관 목록용 규격이다. 높이 36, 선택 전 테두리 1px과 연한 채움을 쓴다. */
  variant?: "default" | "form";
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
  requirement,
  variant = "default",
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const isForm = variant === "form";
  return (
    <label
      htmlFor={inputId}
      className={cn(
        "group relative inline-flex items-center gap-3 text-body text-ink",
        isForm ? "min-h-9" : "min-h-11",
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
        className={HIDDEN_INPUT_CLASS}
      />
      <span
        aria-hidden="true"
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-small text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
          isForm ? "border" : "border-[1.5px]",
          disabled
            ? checked
              ? "border-ink-3 bg-ink-3"
              : "border-line bg-surface"
            : checked
              ? "border-primary bg-primary group-hover:border-primary-hover group-hover:bg-primary-hover"
              : cn(
                  "group-hover:border-primary group-hover:bg-primary-soft",
                  isForm ? "bg-surface" : "bg-white",
                  isInvalid ? "border-danger" : isForm ? "border-line" : "border-control",
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
      {requirement ? (
        <span>
          {label} <RequirementMark requirement={requirement} />
        </span>
      ) : (
        label
      )}
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
        variant="form"
        requirement={isRequired ? "required" : "optional"}
        label={label}
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
