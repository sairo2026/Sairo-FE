"use client";

import Link from "next/link";
import { useState } from "react";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatKrw, formatSeoulDate } from "@/shared/lib/format";
import { OpsFilterBar } from "../components/common/ops-filter-bar";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { useInvoiceList } from "./billing-api";
import { BillingNav } from "./billing-nav";
import { BILLING_PRIVACY_NOTICE, INVOICE_STATUS } from "./billing-model";

type Filter = { status: string; officeId: string; dueFrom: string; dueTo: string };
const EMPTY: Filter = { status: "", officeId: "", dueFrom: "", dueTo: "" };

const STATUS_OPTIONS = [
  { value: "", label: "전체" },
  ...Object.entries(INVOICE_STATUS).map(([value, entry]) => ({ value, label: entry.label })),
];

export function InvoiceListScreen() {
  const [draft, setDraft] = useState<Filter>(EMPTY);
  const [applied, setApplied] = useState<Filter>(EMPTY);
  const paging = useOpsPaging();
  const query = useInvoiceList({ ...applied, page: paging.page, size: paging.size });
  return (
    <OpsScreen
      title="결제·환불·대사"
      description="전체 청구서의 결제 상태를 확인하고 환불과 대사로 이동합니다."
      roles={["BILLING"]}
    >
      <BillingNav current="invoices" />
      <p className="text-caption text-ink-2">{BILLING_PRIVACY_NOTICE}</p>
      <OpsFilterBar
        label="청구서 조회"
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
          label="청구 상태"
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
        <DateTimeField
          label="납부기한 시작"
          kind="date"
          value={draft.dueFrom}
          onValueChange={(dueFrom) => setDraft({ ...draft, dueFrom })}
        />
        <DateTimeField
          label="납부기한 끝"
          kind="date"
          value={draft.dueTo}
          onValueChange={(dueTo) => setDraft({ ...draft, dueTo })}
        />
      </OpsFilterBar>
      <OpsTable
        caption="청구서 목록"
        query={query}
        paging={paging}
        getRowId={(row) => String(row.invoiceId)}
        emptyMessage="조건에 맞는 청구서가 없습니다."
        columns={[
          {
            key: "id",
            header: "청구서",
            render: (row) => (
              <Link
                href={`/ops/billing/invoices/${row.invoiceId}`}
                className="font-semibold text-primary underline"
              >
                {row.invoiceId}
              </Link>
            ),
          },
          { key: "office", header: "사무소", render: (row) => row.officeId },
          {
            key: "period",
            header: "청구기간",
            render: (row) =>
              `${formatSeoulDate(row.billingPeriodStart)} ~ ${formatSeoulDate(row.billingPeriodEnd)}`,
          },
          {
            key: "amount",
            header: "VAT 포함 금액",
            render: (row) => formatKrw(row.vatIncludedAmount),
          },
          {
            key: "status",
            header: "상태",
            render: (row) => <OpsStatusBadge status={row.status} map={INVOICE_STATUS} />,
          },
          { key: "due", header: "납부기한", render: (row) => formatSeoulDate(row.dueAt) },
          {
            key: "paid",
            header: "납부 일시",
            render: (row) => (row.paidAt ? formatSeoulDate(row.paidAt) : "-"),
          },
        ]}
      />
    </OpsScreen>
  );
}
