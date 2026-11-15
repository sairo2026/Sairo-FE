import Link from "next/link";
import type { ReactNode } from "react";

/** 목록 화면의 등록 버튼. 더하기 아이콘과 굵은 글자로 검색창 왼쪽에 둔다. */
export function CreateLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-14 shrink-0 items-center justify-center gap-1 rounded-control bg-primary px-6 text-body font-bold text-white hover:bg-primary-hover"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20" fill="none">
        <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {children}
    </Link>
  );
}
