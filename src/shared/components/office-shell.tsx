import Link from "next/link";
import type { ReactNode } from "react";

export type OfficeShellProps = {
  children: ReactNode;
  active?: "home" | "properties" | "coordinations";
};

const navigation = [
  { key: "home", label: "홈 (오늘 할 일)", href: "/home" },
  { key: "properties", label: "매물 관리", href: "/properties" },
  { key: "coordinations", label: "임장 조율", href: "/coordinations" },
] as const;

export function OfficeShell({ children, active }: OfficeShellProps) {
  return (
    <div className="min-h-screen bg-white text-ink lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-surface px-6 py-6 lg:min-h-screen lg:border-r lg:border-b-0 lg:px-8 lg:pt-36">
        <nav aria-label="주요 메뉴" className="flex gap-5 overflow-x-auto lg:flex-col lg:gap-9">
          {navigation.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`shrink-0 border-b-2 pb-3 text-lg font-semibold transition-colors lg:w-fit lg:text-2xl ${
                active === item.key
                  ? "border-primary text-primary"
                  : "border-transparent text-ink hover:text-primary"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            disabled
            className="shrink-0 text-left text-lg font-semibold text-ink-3 lg:text-2xl"
          >
            계약 관리
          </button>
        </nav>
      </aside>
      <div>
        <header className="flex h-[88px] items-center gap-12 border-b border-line px-8 text-sm font-semibold text-ink-2 lg:px-16">
          <span>사이로중개사무소</span>
          <button type="button" disabled className="text-ink-3">
            설정
          </button>
        </header>
        <main className="px-5 py-10 sm:px-8 lg:px-16 lg:py-14">{children}</main>
      </div>
    </div>
  );
}
