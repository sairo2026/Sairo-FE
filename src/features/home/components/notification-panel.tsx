"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useSubscription } from "@/features/billing/hooks/billing-queries";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { markNotificationRead } from "../api/home.api";
import { homeKeys, useIsEmptyOffice, useNotifications } from "../hooks/home-queries";
import { notificationLink, notificationTypeLabel } from "../model/labels";

export type NotificationPanelProps = { onClose: () => void; onNavigate: () => void };

const ITEM_CLASS = "flex w-full flex-col gap-2 rounded-control border bg-surface p-5 text-left";

function Chevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M10 7l5 5-5 5" />
    </svg>
  );
}

/** 상단 종 아이콘에서 열리는 오른쪽 알림 패널. 전체 목록은 알림함 화면에서 본다. */
export function NotificationPanel({ onClose, onNavigate }: NotificationPanelProps) {
  const queryClient = useQueryClient();
  const closeRef = useRef<HTMLButtonElement>(null);
  const { role, isReadOnly } = useOfficeAccess();
  const isOwner = role === "OWNER";
  const isEmptyOffice = useIsEmptyOffice(isOwner && !isReadOnly);
  const subscription = useSubscription(isOwner);
  const needsCard = isOwner && subscription.data?.readiness.hasBillingKey === false;
  const query = useNotifications({ unreadOnly: false, page: 0, size: 25 });
  const read = useMutation({
    mutationFn: (notificationId: number) => markNotificationRead(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: homeKeys.all }),
  });

  useEffect(() => {
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const items = query.data?.items ?? [];

  return (
    <aside
      role="dialog"
      aria-label="알림"
      className="fixed top-0 right-0 z-40 flex h-dvh w-[308px] max-w-full flex-col gap-5 overflow-y-auto border border-line bg-white px-5 pt-6 pb-10 shadow-panel"
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="30"
            height="30"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-ink"
          >
            <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
          </svg>
          <button
            ref={closeRef}
            type="button"
            aria-label="알림 닫기"
            onClick={onClose}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-control text-ink clickable-control"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="30"
              height="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <h2 className="text-h3 font-semibold text-ink">알림</h2>
      </div>
      {needsCard && !isEmptyOffice ? (
        <div
          role="status"
          className="rounded-control bg-primary-soft px-5 py-4 text-caption text-ink-2"
        >
          결제 카드가 등록되지 않았습니다.{" "}
          <Link
            href="/billing/card-guide"
            onClick={onNavigate}
            className="font-semibold text-primary underline clickable-link"
          >
            카드 등록 안내
          </Link>
        </div>
      ) : null}
      {query.isPending ? (
        <p role="status" className="text-caption text-ink-2">
          알림을 불러오는 중입니다.
        </p>
      ) : query.isError ? (
        <p role="alert" className="text-caption text-ink-2">
          알림을 불러오지 못했습니다.{" "}
          <button
            type="button"
            className="font-semibold text-primary underline clickable-link"
            onClick={() => void query.refetch()}
          >
            다시 시도
          </button>
        </p>
      ) : items.length === 0 ? (
        <p className="text-body text-ink-2">받은 알림이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((item) => {
            const href = notificationLink(item.type, item.targetType, item.targetId);
            const className = cn(
              ITEM_CLASS,
              item.read ? "border-primary-line" : "border-primary",
              href && "clickable-row",
            );
            const content = (
              <>
                <span className="flex flex-col gap-1">
                  <span
                    className={cn(
                      "flex items-center justify-between gap-2 text-body font-semibold",
                      item.read ? "text-ink" : "text-primary",
                    )}
                  >
                    {notificationTypeLabel(item.type)}
                    {href ? <Chevron /> : null}
                  </span>
                  <span className="text-[12px] text-muted">
                    {formatSeoulDateTime(item.createdAt)}
                  </span>
                </span>
                <span className="text-caption text-ink-2">{item.message}</span>
              </>
            );
            return (
              <li key={item.notificationId}>
                {href ? (
                  <Link
                    href={href}
                    className={className}
                    onClick={() => {
                      if (!item.read) read.mutate(item.notificationId);
                      onNavigate();
                    }}
                  >
                    {content}
                  </Link>
                ) : item.read ? (
                  <div className={className}>{content}</div>
                ) : (
                  <button
                    type="button"
                    aria-label={`${item.message} 읽음 처리`}
                    className={cn(className, "clickable-row")}
                    onClick={() => read.mutate(item.notificationId)}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Link
        href="/notifications"
        onClick={onNavigate}
        className="mt-auto w-fit text-caption font-semibold text-primary underline-offset-4 clickable-link"
      >
        알림함에서 모두 보기
      </Link>
    </aside>
  );
}
