import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/shared/components/ui/brand-logo";
import { OFFICE_NAV_ITEMS, SideNavItem } from "@/shared/components/ui/side-nav-item";
import { WindowScrollHint } from "@/shared/components/ui/scroll-more-hint";
import { ToastProvider } from "@/shared/components/ui/toast";
import { CookieNotice } from "@/shared/legal/cookie-notice";
import { cn } from "@/shared/lib/cn";

type LayoutProps = { children: ReactNode };

/** 고객용 사이트: 로그인 없이 링크로 여는 공개 화면. 하단에는 공개 사업자 정보 영역을 둔다. */
export function CustomerSiteLayout({ children, footer }: LayoutProps & { footer?: ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col bg-surface text-ink">
        <header className="border-b border-line bg-white px-4 py-4 sm:px-8">
          <BrandLogo className="w-28" />
        </header>
        <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-8 pb-16 sm:px-6">{children}</main>
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
      <div className="flex min-h-dvh flex-col bg-white text-ink">
        <header className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-8">
          <Link href="/" aria-label="사이로 홈">
            <BrandLogo className="w-28" />
          </Link>
          <nav aria-label="공개 메뉴" className="flex gap-5 text-body font-medium text-ink-2">
            <Link href="/pricing" className="clickable-link px-1">
              요금 안내
            </Link>
            <Link href="/legal" className="clickable-link px-1">
              약관과 정책
            </Link>
            <Link href="/login" className="clickable-link px-1">
              로그인
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-10 pb-16 sm:px-6">{children}</main>
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
      <div data-workspace className="min-h-dvh bg-surface text-ink">
        <main className="mx-auto w-full max-w-lg px-4 pt-10 pb-16 sm:px-6">
          <BrandLogo className="mb-6 w-28" />
          {children}
          <CookieNotice variant="approver" className="mt-8" />
        </main>
      </div>
    </ToastProvider>
  );
}

export type OfficeNavItem = { key: string; label: string; href: string };

export type OfficeLayoutProps = LayoutProps & {
  activeKey?: string;
  officeName?: string;
  /** 사무소명 오른쪽에 놓는 알림·내 계정·지원·로그아웃 같은 상단 동작. */
  headerActions?: ReactNode;
  /** 역할별 메뉴. 생략하면 기본 6개 메뉴를 보여준다. */
  navItems?: readonly OfficeNavItem[];
  /** board는 홈처럼 흰 바탕에 요약 카드를 배치하는 화면의 여백과 메뉴 색을 쓴다. */
  tone?: "white" | "board";
};

/** 사무소 화면: 좌측 메뉴와 상단 사무소 표시. */
export function OfficeLayout({
  children,
  activeKey,
  officeName,
  headerActions,
  navItems,
  tone = "white",
}: OfficeLayoutProps) {
  const items = navItems ?? OFFICE_NAV_ITEMS;
  return (
    <ToastProvider>
      <div
        data-workspace
        className="min-h-dvh bg-white text-ink lg:grid lg:grid-cols-[220px_minmax(0,1fr)]"
      >
        <aside
          className={cn(
            "border-b border-line px-6 py-6 lg:sticky lg:top-0 lg:z-30 lg:h-dvh lg:self-start lg:overflow-y-auto lg:border lg:px-6 lg:pt-6",
            tone === "board" ? "bg-white" : "bg-surface",
          )}
        >
          <Link href="/home" aria-label="사이로 홈" className="mb-6 block lg:mb-10">
            <BrandLogo className="w-28" />
          </Link>
          <nav aria-label="주요 메뉴" className="flex gap-5 overflow-x-auto lg:flex-col lg:gap-3">
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
        <div className="min-w-0">
          <header className="sticky top-0 z-20 flex min-h-[76px] flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line bg-white px-8 py-4 text-caption font-semibold text-ink-2">
            <span className="text-h3 font-bold text-ink">{officeName ?? "사무소"}</span>
            {headerActions}
          </header>
          <main
            className={cn(
              "px-5 pt-10 pb-28 sm:px-8",
              tone === "board" ? "lg:pt-7 lg:pr-8 lg:pl-7" : "lg:pt-8 lg:pr-8 lg:pl-9",
            )}
          >
            {children}
          </main>
        </div>
        <WindowScrollHint tone="white" className="lg:left-[220px]" />
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
      <div data-workspace className="min-h-dvh bg-surface text-ink">
        <header className="sticky top-0 z-30 flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-primary-pressed px-4 py-2 text-body font-bold text-white sm:px-6 lg:h-14 lg:flex-nowrap lg:py-0">
          <span className="flex shrink-0 items-center gap-3 whitespace-nowrap">
            <BrandLogo variant="horizontal-white" className="w-24" />
            <span>운영 콘솔</span>
          </span>
          {headerRight ? (
            <div className="flex w-full min-w-0 items-center justify-between gap-3 text-caption sm:w-auto sm:flex-1 sm:justify-end">
              {headerRight}
            </div>
          ) : null}
        </header>
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav
            aria-label="운영 메뉴"
            className="flex gap-4 overflow-x-auto border-b border-line bg-white px-6 py-4 lg:sticky lg:top-14 lg:h-[calc(100dvh-56px)] lg:self-start lg:overflow-y-auto lg:flex-col lg:border-r lg:border-b-0"
          >
            {navItems.map((item) => (
              <SideNavItem
                key={item.key}
                href={item.href}
                label={item.label}
                size="md"
                isActive={activeKey === item.key}
              />
            ))}
          </nav>
          <main className="min-w-0 px-6 pt-8 pb-28">{children}</main>
        </div>
        <WindowScrollHint tone="surface" className="lg:left-[220px]" />
      </div>
    </ToastProvider>
  );
}
