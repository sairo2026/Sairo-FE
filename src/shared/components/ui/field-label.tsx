"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export const FIELD_GAP_CLASS = "gap-5";
export const FIELD_LABEL_CLASS = "text-h2 font-semibold text-ink";

export const OFFICE_FIELD_GAP_CLASS = "gap-2";
export const OFFICE_FIELD_LABEL_CLASS = "text-body font-bold text-ink";

const OfficeFieldContext = createContext(false);

/** 사무소 업무 폼 안에서 라벨을 14 Bold, 라벨과 입력창 간격을 8px로 바꾼다. 인증 화면은 감싸지 않으므로 20 SemiBold, 간격 20px 그대로다. */
export function OfficeFieldScope({ children }: { children: ReactNode }) {
  return <OfficeFieldContext.Provider value>{children}</OfficeFieldContext.Provider>;
}

export function useIsOfficeField() {
  return useContext(OfficeFieldContext);
}

export function useFieldGapClass() {
  return useContext(OfficeFieldContext) ? OFFICE_FIELD_GAP_CLASS : FIELD_GAP_CLASS;
}

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
      <span className={cn("font-semibold text-ink-3", gap === "" && "ml-1")}>(선택)</span>
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

/** 폼 항목 라벨. 글자 20 SemiBold이고 필수 별표는 장식이라 스크린리더가 읽지 않는다. */
export function FieldLabel({
  htmlFor,
  required,
  as = "label",
  className,
  children,
}: FieldLabelProps) {
  const isOffice = useContext(OfficeFieldContext);
  const labelClass = isOffice ? OFFICE_FIELD_LABEL_CLASS : FIELD_LABEL_CLASS;
  const star = required ? (
    <span aria-hidden="true" className="ml-1 text-required">
      *
    </span>
  ) : null;
  if (as === "legend") {
    return (
      <legend className={cn(labelClass, isOffice ? "mb-2" : "mb-3", className)}>
        {withOptionalMark(children)}
        {star}
      </legend>
    );
  }
  return (
    <label htmlFor={htmlFor} className={cn(labelClass, isOffice && "leading-5", className)}>
      {withOptionalMark(children)}
      {star}
    </label>
  );
}
