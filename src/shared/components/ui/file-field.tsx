"use client";

import { useId, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { FieldLabel, useFieldGapClass } from "./field-label";

export type FileFieldProps = {
  label: string;
  /** 라벨 아래에 붙는 안내 문장. */
  hint?: ReactNode;
  accept?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
};

/** 파일 선택 칸. 실제 입력은 화면 밖에 두고, 높이 58의 칸과 한국어 "파일 선택" 버튼으로 보여준다. */
export function FileField({
  label,
  hint,
  accept,
  file,
  onFileChange,
  placeholder = "선택된 파일이 없습니다.",
  error,
  disabled,
  id,
}: FileFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldGapClass = useFieldGapClass();
  return (
    <div className={cn("flex flex-col", fieldGapClass)}>
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
        {hint ? <p className="text-caption text-ink-2">{hint}</p> : null}
      </div>
      <div
        className={cn(
          "flex h-[58px] items-center gap-4 rounded-control border bg-surface px-5",
          error ? "border-danger" : "border-line",
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? messageId : undefined}
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          className="sr-only"
        />
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-body",
            file ? "font-medium text-ink" : "text-muted",
          )}
        >
          {file ? file.name : placeholder}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="h-9 shrink-0 rounded-small bg-primary px-3 text-caption font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-white disabled:text-ink-3 disabled:ring-1 disabled:ring-line"
        >
          파일 선택
        </button>
      </div>
      {error ? (
        <p id={messageId} role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
