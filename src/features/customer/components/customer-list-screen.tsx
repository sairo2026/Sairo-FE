"use client";

import Link from "next/link";
import { useState } from "react";
import type { CustomerListResponse } from "@/lib/api/contracts/customer.schema";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { Badge } from "@/shared/components/ui/badge";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SearchField } from "@/shared/components/ui/search-field";
import { Checkbox, SelectField, Toggle } from "@/shared/components/ui/select-field";
import { formatSeoulDate } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { useCustomerList } from "../hooks/customer-queries";
import {
  CUSTOMER_ROLES,
  CUSTOMER_ROLE_LABEL,
  CUSTOMER_ROLE_TONE,
  isCustomerRole,
} from "../model/labels";
import { describeCustomerError } from "../model/messages";

type Row = CustomerListResponse["items"][number];

const MAX_MERGE_SELECTION = 2;

export function CustomerListScreen() {
  const { role } = useOfficeAccess();
  const isOwner = role === "OWNER";
  const [draftKeyword, setDraftKeyword] = useState("");
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  const [selected, setSelected] = useState<number[]>([]);

  const query = useCustomerList({
    role: roleFilter || undefined,
    keyword: keyword.trim() === "" ? undefined : keyword.trim(),
    archived: archived ? true : undefined,
    page: page - 1,
    size,
  });

  function toggleSelected(customerId: number) {
    setSelected((current) => {
      if (current.includes(customerId)) return current.filter((id) => id !== customerId);
      if (current.length >= MAX_MERGE_SELECTION) return current;
      return [...current, customerId];
    });
  }

  const columns = [
    ...(isOwner
      ? [
          {
            key: "select",
            header: "선택",
            render: (row: Row) => (
              <Checkbox
                ariaLabel={`${row.name} 선택`}
                checked={selected.includes(row.customerId)}
                disabled={
                  Boolean(row.deletedAt) ||
                  (!selected.includes(row.customerId) && selected.length >= MAX_MERGE_SELECTION)
                }
                onCheckedChange={() => toggleSelected(row.customerId)}
              />
            ),
          },
        ]
      : []),
    {
      key: "name",
      header: "이름",
      render: (row: Row) => (
        <span className="flex flex-wrap items-center gap-2">
          <Link
            href={`/customers/${row.customerId}`}
            className="font-semibold text-ink hover:text-primary hover:underline"
          >
            {row.name}
          </Link>
          {row.deletedAt ? (
            <Badge tone="gray" className="h-7 min-w-[56px] px-3 text-caption">
              보관
            </Badge>
          ) : null}
        </span>
      ),
    },
    { key: "type", header: "구분", render: (row: Row) => (row.isCorporation ? "법인" : "개인") },
    { key: "phone", header: "연락처", render: (row: Row) => row.phone ?? "-" },
    {
      key: "roles",
      header: "역할",
      render: (row: Row) => (
        <span className="flex flex-wrap gap-1">
          {row.roles.map((item) =>
            isCustomerRole(item) ? (
              <Badge
                key={item}
                tone={CUSTOMER_ROLE_TONE[item]}
                className="h-7 min-w-[64px] px-3 text-caption"
              >
                {CUSTOMER_ROLE_LABEL[item]}
              </Badge>
            ) : (
              <span key={item}>{item}</span>
            ),
          )}
        </span>
      ),
    },
    { key: "updated", header: "수정일", render: (row: Row) => formatSeoulDate(row.updatedAt) },
  ];

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="고객 관리" description="고객을 관리할 수 있습니다." />
      <div className="flex flex-wrap items-stretch gap-3">
        <Link
          href="/customers/new"
          className="inline-flex h-14 items-center justify-center rounded-control bg-primary px-6 text-body font-bold text-white hover:bg-primary-hover"
        >
          + 고객 등록
        </Link>
        <div className="min-w-[260px] flex-1">
          <SearchField
            label="고객 검색"
            placeholder="고객 이름이나 연락처로 검색하세요."
            value={draftKeyword}
            onValueChange={setDraftKeyword}
            onSearch={() => {
              setKeyword(draftKeyword);
              setPage(1);
            }}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-6">
        <SelectField
          label="역할"
          value={roleFilter}
          options={[
            { value: "", label: "전체" },
            ...CUSTOMER_ROLES.map((value) => ({ value, label: CUSTOMER_ROLE_LABEL[value] })),
          ]}
          onValueChange={(value) => {
            setRoleFilter(value);
            setPage(1);
          }}
        />
        <div className="flex h-14 items-center gap-3 text-body text-ink">
          <Toggle
            label="보관 고객 보기"
            checked={archived}
            onCheckedChange={(value) => {
              setArchived(value);
              setSelected([]);
              setPage(1);
            }}
          />
          <span aria-hidden="true">보관 고객 보기</span>
        </div>
        {isOwner ? (
          <div className="flex h-14 items-center gap-3">
            {selected.length === MAX_MERGE_SELECTION ? (
              <Link
                href={`/customers/merge?primary=${selected[0]}&merged=${selected[1]}`}
                className="inline-flex h-10 items-center rounded-control border border-primary bg-primary-soft px-4 text-caption font-semibold text-primary hover:bg-primary-line"
              >
                선택한 두 고객 병합
              </Link>
            ) : (
              <span className="text-caption text-ink-2">
                중복 등록된 고객은 두 명을 선택해 병합할 수 있습니다.
              </span>
            )}
          </div>
        ) : null}
      </div>
      <DataTable
        caption="고객 목록"
        columns={columns}
        rows={query.data?.items ?? []}
        getRowId={(row) => String(row.customerId)}
        getRowHref={(row) => `/customers/${row.customerId}`}
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
            ? describeCustomerError(query.error, "고객 목록을 불러오지 못했습니다.")
            : undefined
        }
        onRetry={() => void query.refetch()}
        emptyMessage={
          archived
            ? "보관된 고객이 없습니다."
            : "조건에 맞는 고객이 없습니다. 고객을 등록해 보세요."
        }
      />
    </div>
  );
}
