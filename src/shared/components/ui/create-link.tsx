import Link from "next/link";
import type { ReactNode } from "react";

const CREATE_CLASS =
  "inline-flex h-14 shrink-0 items-center justify-center gap-1 rounded-control bg-primary px-6 text-body font-bold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-ink-3";

function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20" fill="none">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** 목록 화면의 등록 버튼. 더하기 아이콘과 굵은 글자로 검색창 왼쪽에 둔다. */
export function CreateLink({
  href,
  children,
  isDisabled,
}: {
  href: string;
  children: ReactNode;
  isDisabled?: boolean;
}) {
  return (
    <Link href={href} aria-disabled={isDisabled || undefined} className={CREATE_CLASS}>
      <PlusIcon />
      {children}
    </Link>
  );
}

/** 이동 없이 창을 여는 등록 버튼. 모양은 CreateLink와 같다. */
export function CreateButton({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={CREATE_CLASS}>
      <PlusIcon />
      {children}
    </button>
  );
}
