"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { ButtonLink } from "@/shared/components/ui/button";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { fetchCustomerPortalConfirmed } from "../api/follow.api";
import { kstParts } from "../model/time";
import { ManagerLine } from "./customer-link-screen";

function ReturnToPortal({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <ButtonLink href="/visit/portal" variant="cancel">
        이전 화면으로 돌아가기
      </ButtonLink>
      {children}
    </div>
  );
}

export function CustomerPortalConfirmedScreen({ coordinationId }: { coordinationId: number }) {
  const confirmed = useQuery({
    queryKey: ["customer-portal-confirmed", coordinationId],
    queryFn: ({ signal }) => fetchCustomerPortalConfirmed(coordinationId, signal),
    enabled: Number.isSafeInteger(coordinationId) && coordinationId > 0,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  if (!Number.isSafeInteger(coordinationId) || coordinationId <= 0)
    return (
      <ReturnToPortal>
        <ErrorScreen kind="not-found" />
      </ReturnToPortal>
    );
  if (confirmed.isPending)
    return (
      <ReturnToPortal>
        <PageSkeleton />
      </ReturnToPortal>
    );
  if (confirmed.isError) {
    if (confirmed.error instanceof ApiError && confirmed.error.code === "PUBLIC_LINK_EXPIRED") {
      return (
        <ReturnToPortal>
          <EmptyState
            title="일정 열람 기간이 지났습니다"
            description="일정은 마지막 방문 종료 후 24시간까지 확인할 수 있습니다. 사무소에 문의해 주세요."
          />
        </ReturnToPortal>
      );
    }
    if (confirmed.error instanceof ApiError && confirmed.error.status === 404) {
      return (
        <ReturnToPortal>
          <EmptyState
            title="고객 확인이 필요합니다"
            description="방문 요청 링크에서 이메일을 다시 확인해 주세요."
          />
        </ReturnToPortal>
      );
    }
    return (
      <ReturnToPortal>
        <ErrorScreen
          kind={toErrorScreenKind(confirmed.error)}
          onRetry={() => void confirmed.refetch()}
        />
      </ReturnToPortal>
    );
  }

  const schedule = confirmed.data;
  const canShowVisits = schedule.state === "VALID";
  const unavailable = {
    CANCELLED: {
      title: "취소된 일정입니다",
      description: "새 방문이 필요하면 사무소에 문의해 주세요.",
    },
    RESCHEDULE_REQUIRED: {
      title: "일정을 다시 조율 중입니다",
      description: "변경된 일정이 확정되면 다시 확인해 주세요.",
    },
    SUPERSEDED: {
      title: "이전 일정입니다",
      description: "최신 방문 요청을 확인해 주세요.",
    },
  } as const;
  return (
    <ReturnToPortal>
      <section className="space-y-6" aria-labelledby="customer-confirmed-title">
        <div className="space-y-2">
          <h1 id="customer-confirmed-title" className="text-h1 font-bold text-ink">
            확정 방문 일정
          </h1>
          {canShowVisits ? (
            <p className="text-caption text-ink-2">
              확정된 방문 {schedule.items.length}건을 확인할 수 있습니다.
            </p>
          ) : null}
        </div>
        <ManagerLine name={schedule.managerDisplayName} role={schedule.managerLegalRole} />
        {canShowVisits && schedule.items.length > 0 ? (
          <ol className="space-y-3" aria-label="확정된 방문 목록">
            {schedule.items.map((item, index) => {
              const next = schedule.items[index + 1];
              return (
                <li
                  key={item.sortOrder}
                  className="space-y-2 rounded-card border border-line bg-white p-5"
                >
                  <p className="text-body font-semibold text-ink">
                    {item.sortOrder}. {item.propertyAddress}
                  </p>
                  <p className="text-caption text-ink-2">
                    {formatSeoulDateTime(item.scheduledStartAt)} ~{" "}
                    {formatSeoulDateTime(item.scheduledEndAt)}
                  </p>
                  {item.travelDurationMinutes !== null &&
                  next !== undefined &&
                  next.sortOrder === item.sortOrder + 1 &&
                  kstParts(item.scheduledEndAt).date === kstParts(next.scheduledStartAt).date ? (
                    <p className="text-caption text-ink-2">
                      다음 방문까지 이동 {item.travelDurationMinutes}분
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : (
          <EmptyState
            {...(schedule.state === "VALID"
              ? { title: "표시할 확정 일정이 없습니다" }
              : unavailable[schedule.state])}
          />
        )}
        <p className="text-caption text-ink-2">
          문의{" "}
          <a
            href={`tel:${schedule.officeContactPhone}`}
            className="font-semibold text-primary underline clickable-link"
          >
            {schedule.officeContactPhone}
          </a>
        </p>
        <p className="text-caption text-ink-2">
          일정은 마지막 방문 종료 후 24시간까지 확인할 수 있습니다.
        </p>
      </section>
    </ReturnToPortal>
  );
}
