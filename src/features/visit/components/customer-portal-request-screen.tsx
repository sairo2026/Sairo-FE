"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { fetchCustomerPortalRequest } from "../api/follow.api";
import { CandidateSummary, TimeForm } from "./customer-link-screen";
import { CustomerLinkPrivacyNotice, LinkCommonNotices } from "./link-legal-notices";

export function CustomerPortalRequestScreen({ coordinationId }: { coordinationId: number }) {
  const request = useQuery({
    queryKey: ["customer-portal-request", coordinationId],
    queryFn: ({ signal }) => fetchCustomerPortalRequest(coordinationId, signal),
    enabled: Number.isSafeInteger(coordinationId) && coordinationId > 0,
    retry: false,
  });

  if (!Number.isSafeInteger(coordinationId) || coordinationId <= 0)
    return <ErrorScreen kind="not-found" />;
  if (request.isPending) return <PageSkeleton />;
  if (request.isError) {
    if (request.error instanceof ApiError && [404, 410].includes(request.error.status)) {
      return (
        <ErrorScreen
          kind="not-found"
          title="요청을 열 수 없습니다"
          description="본인 확인이 끝났거나 응답 기간이 지났습니다. 사무소에서 받은 방문 요청 링크로 다시 확인해 주세요."
        />
      );
    }
    return (
      <ErrorScreen kind={toErrorScreenKind(request.error)} onRetry={() => void request.refetch()} />
    );
  }

  const data = request.data;
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/visit/portal"
        className="self-start text-caption font-semibold text-primary clickable-link"
      >
        ← 내 방문 요청으로 돌아가기
      </Link>
      <header className="space-y-2">
        <h1 className="text-h2 font-bold text-ink">방문 가능한 시간을 알려주세요</h1>
        <p className="text-caption text-ink-2">
          {data.officeName}의 방문 요청입니다. 이전에 확인한 유효한 시간이 있으면 표시합니다. 이번
          요청에 맞게 확인·수정한 뒤 제출해 주세요.
        </p>
      </header>
      <section className="rounded-card-flat border border-line bg-white p-5 text-caption text-ink-2">
        <p className="font-semibold text-ink">{data.officeName}</p>
        <p>담당 {data.managerDisplayName}</p>
        <p>응답 마감 {formatSeoulDateTime(data.linkExpiresAt)}</p>
        <p>
          문의{" "}
          <a
            href={`tel:${data.officeContactPhone}`}
            className="font-semibold text-primary underline clickable-link"
          >
            {data.officeContactPhone}
          </a>
        </p>
      </section>
      <CandidateSummary link={data} />
      <TimeForm portalCoordinationId={coordinationId} link={data} />
      <CustomerLinkPrivacyNotice
        officeName={data.officeName}
        officeContactPhone={data.officeContactPhone}
        retentionDays={data.privacyNotice.retentionDays}
      />
      <LinkCommonNotices
        audience="customer"
        officeName={data.officeName}
        officeContactPhone={data.officeContactPhone}
        retentionDays={data.privacyNotice.retentionDays}
      />
    </div>
  );
}
