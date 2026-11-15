"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHomeSummary } from "@/features/home/hooks/home-queries";
import { Button } from "@/shared/components/ui/button";
import { logout } from "../api/auth-context.api";
import { AUTH_ROUTES } from "../model/routes";

const HEADER_LINK_CLASS =
  "inline-flex h-9 items-center gap-1.5 rounded-control border border-line bg-white px-3.5 text-caption font-medium text-ink-2 transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary active:bg-primary-line";

/** 사무소 화면 상단의 알림, 내 계정, 지원, 로그아웃. 좁은 화면에서는 줄을 바꿔 그대로 보인다. */
export function OfficeHeaderActions() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const summary = useHomeSummary();
  const unreadCount = summary.data?.unreadNotificationCount ?? 0;
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      router.replace(AUTH_ROUTES.login);
    },
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href="/notifications" className={HEADER_LINK_CLASS}>
        알림
        {unreadCount > 0 ? (
          <span
            aria-label={`읽지 않은 알림 ${unreadCount}건`}
            className="inline-flex min-w-5 justify-center rounded-full bg-primary px-1.5 text-caption font-bold text-white"
          >
            {unreadCount}
          </span>
        ) : null}
      </Link>
      <Link href={AUTH_ROUTES.account} className={HEADER_LINK_CLASS}>
        내 계정
      </Link>
      <Link href={AUTH_ROUTES.support} className={HEADER_LINK_CLASS}>
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
        <p role="alert" className="w-full text-caption text-danger">
          로그아웃하지 못했습니다. 다시 시도해 주세요.
        </p>
      ) : null}
    </div>
  );
}
