"use client";

import type { FormEvent, ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";

/** 필터 입력을 모아 조회 버튼으로 한 번에 적용하는 검색 영역. */
export function OpsFilterBar({
  label,
  onApply,
  onReset,
  children,
}: {
  label: string;
  onApply: () => void;
  onReset?: () => void;
  children: ReactNode;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply();
  }
  return (
    <form
      role="search"
      aria-label={label}
      onSubmit={submit}
      className="flex flex-wrap items-end gap-4 rounded-card-flat border border-line bg-white p-4"
    >
      {children}
      <div className="flex gap-2">
        <Button type="submit" variant="submit" size="sm">
          조회
        </Button>
        {onReset ? (
          <Button type="button" variant="cancel" size="sm" onClick={onReset}>
            초기화
          </Button>
        ) : null}
      </div>
    </form>
  );
}
