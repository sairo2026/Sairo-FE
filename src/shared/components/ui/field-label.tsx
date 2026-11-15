import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export const FIELD_GAP_CLASS = "gap-3";
export const FIELD_LABEL_CLASS = "text-body font-semibold text-ink";

export type FieldLabelProps = {
  htmlFor?: string;
  required?: boolean;
  as?: "label" | "legend";
  className?: string;
  children: ReactNode;
};

/** 폼 항목 라벨. 글자 16 SemiBold이고 필수 별표는 장식이라 스크린리더가 읽지 않는다. */
export function FieldLabel({
  htmlFor,
  required,
  as = "label",
  className,
  children,
}: FieldLabelProps) {
  const star = required ? (
    <span aria-hidden="true" className="ml-0.5 text-required">
      *
    </span>
  ) : null;
  if (as === "legend") {
    return (
      <legend className={cn(FIELD_LABEL_CLASS, "mb-3", className)}>
        {children}
        {star}
      </legend>
    );
  }
  return (
    <label htmlFor={htmlFor} className={cn(FIELD_LABEL_CLASS, className)}>
      {children}
      {star}
    </label>
  );
}
