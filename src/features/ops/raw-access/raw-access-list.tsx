"use client";

import Link from "next/link";
import { useState } from "react";
import { SelectField } from "@/shared/components/ui/select-field";
import { Tabs } from "@/shared/components/ui/tabs";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { useHasOpsRole } from "../model/ops-session";
import { useRawAccessList } from "./raw-access-api";
import { RAW_ACCESS_STATUS, REQUEST_TYPE_LABELS, TARGET_TYPE_LABELS } from "./raw-access-model";

const STATUS_OPTIONS = [
  { value: "", label: "전체" },
  ...Object.entries(RAW_ACCESS_STATUS).map(([value, entry]) => ({ value, label: entry.label })),
];

function RequestTable({ scope }: { scope: "MINE" | "APPROVABLE" }) {
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const paging = useOpsPaging();
  const query = useRawAccessList({ scope, status, page: paging.page, size: paging.size });
  return (
    <div className="flex flex-col gap-4">
      <OpsFilterBar
        label="원문 접근 요청 조회"
        onApply={() => {
          setStatus(draft);
          paging.resetPage();
        }}
        onReset={() => {
          setDraft("");
          setStatus("");
          paging.resetPage();
        }}
      >
        <SelectField label="상태" value={draft} options={STATUS_OPTIONS} onValueChange={setDraft} />
      </OpsFilterBar>
      <OpsTable
        caption={scope === "MINE" ? "내 원문 접근 요청" : "승인할 원문 접근 요청"}
        query={query}
        paging={paging}
        getRowId={(row) => String(row.requestId)}
        emptyMessage={
          scope === "MINE" ? "내가 요청하거나 수혜하는 요청이 없습니다." : "승인할 요청이 없습니다."
        }
        columns={[
          {
            key: "id",
            header: "요청 번호",
            render: (row) => (
              <Link
                href={`/ops/raw-access/${row.requestId}`}
                className="font-semibold text-primary underline"
              >
                {row.requestId}
              </Link>
            ),
          },
          {
            key: "type",
            header: "종류",
            render: (row) => REQUEST_TYPE_LABELS[row.requestType] ?? row.requestType,
          },
          {
            key: "target",
            header: "대상",
            render: (row) =>
              `${TARGET_TYPE_LABELS[row.targetType] ?? row.targetType}${row.targetId ? ` ${row.targetId}` : ""}`,
          },
          { key: "purpose", header: "목적", render: (row) => row.purpose },
          { key: "scope", header: "범위", render: (row) => row.scope },
          {
            key: "status",
            header: "상태",
            render: (row) => <OpsStatusBadge status={row.status} map={RAW_ACCESS_STATUS} />,
          },
          { key: "by", header: "요청자", render: (row) => row.requestedByName },
          {
            key: "expires",
            header: "승인 만료",
            render: (row) => (row.expiresAt ? formatSeoulDateTime(row.expiresAt) : "-"),
          },
          {
            key: "createdAt",
            header: "요청 시각",
            render: (row) => formatSeoulDateTime(row.createdAt),
          },
        ]}
      />
    </div>
  );
}

function Tabbed() {
  const canApprove = useHasOpsRole(["PRIVACY"]);
  const [tab, setTab] = useState("mine");
  const items = [{ key: "mine", label: "내 요청", panel: <RequestTable scope="MINE" /> }];
  if (canApprove) {
    items.push({
      key: "approvable",
      label: "승인할 요청",
      panel: <RequestTable scope="APPROVABLE" />,
    });
  }
  return (
    <Tabs label="원문 접근 요청 구분" items={items} activeKey={tab} onActiveKeyChange={setTab} />
  );
}

export function RawAccessListScreen() {
  return (
    <OpsScreen
      title="원문 접근"
      description="내 요청과 승인할 요청을 보고 실행·파일 받기·회수를 처리합니다."
      roles={[]}
      actions={
        <Link href="/ops/raw-access/new" className="text-body font-semibold text-primary underline">
          새 요청 만들기
        </Link>
      }
    >
      <Tabbed />
    </OpsScreen>
  );
}
