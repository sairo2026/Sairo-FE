"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type { OperatorMemberListResponse } from "@/lib/api/contracts/ops.schema";
import type { DataTableColumn } from "@/shared/components/ui/data-table";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsFilterBar } from "../../components/common/ops-filter-bar";
import { OpsScreen } from "../../components/common/ops-screen";
import { OpsStatusBadge } from "../../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../../components/common/ops-table";
import { OPS_WORK_ROLES } from "../../model/roles";
import { fetchMemberList, opsMemberKeys } from "../api/ops-members-api";
import type { MemberListFilter } from "../api/ops-members-api";
import { ACCOUNT_FILTER_OPTIONS, ACCOUNT_STATUS } from "../model/member-status";

type MemberRow = OperatorMemberListResponse["items"][number];

const EMPTY_FILTER: MemberListFilter = { keyword: "", accountStatus: "" };

function MembersListBody() {
  const paging = useOpsPaging();
  const [draft, setDraft] = useState<MemberListFilter>(EMPTY_FILTER);
  const [applied, setApplied] = useState<MemberListFilter>(EMPTY_FILTER);
  const query = useQuery({
    queryKey: opsMemberKeys.list(applied, paging.page, paging.size),
    queryFn: () => fetchMemberList(applied, paging.page, paging.size),
  });

  const columns: DataTableColumn<MemberRow>[] = [
    { key: "id", header: "회원 ID", render: (row) => row.userId },
    {
      key: "name",
      header: "이름",
      render: (row) => (
        <Link href={`/ops/members/${row.userId}`} className="font-semibold text-primary underline">
          {row.displayName}
        </Link>
      ),
    },
    {
      key: "status",
      header: "계정 상태",
      render: (row) => <OpsStatusBadge status={row.accountStatus} map={ACCOUNT_STATUS} />,
    },
    { key: "office", header: "소속 사무소", render: (row) => row.officeName ?? "소속 없음" },
    { key: "createdAt", header: "가입 일시", render: (row) => formatSeoulDateTime(row.createdAt) },
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
    <>
      <OpsFilterBar label="회원 검색" onApply={apply} onReset={reset}>
        <TextField
          label="검색어"
          value={draft.keyword}
          onValueChange={(keyword) => setDraft({ ...draft, keyword })}
          hint="이름 또는 소속 사무소명"
          maxLength={100}
        />
        <SelectField
          label="계정 상태"
          value={draft.accountStatus}
          placeholder="전체"
          options={ACCOUNT_FILTER_OPTIONS}
          onValueChange={(accountStatus) => setDraft({ ...draft, accountStatus })}
        />
      </OpsFilterBar>
      <OpsTable
        caption="회원 목록"
        query={query}
        columns={columns}
        getRowId={(row) => String(row.userId)}
        paging={paging}
        emptyMessage="조건에 맞는 회원이 없습니다."
      />
    </>
  );
}

export function MembersListScreen() {
  return (
    <OpsScreen
      title="회원"
      description="문의 대응과 계정 상태 확인을 위해 회원을 찾습니다."
      roles={OPS_WORK_ROLES}
    >
      <MembersListBody />
    </OpsScreen>
  );
}
