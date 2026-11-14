"use client";

import Link from "next/link";
import { useState } from "react";
import type { RefundRequestListResponse } from "@/lib/api/contracts/billing.schema";
import {
  DetailList,
  MutedNote,
  StatusBadge,
  TextLink,
} from "@/shared/components/feedback/page-parts";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Card } from "@/shared/components/ui/card";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatCount, formatKrw, formatSeoulDateTime } from "@/shared/lib/format";
import type { RefundStatus } from "../api/wire";
import { useRefund, useRefunds } from "../hooks/billing-queries";
import { REFUND_REASONS, REFUND_STATUS, labelOf, isMissing } from "../model/labels";
import { COPY, describeBillingError } from "../model/messages";
import { RefundGuide } from "./refund-guide";

type Row = RefundRequestListResponse["items"][number];

function reasonLabel(code: string) {
  return REFUND_REASONS.find((item) => item.value === code)?.label ?? code;
}

function RefundStatusBadge({ status }: { status: string }) {
  const label = labelOf(REFUND_STATUS, status);
  return <StatusBadge tone={label?.tone ?? "gray"} label={label?.label ?? status} />;
}

export function RefundsScreen({ invoiceId }: { invoiceId?: number }) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  const query = useRefunds({ page: page - 1, size, invoiceId });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="환불 신청 내역"
        description="접수한 환불의 진행 상태를 확인합니다."
        actions={<TextLink href="/billing/invoices">결제 내역</TextLink>}
      />
      <RefundGuide />
      <DataTable<Row>
        caption="환불 신청 내역"
        rows={query.data?.items ?? []}
        getRowId={(row) => String(row.refundId)}
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
            ? describeBillingError(query.error, "환불 신청 내역을 불러오지 못했습니다.")
            : undefined
        }
        onRetry={() => void query.refetch()}
        emptyMessage="접수한 환불 신청이 없습니다."
        columns={[
          {
            key: "refund",
            header: "신청",
            render: (row) => (
              <Link
                href={`/billing/refunds/${row.refundId}`}
                className="font-semibold text-primary hover:underline"
              >
                환불 {row.refundId}
              </Link>
            ),
          },
          { key: "reason", header: "사유", render: (row) => reasonLabel(row.reasonCode) },
          {
            key: "status",
            header: "상태",
            render: (row) => <RefundStatusBadge status={row.status} />,
          },
          {
            key: "amount",
            header: "환불액",
            render: (row) =>
              isMissing(row.refundAmount) ? "산정 전" : formatKrw(row.refundAmount),
          },
          { key: "created", header: "접수", render: (row) => formatSeoulDateTime(row.createdAt) },
        ]}
      />
    </div>
  );
}

function StatusNote({ refund }: { refund: RefundStatus }) {
  if (refund.status === "REJECTED") {
    return (
      <p role="status" className="text-body text-ink">
        {COPY.refundRejected(refund.rejectionReason ?? "사유 없음")}
      </p>
    );
  }
  if (refund.status === "FAILED") {
    return (
      <p role="alert" className="text-body text-danger">
        환불 처리에 실패했습니다. 사유: {refund.failureReason ?? "확인 중"}
      </p>
    );
  }
  if (refund.status === "VERIFYING")
    return (
      <p role="status" className="text-body text-ink">
        {COPY.refundVerifying}
      </p>
    );
  if (refund.status === "COMPLETED")
    return (
      <p role="status" className="text-body text-ink">
        {COPY.refundCompleted}
      </p>
    );
  return <MutedNote>접수일로부터 3영업일 안에 검토 결과를 알려 드립니다.</MutedNote>;
}

function RefundView({ refund }: { refund: RefundStatus }) {
  const calc = refund.calculation;
  return (
    <div className="flex flex-col gap-6">
      <Card title="환불 신청">
        <div className="mb-4 flex items-center gap-3">
          <RefundStatusBadge status={refund.status} />
          <span className="text-body text-ink-2">{reasonLabel(refund.reasonCode)}</span>
        </div>
        <StatusNote refund={refund} />
        <div className="mt-4">
          <DetailList
            items={[
              {
                label: "청구서",
                value: (
                  <TextLink
                    href={`/billing/invoices/${refund.invoiceId}`}
                  >{`청구서 ${refund.invoiceId}`}</TextLink>
                ),
              },
              {
                label: "환불액",
                value: isMissing(refund.refundAmount) ? "산정 전" : formatKrw(refund.refundAmount),
              },
              {
                label: "환불 권리액",
                value: isMissing(refund.entitlementAmount)
                  ? "산정 전"
                  : formatKrw(refund.entitlementAmount),
              },
              { label: "기환불액", value: formatKrw(refund.previousRefundAmount) },
              { label: "처리 중 예약액", value: formatKrw(refund.reservedAmount) },
            ]}
          />
        </div>
      </Card>
      <Card title="환불액 계산 근거">
        {calc ? (
          <DetailList
            items={[
              { label: "원승인액", value: formatKrw(calc.originalApprovedAmount) },
              {
                label: "전체 기간",
                value: isMissing(calc.totalPeriodSeconds)
                  ? "-"
                  : `${formatCount(calc.totalPeriodSeconds)}초`,
              },
              {
                label: "남은 기간",
                value: isMissing(calc.remainingPeriodSeconds)
                  ? "-"
                  : `${formatCount(calc.remainingPeriodSeconds)}초`,
              },
              { label: "쿠폰 제외분", value: formatKrw(calc.couponExcludedAmount) },
              { label: "기보상액", value: formatKrw(calc.priorCompensationAmount) },
              {
                label: "유효 종료",
                value: calc.effectiveEndAt ? formatSeoulDateTime(calc.effectiveEndAt) : "-",
              },
            ]}
          />
        ) : (
          <p className="text-body text-ink-2">검토가 끝나면 계산 근거가 표시됩니다.</p>
        )}
      </Card>
    </div>
  );
}

export function RefundDetailScreen({ refundId }: { refundId: number }) {
  const query = useRefund(refundId);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="환불 처리 상태"
        actions={<TextLink href="/billing/refunds">목록으로</TextLink>}
      />
      <QueryGate query={query} loadingLabel="환불 상태를 불러오는 중입니다.">
        {(refund) => <RefundView refund={refund} />}
      </QueryGate>
    </div>
  );
}
