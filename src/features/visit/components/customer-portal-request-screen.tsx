"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { ButtonLink } from "@/shared/components/ui/button";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { fetchCustomerPortalRequest } from "../api/follow.api";
import { CandidateSummary, ManagerLine, TimeForm } from "./customer-link-screen";
import { CustomerLinkPrivacyNotice, LinkCommonNotices } from "./link-legal-notices";

export function CustomerPortalRequestScreen({ coordinationId }: { coordinationId: number }) {
  const request = useQuery({
    queryKey: ["customer-portal-request", coordinationId],
    queryFn: ({ signal }) => fetchCustomerPortalRequest(coordinationId, signal),
    enabled: Number.isSafeInteger(coordinationId) && coordinationId > 0,
    retry: false,
    staleTime: 0,
    gcTime: 0,
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
          description="본인 확인이 만료됐거나 응답 기간이 지났습니다. 사무소에서 받은 방문 요청 링크로 다시 확인해 주세요."
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
      <ButtonLink href="/visit/portal" variant="cancel" className="self-start">
        내 방문 요청으로 돌아가기
      </ButtonLink>
      <header className="space-y-4">
        <h1 className="text-h1 font-bold text-ink">방문 가능한 시간을 알려주세요</h1>
        <p className="text-caption text-ink-2">
          {data.officeName}의 방문 요청입니다. 유효한 기존 시간을 확인·수정한 뒤 제출해 주세요.
        </p>
      </header>
      <section className="rounded-card-flat border border-line bg-white p-5 text-caption text-ink-2">
        <p className="font-semibold text-ink">{data.officeName}</p>
        <ManagerLine name={data.managerDisplayName} role={data.managerLegalRole} />
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
      <TimeForm key={coordinationId} portalCoordinationId={coordinationId} link={data} />
      <CustomerLinkPrivacyNotice
        officeName={data.officeName}
        officeContactPhone={data.officeContactPhone}
        retentionDays={data.privacyNotice.retentionDays}
      />
      <LinkCommonNotices
        audience="customer"
        rightsFallback={
          <a
            href={`tel:${data.officeContactPhone}`}
            className="font-semibold text-primary underline clickable-link"
          >
            사무소에 전화해 요청하기
          </a>
        }
        officeName={data.officeName}
        officeContactPhone={data.officeContactPhone}
        retentionDays={data.privacyNotice.retentionDays}
      />
    </div>
  );
}
