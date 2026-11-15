"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { NotificationPanel } from "@/features/home/components/notification-panel";
import { useHomeSummary } from "@/features/home/hooks/home-queries";
import { Button } from "@/shared/components/ui/button";
import { logout } from "../api/auth-context.api";
import { AUTH_ROUTES } from "../model/routes";

const HEADER_LINK_CLASS =
  "inline-flex h-9 items-center gap-1.5 rounded-control border border-line bg-white px-3.5 text-caption font-medium text-ink-2 transition-colors clickable-control";

/** 사무소 화면 상단의 알림 종, 내 계정·지원·로그아웃 메뉴. */
export function OfficeHeaderActions() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const summary = useHomeSummary();
  const unreadCount = summary.data?.unreadNotificationCount ?? 0;
  const [panelOpen, setPanelOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      router.replace(AUTH_ROUTES.login);
    },
  });

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen((open) => !open)}
          className={HEADER_LINK_CLASS}
        >
          내 계정
          <span aria-hidden="true">{menuOpen ? "▴" : "▾"}</span>
        </button>
        {menuOpen ? (
          <div
            id={menuId}
            className="absolute top-full right-0 z-30 mt-2 flex w-40 flex-col gap-1 rounded-control border border-line bg-white p-2 shadow-popup"
          >
            <Link
              href={AUTH_ROUTES.account}
              onClick={() => setMenuOpen(false)}
              className="rounded-control px-3 py-2 text-caption font-medium text-ink-2 clickable-link"
            >
              내 계정
            </Link>
            <Link
              href={AUTH_ROUTES.support}
              onClick={() => setMenuOpen(false)}
              className="rounded-control px-3 py-2 text-caption font-medium text-ink-2 clickable-link"
            >
              지원
            </Link>
            <Button
              variant="ghost"
              size="sm"
              isLoading={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
            >
              로그아웃
            </Button>
            {logoutMutation.isError ? (
              <p role="alert" className="px-1 text-caption text-danger">
                로그아웃하지 못했습니다. 다시 시도해 주세요.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        aria-label={unreadCount > 0 ? `알림 열기, 읽지 않은 알림 ${unreadCount}건` : "알림 열기"}
        aria-expanded={panelOpen}
        onClick={() => setPanelOpen((open) => !open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-control text-ink clickable-control"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="36"
          height="36"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
        </svg>
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-primary"
          />
        ) : null}
      </button>
      {panelOpen ? <NotificationPanel onClose={closePanel} /> : null}
    </div>
  );
}
