import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export const FIELD_GAP_CLASS = "gap-3";
export const FIELD_LABEL_CLASS = "text-body font-semibold text-ink";

const OPTIONAL_SUFFIX = /^(.*?)(\s*)\(선택\)$/;

/** 라벨 끝의 "(선택)"은 본문보다 옅고 가는 글씨로 보여 필수 항목과 구분한다. 글자 내용과 띄어쓰기는 그대로다. */
function withOptionalMark(children: ReactNode): ReactNode {
  if (typeof children !== "string") return children;
  const matched = OPTIONAL_SUFFIX.exec(children);
  if (!matched) return children;
  const [, base, gap] = matched;
  return (
    <>
      {base}
      {gap}
      <span className={cn("font-normal text-ink-2", gap === "" && "ml-1")}>(선택)</span>
    </>
  );
}

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
        {withOptionalMark(children)}
        {star}
      </legend>
    );
  }
  return (
    <label htmlFor={htmlFor} className={cn(FIELD_LABEL_CLASS, className)}>
      {withOptionalMark(children)}
      {star}
    </label>
  );
}
