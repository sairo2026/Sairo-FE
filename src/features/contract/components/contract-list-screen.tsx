"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/select-field";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SearchField } from "@/shared/components/ui/search-field";
import { Tabs } from "@/shared/components/ui/tabs";
import { formatSeoulDate } from "@/shared/lib/format";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { useContractList } from "../hooks/contract-queries";
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_TONE,
  DEAL_TYPE_LABEL,
  DOCUMENT_TYPE_LABEL,
  LEASE_STATUS_LABEL,
  SETTLEMENT_STATUS_LABEL,
  labelOf,
  partyText,
} from "../model/labels";
import { describeContractError } from "../model/messages";

const TABS = [
  { key: "valid", label: "유효 계약" },
  { key: "maturity", label: "임대 만기 90일 이내" },
  { key: "all", label: "전체 계약" },
] as const;

function ContractTable({ tab }: { tab: string }) {
  const [partyName, setPartyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [applied, setApplied] = useState({ partyName: "", propertyAddress: "" });
  const [includeExcluded, setIncludeExcluded] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  const query = useContractList({
    ...(tab === "valid" ? { contractStatus: "SIGNED" } : {}),
    ...(tab === "maturity" ? { leaseEndWithinDays: 90 } : {}),
    ...(applied.partyName !== "" ? { partyName: applied.partyName } : {}),
    ...(applied.propertyAddress !== "" ? { propertyAddress: applied.propertyAddress } : {}),
    includeExcluded,
    page: page - 1,
    size,
  });

  function search() {
    setApplied({ partyName: partyName.trim(), propertyAddress: propertyAddress.trim() });
    setPage(1);
  }

  if (query.isError && query.error instanceof ApiError && [403, 429].includes(query.error.status)) {
    return (
      <ErrorScreen
        kind={toErrorScreenKind(query.error)}
        retryAfterSeconds={query.error.retryAfterSeconds}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SearchField
          label="당사자 이름"
          placeholder="당사자 이름"
          value={partyName}
          onValueChange={setPartyName}
          onSearch={search}
        />
        <SearchField
          label="매물 주소"
          placeholder="매물 주소"
          value={propertyAddress}
          onValueChange={setPropertyAddress}
          onSearch={search}
        />
      </div>
      <Checkbox
        label="중복 제외 포함"
        checked={includeExcluded}
        onCheckedChange={(next) => {
          setIncludeExcluded(next);
          setPage(1);
        }}
      />
      <DataTable
        caption="계약 목록"
        rows={query.data?.items ?? []}
        getRowId={(row) => String(row.contractId)}
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
            ? describeContractError(query.error, "계약 목록을 불러오지 못했습니다.")
            : undefined
        }
        onRetry={() => void query.refetch()}
        emptyMessage={
          tab === "maturity"
            ? "임대 만기가 90일 안에 오는 계약이 없습니다."
            : "표시할 계약이 없습니다."
        }
        columns={[
          {
            key: "address",
            header: "매물 주소",
            render: (row) => (
              <span className="flex flex-col gap-1">
                <Link
                  href={`/contracts/${row.contractId}`}
                  className="font-semibold text-ink hover:text-primary hover:underline"
                >
                  {row.propertyAddress}
                </Link>
                {row.missingDocumentTypes.length > 0 ? (
                  <span className="text-caption font-semibold text-tag-red-ink">
                    서류 미첨부:{" "}
                    {row.missingDocumentTypes
                      .map((type) => labelOf(DOCUMENT_TYPE_LABEL, type))
                      .join(", ")}
                  </span>
                ) : null}
                {row.excluded ? <span className="text-caption text-ink-3">중복 제외됨</span> : null}
              </span>
            ),
          },
          {
            key: "deal",
            header: "거래유형",
            render: (row) => labelOf(DEAL_TYPE_LABEL, row.dealType),
          },
          {
            key: "parties",
            header: "당사자",
            render: (row) => (
              <span className="flex flex-col text-caption">
                <span>{partyText(row.sellerLandlordName, row.sellerLandlordPartyCount)}</span>
                <span className="text-ink-2">
                  {partyText(row.buyerTenantName, row.buyerTenantPartyCount)}
                </span>
              </span>
            ),
          },
          {
            key: "signed",
            header: "체결일",
            render: (row) => (row.signedDate ? formatSeoulDate(row.signedDate) : "-"),
          },
          {
            key: "lease",
            header: "임대 만기일",
            render: (row) => (row.leaseEndDate ? formatSeoulDate(row.leaseEndDate) : "-"),
          },
          {
            key: "status",
            header: "상태",
            render: (row) => (
              <span className="flex flex-col items-start gap-1">
                <Badge
                  tone={CONTRACT_STATUS_TONE[row.contractStatus] ?? "gray"}
                  className="h-7 min-w-0 px-3 text-caption"
                >
                  {labelOf(CONTRACT_STATUS_LABEL, row.contractStatus)}
                </Badge>
                {row.leasePeriodStatus ? (
                  <span className="text-caption text-ink-2">
                    {labelOf(LEASE_STATUS_LABEL, row.leasePeriodStatus)}
                  </span>
                ) : null}
                <span className="text-caption text-ink-3">
                  잔금 {labelOf(SETTLEMENT_STATUS_LABEL, row.settlementStatus)}
                </span>
              </span>
            ),
          },
          { key: "manager", header: "담당자", render: (row) => row.managingMemberName },
        ]}
      />
    </div>
  );
}

export function ContractListScreen() {
  const { role } = useOfficeAccess();
  const params = useSearchParams();
  const initial = TABS.some((item) => item.key === params.get("tab"))
    ? (params.get("tab") ?? "valid")
    : "valid";
  const [tab, setTab] = useState<string>(initial);
  if (role === "DEPUTY") return <ErrorScreen kind="forbidden" />;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="계약 관리"
        description="사무소의 계약을 한곳에서 봅니다. 서류가 빠진 계약은 경고로 표시합니다."
        actions={
          <Link
            href="/contracts/new"
            className="inline-flex h-12 items-center rounded-control bg-primary px-6 text-body font-bold text-white hover:bg-primary-hover"
          >
            + 계약 등록
          </Link>
        }
      />
      <Tabs
        label="계약 보기"
        activeKey={tab}
        onActiveKeyChange={setTab}
        items={TABS.map((item) => ({
          key: item.key,
          label: item.label,
          panel: <ContractTable key={item.key} tab={item.key} />,
        }))}
      />
    </div>
  );
}
