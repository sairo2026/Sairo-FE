"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import type { DataTableColumn } from "@/shared/components/ui/data-table";
import type { OperatorOfficeListResponse } from "@/lib/api/contracts/ops.schema";
import { OpsFilterBar } from "../../components/common/ops-filter-bar";
import { OpsScreen } from "../../components/common/ops-screen";
import { OpsStatusBadge } from "../../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../../components/common/ops-table";
import { useHasOpsRole } from "../../model/ops-session";
import { OPS_ROLES, OPS_WORK_ROLES } from "../../model/roles";
import { fetchOfficeList, opsOfficeKeys } from "../api/ops-offices-api";
import type { OfficeListFilter } from "../api/ops-offices-api";
import {
  REGISTRATION_FILTER_OPTIONS,
  REGISTRATION_STATUS,
  SUBSCRIPTION_FILTER_OPTIONS,
  SUBSCRIPTION_STATUS,
} from "../model/office-status";

type OfficeRow = OperatorOfficeListResponse["items"][number];

const EMPTY_FILTER: OfficeListFilter = {
  keyword: "",
  registrationStatus: "",
  subscriptionStatus: "",
};

export function OfficesListScreen() {
  const canOpenDetail = useHasOpsRole(OPS_WORK_ROLES);
  const paging = useOpsPaging();
  const [draft, setDraft] = useState<OfficeListFilter>(EMPTY_FILTER);
  const [applied, setApplied] = useState<OfficeListFilter>(EMPTY_FILTER);
  const query = useQuery({
    queryKey: opsOfficeKeys.list(applied, paging.page, paging.size),
    queryFn: () => fetchOfficeList(applied, paging.page, paging.size),
  });

  const columns: DataTableColumn<OfficeRow>[] = [
    { key: "id", header: "사무소 ID", render: (row) => row.officeId },
    {
      key: "name",
      header: "사무소명",
      render: (row) =>
        canOpenDetail ? (
          <Link
            href={`/ops/offices/${row.officeId}`}
            className="font-semibold text-primary underline"
          >
            {row.name}
          </Link>
        ) : (
          row.name
        ),
    },
    { key: "brn", header: "사업자등록번호", render: (row) => row.businessRegistrationNumber },
    { key: "license", header: "개설등록번호", render: (row) => row.realEstateLicenseNumber },
    { key: "authority", header: "등록관청", render: (row) => row.registrationAuthority },
    {
      key: "registration",
      header: "인증 상태",
      render: (row) => <OpsStatusBadge status={row.registrationStatus} map={REGISTRATION_STATUS} />,
    },
    {
      key: "subscription",
      header: "구독 상태",
      render: (row) =>
        row.subscriptionStatus ? (
          <OpsStatusBadge status={row.subscriptionStatus} map={SUBSCRIPTION_STATUS} />
        ) : (
          "구독 없음"
        ),
    },
    { key: "members", header: "구성원", render: (row) => `${row.approvedMembershipCount}명` },
  ];

  function apply() {
    paging.resetPage();
    setApplied(draft);
  }

  function reset() {
    paging.resetPage();
    setDraft(EMPTY_FILTER);
    setApplied(EMPTY_FILTER);
  }

  return (
    <OpsScreen
      title="고객사"
      description="사무소별 인증과 구독 현황을 찾아봅니다."
      roles={OPS_ROLES}
    >
      <OpsFilterBar label="고객사 검색" onApply={apply} onReset={reset}>
        <TextField
          label="검색어"
          value={draft.keyword}
          onValueChange={(keyword) => setDraft({ ...draft, keyword })}
          hint="사무소명, 사업자등록번호, 개설등록번호"
          maxLength={100}
        />
        <SelectField
          label="인증 상태"
          value={draft.registrationStatus}
          placeholder="전체"
          options={REGISTRATION_FILTER_OPTIONS}
          onValueChange={(registrationStatus) => setDraft({ ...draft, registrationStatus })}
        />
        <SelectField
          label="구독 상태"
          value={draft.subscriptionStatus}
          placeholder="전체"
          options={SUBSCRIPTION_FILTER_OPTIONS}
          onValueChange={(subscriptionStatus) => setDraft({ ...draft, subscriptionStatus })}
        />
      </OpsFilterBar>
      {!canOpenDetail ? (
        <p role="status" className="text-caption text-ink-2">
          경영조회 역할은 목록만 볼 수 있고 사무소 상세는 열 수 없습니다.
        </p>
      ) : null}
      <OpsTable
        caption="고객사 목록"
        query={query}
        columns={columns}
        getRowId={(row) => String(row.officeId)}
        paging={paging}
        emptyMessage="조건에 맞는 사무소가 없습니다."
      />
    </OpsScreen>
  );
}
