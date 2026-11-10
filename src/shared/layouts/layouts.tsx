import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/shared/components/ui/brand-logo";
import { OFFICE_NAV_ITEMS, SideNavItem } from "@/shared/components/ui/side-nav-item";
import { ToastProvider } from "@/shared/components/ui/toast";

type LayoutProps = { children: ReactNode };

/** 고객용 사이트: 로그인 없이 링크로 여는 공개 화면. 하단에는 공개 사업자 정보 영역을 둔다. */
export function CustomerSiteLayout({ children, footer }: LayoutProps & { footer?: ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col bg-white text-ink">
        <header className="border-b border-line px-4 py-4 sm:px-8">
          <BrandLogo className="w-28" />
        </header>
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        {footer ? (
          <footer className="border-t border-line bg-surface px-4 py-6">{footer}</footer>
        ) : null}
      </div>
    </ToastProvider>
  );
}

/** 공개 안내 화면(요금·약관): 로그인 없이 열리며 넓은 본문과 사업자 정보 하단을 쓴다. */
export function PublicSiteLayout({ children, footer }: LayoutProps & { footer?: ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col bg-white text-ink">
        <header className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-8">
          <Link href="/" aria-label="사이로 홈">
            <BrandLogo className="w-28" />
          </Link>
          <nav aria-label="공개 메뉴" className="flex gap-5 text-caption font-semibold text-ink-2">
            <Link href="/pricing">요금 안내</Link>
            <Link href="/legal">약관과 정책</Link>
            <Link href="/login">로그인</Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">{children}</main>
        {footer ? (
          <footer className="border-t border-line bg-surface px-4 py-8 sm:px-8">{footer}</footer>
        ) : null}
      </div>
    </ToastProvider>
  );
}

/** 승인자 비회원 화면: 메뉴 없이 한 가지 업무만 하도록 좁은 한 단 구성이다. */
export function ApproverLayout({ children }: LayoutProps) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface text-ink">
        <main className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
          <BrandLogo className="mb-6 w-28" />
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}

export type OfficeNavItem = { key: string; label: string; href: string };

export type OfficeLayoutProps = LayoutProps & {
  activeKey?: string;
  officeName?: string;
  /** 역할별 메뉴. 생략하면 기본 6개 메뉴를 보여준다. */
  navItems?: readonly OfficeNavItem[];
};

/** 사무소 화면: 좌측 메뉴와 상단 사무소 표시. */
export function OfficeLayout({ children, activeKey, officeName, navItems }: OfficeLayoutProps) {
  const items = navItems ?? OFFICE_NAV_ITEMS;
  return (
    <ToastProvider>
      <div className="min-h-screen bg-white text-ink lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-line bg-surface px-6 py-6 lg:min-h-screen lg:border-r lg:border-b-0 lg:px-8 lg:pt-8">
          <Link href="/" aria-label="사이로 홈" className="mb-6 block lg:mb-16">
            <BrandLogo className="w-32" />
          </Link>
          <nav aria-label="주요 메뉴" className="flex gap-5 overflow-x-auto lg:flex-col lg:gap-8">
            {items.map((item) => (
              <SideNavItem
                key={item.key}
                href={item.href}
                label={item.label}
                isActive={activeKey === item.key}
              />
            ))}
          </nav>
        </aside>
        <div>
          <header className="flex h-[88px] items-center border-b border-line px-8 text-caption font-semibold text-ink-2 lg:px-16">
            {officeName ?? "사무소"}
          </header>
          <main className="px-5 py-10 sm:px-8 lg:px-16 lg:py-14">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}

export type OpsNavItem = { key: string; label: string; href: string };

/** 사측 콘솔(/ops): 사무소 화면과 시각적으로 구분되는 어두운 상단 띠와 별도 메뉴를 쓴다. */
export function OpsLayout({
  children,
  navItems,
  activeKey,
  headerRight,
}: LayoutProps & { navItems: OpsNavItem[]; activeKey?: string; headerRight?: ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface text-ink">
        <header className="flex h-14 items-center justify-between gap-4 bg-primary-pressed px-6 text-body font-bold text-white">
          <span className="flex items-center gap-3">
            <BrandLogo variant="horizontal-white" className="w-24" />
            <span>운영 콘솔</span>
          </span>
          {headerRight ? (
            <div className="flex items-center gap-3 text-caption">{headerRight}</div>
          ) : null}
        </header>
        <div className="lg:grid lg:grid-cols-[220px_1fr]">
          <nav
            aria-label="운영 메뉴"
            className="flex gap-4 overflow-x-auto border-b border-line bg-white px-6 py-4 lg:min-h-[calc(100vh-56px)] lg:flex-col lg:border-r lg:border-b-0"
          >
            {navItems.map((item) => (
              <SideNavItem
                key={item.key}
                href={item.href}
                label={item.label}
                isActive={activeKey === item.key}
              />
            ))}
          </nav>
          <main className="px-6 py-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
