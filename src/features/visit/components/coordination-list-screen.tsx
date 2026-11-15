"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormNotice } from "@/shared/components/feedback/form-frame";

import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { ScheduleTag } from "@/shared/components/ui/badge";
import { CreateLink } from "@/shared/components/ui/create-link";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SecondaryLink } from "@/shared/components/ui/secondary-link";
import { formatSeoulDate } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { CoordinationStatusBadge } from "./coordination-status-badge";
import { useCoordinationList } from "../hooks/visit-queries";
import {
  COORDINATION_STATUSES,
  NEXT_ACTION_HASH,
  isCoordinationStatus,
  statusLabel,
  statusTone,
} from "../model/labels";
import { describeVisitError } from "../model/messages";

export function CoordinationListScreen({ initialStatus }: { initialStatus?: string }) {
  const router = useRouter();
  const { role, isReadOnly } = useOfficeAccess();
  const isDeputy = role === "DEPUTY";
  const [status, setStatus] = useState(
    initialStatus !== undefined && isCoordinationStatus(initialStatus) ? initialStatus : "",
  );
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);

  const query = useCoordinationList({
    status: status === "" ? undefined : status,
    page: page - 1,
    size,
  });

  if (query.isError && query.error instanceof ApiError && [403, 429].includes(query.error.status)) {
    return (
      <ErrorScreen
        kind={toErrorScreenKind(query.error)}
        traceId={query.error.traceId}
        retryAfterSeconds={query.error.retryAfterSeconds}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const counts = query.data?.statusCounts;
  const rows = query.data?.items ?? [];

  function select(next: string) {
    setStatus((current) => (current === next ? "" : next));
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="방문 조율"
        description="고객 한 명이 후보 매물을 골라 방문 일정을 조율합니다."
      />
      {isDeputy ? (
        <FormNotice>배정된 조율 건만 보입니다.</FormNotice>
      ) : (
        <div className="flex flex-wrap gap-3">
          <CreateLink href="/coordinations/new" isDisabled={isReadOnly}>
            조율 만들기
          </CreateLink>
          <SecondaryLink href="/granted-properties">허용받은 매물</SecondaryLink>
          <SecondaryLink href="/coordinations/trust">신뢰 요약·받은 평가</SecondaryLink>
          {role === "OWNER" ? (
            <SecondaryLink href="/coordinations/supervision">보조원 고지 감독</SecondaryLink>
          ) : null}
        </div>
      )}
      <ul aria-label="상태별 건수" className="flex flex-wrap gap-3">
        {COORDINATION_STATUSES.map((key) => (
          <li key={key}>
            <button
              type="button"
              aria-pressed={status === key}
              onClick={() => select(key)}
              className="block rounded-control"
            >
              <ScheduleTag
                tone={statusTone(key)}
                label={statusLabel(key)}
                count={counts ? counts[key] : 0}
                isInteractive
                className={status === key ? "ring-2 ring-primary" : undefined}
              />
            </button>
          </li>
        ))}
      </ul>
      <DataTable
        caption="방문 조율 목록"
        rows={rows}
        getRowId={(row) => String(row.coordinationId)}
        getRowHref={(row) => `/coordinations/${row.coordinationId}`}
        totalCount={query.data?.totalElements ?? 0}
        page={page}
        pageSize={size}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setSize(next);
          setPage(1);
        }}
        isLoading={query.isPending}
        errorMessage={
          query.isError
            ? describeVisitError(query.error, "조율 목록을 불러오지 못했습니다.")
            : undefined
        }
        onRetry={() => void query.refetch()}
        emptyMessage={
          isDeputy
            ? "배정된 조율 건이 없습니다."
            : status === ""
              ? "아직 만든 조율이 없습니다."
              : `${statusLabel(status)} 상태의 조율이 없습니다.`
        }
        columns={[
          {
            key: "customer",
            header: "고객",
            widthClass: "w-[120px]",
            render: (row) => (
              <Link
                href={`/coordinations/${row.coordinationId}`}
                className="font-bold text-ink hover:text-primary hover:underline"
              >
                {row.customerName}
              </Link>
            ),
          },
          {
            key: "candidates",
            header: "후보 매물",
            render: (row) => (
              <span className="flex flex-col">
                <span className="font-semibold">{row.candidatePropertyCount}개</span>
                <span className="text-caption text-ink-2">
                  {row.candidateProperties.map((item) => item.propertyName).join(", ")}
                </span>
              </span>
            ),
          },
          {
            key: "manager",
            header: "담당자",
            widthClass: "w-[100px]",
            render: (row) => row.managerName,
          },
          {
            key: "period",
            header: "방문 가능 기간",
            widthClass: "w-[220px]",
            render: (row) =>
              `${formatSeoulDate(row.periodStartDate)} ~ ${formatSeoulDate(row.periodEndDate)}`,
          },
          {
            key: "status",
            header: "상태",
            widthClass: "w-[140px]",
            render: (row) => {
              const hash = isCoordinationStatus(row.status) ? NEXT_ACTION_HASH[row.status] : "";
              return (
                <button
                  type="button"
                  aria-label={`${row.customerName} ${statusLabel(row.status)} 상세로 이동`}
                  onClick={() => router.push(`/coordinations/${row.coordinationId}${hash ?? ""}`)}
                >
                  <CoordinationStatusBadge status={row.status} />
                </button>
              );
            },
          },
        ]}
      />
    </div>
  );
}
