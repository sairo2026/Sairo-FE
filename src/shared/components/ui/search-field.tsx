"use client";

import { useId } from "react";
import type { FormEvent } from "react";

export type SearchFieldProps = {
  label?: string;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  onSearch: () => void;
};

/** 목록 화면 공통 검색창. 검색어 원문은 URL에 넣지 않으므로 부모가 상태로만 다룬다. */
export function SearchField({
  label = "검색",
  placeholder = "검색어를 입력해 주세요.",
  value,
  onValueChange,
  onSearch,
}: SearchFieldProps) {
  const id = useId();
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSearch();
  }
  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="flex h-14 items-center gap-2 rounded-control border border-line bg-surface px-4 focus-within:border-primary focus-within:bg-white"
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        maxLength={100}
        onChange={(event) => onValueChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-body font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-3"
      />
      <button
        type="submit"
        className="h-9 shrink-0 rounded-small bg-primary px-4 text-caption font-semibold text-white hover:bg-primary-hover"
      >
        검색
      </button>
    </form>
  );
}
