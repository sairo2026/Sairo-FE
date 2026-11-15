"use client";

import Link from "next/link";
import { useState } from "react";
import type { BillingInvoiceListResponse } from "@/lib/api/contracts/billing.schema";
import { StatusBadge, TextLink } from "@/shared/components/feedback/page-parts";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatKrw, formatSeoulDate } from "@/shared/lib/format";
import { useInvoices } from "../hooks/billing-queries";
import { INVOICE_STATUS, labelOf } from "../model/labels";
import { describeBillingError } from "../model/messages";

type Row = BillingInvoiceListResponse["items"][number];

export function InvoiceStatusBadge({ status }: { status: string }) {
  const label = labelOf(INVOICE_STATUS, status);
  return <StatusBadge tone={label?.tone ?? "gray"} label={label?.label ?? status} />;
}

export function InvoicesScreen() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  const query = useInvoices({ page: page - 1, size });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="결제 내역"
        description="청구서별 결제 상태와 환불 가능 금액을 확인하고 환불을 신청합니다."
        actions={<TextLink href="/billing/refunds">환불 신청 내역</TextLink>}
      />
      <DataTable<Row>
        caption="결제 내역"
        rows={query.data?.items ?? []}
        getRowId={(row) => String(row.invoiceId)}
        getRowHref={(row) => `/billing/invoices/${row.invoiceId}`}
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
            ? describeBillingError(query.error, "결제 내역을 불러오지 못했습니다.")
            : undefined
        }
        onRetry={() => void query.refetch()}
        emptyMessage="아직 결제 내역이 없습니다."
        columns={[
          {
            key: "period",
            header: "청구기간",
            render: (row) => (
              <Link
                href={`/billing/invoices/${row.invoiceId}`}
                className="font-semibold text-primary hover:underline"
              >
                {formatSeoulDate(row.periodStart)} ~ {formatSeoulDate(row.periodEnd)}
              </Link>
            ),
          },
          { key: "members", header: "인원", render: (row) => `${row.memberCount}명` },
          {
            key: "amount",
            header: "금액(VAT 포함)",
            align: "right",
            render: (row) => formatKrw(row.amount),
          },
          {
            key: "limit",
            header: "동의 한도",
            align: "right",
            render: (row) => formatKrw(row.consentAmountLimit),
          },
          {
            key: "status",
            header: "상태",
            render: (row) => <InvoiceStatusBadge status={row.status} />,
          },
          {
            key: "refund",
            header: "환불 가능",
            align: "right",
            render: (row) => formatKrw(row.refundableAmount),
          },
        ]}
      />
    </div>
  );
}
