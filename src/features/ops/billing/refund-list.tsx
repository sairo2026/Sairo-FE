"use client";

import Link from "next/link";
import { useState } from "react";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatKrw, formatSeoulDateTime } from "@/shared/lib/format";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { useRefundList } from "./billing-api";
import { BillingNav } from "./billing-nav";
import { REFUND_REASON_LABELS, REFUND_STATUS } from "./billing-model";

type Filter = { status: string; officeId: string };
const EMPTY: Filter = { status: "", officeId: "" };

const STATUS_OPTIONS = [
  { value: "", label: "전체" },
  ...Object.entries(REFUND_STATUS).map(([value, entry]) => ({ value, label: entry.label })),
];

export function RefundListScreen() {
  const [draft, setDraft] = useState<Filter>(EMPTY);
  const [applied, setApplied] = useState<Filter>(EMPTY);
  const paging = useOpsPaging();
  const query = useRefundList({ ...applied, page: paging.page, size: paging.size });
  return (
    <OpsScreen
      title="환불 신청"
      description="환불 신청의 권리액과 기환불, 예약액을 확인하고 검토와 실행을 진행합니다."
      roles={["BILLING"]}
    >
      <BillingNav current="refunds" />
      <OpsFilterBar
        label="환불 신청 조회"
        onApply={() => {
          setApplied(draft);
          paging.resetPage();
        }}
        onReset={() => {
          setDraft(EMPTY);
          setApplied(EMPTY);
          paging.resetPage();
        }}
      >
        <SelectField
          label="환불 상태"
          value={draft.status}
          options={STATUS_OPTIONS}
          onValueChange={(status) => setDraft({ ...draft, status })}
        />
        <TextField
          label="사무소 ID"
          kind="number"
          value={draft.officeId}
          onValueChange={(officeId) => setDraft({ ...draft, officeId })}
        />
      </OpsFilterBar>
      <OpsTable
        caption="환불 신청 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.refundId)}
        emptyMessage="조건에 맞는 환불 신청이 없습니다."
        columns={[
          {
            key: "id",
            header: "환불",
            render: (row) => (
              <Link
                href={`/ops/billing/refunds/${row.refundId}`}
                className="font-semibold text-primary underline"
              >
                {row.refundId}
              </Link>
            ),
          },
          { key: "office", header: "사무소", render: (row) => row.officeId },
          {
            key: "invoice",
            header: "청구서",
            render: (row) => (
              <Link
                href={`/ops/billing/invoices/${row.invoiceId}`}
                className="text-primary underline"
              >
                {row.invoiceId}
              </Link>
            ),
          },
          {
            key: "reason",
            header: "사유",
            render: (row) => REFUND_REASON_LABELS[row.reasonCode] ?? row.reasonCode,
          },
          {
            key: "status",
            header: "상태",
            render: (row) => <OpsStatusBadge status={row.status} map={REFUND_STATUS} />,
          },
          {
            key: "entitlement",
            header: "권리액",
            render: (row) => formatKrw(row.entitlementAmount),
          },
          {
            key: "previous",
            header: "기환불",
            render: (row) => formatKrw(row.previousRefundAmount),
          },
          { key: "reserved", header: "예약액", render: (row) => formatKrw(row.reservedAmount) },
          { key: "amount", header: "환불 금액", render: (row) => formatKrw(row.refundAmount) },
          {
            key: "requested",
            header: "신청 일시",
            render: (row) => formatSeoulDateTime(row.requestedAt),
          },
        ]}
      />
    </OpsScreen>
  );
}
