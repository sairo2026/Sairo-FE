"use client";

import Link from "next/link";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Card } from "@/shared/components/ui/card";
import { DataTable } from "@/shared/components/ui/data-table";
import { formatKrw, formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { OpsDetailList } from "../components/common/ops-detail-list";
import { OpsScreen } from "../components/common/ops-screen";
import { OpsStatusBadge } from "../components/common/ops-status-badge";
import { useInvoiceDetail } from "./billing-api";
import { BillingNav } from "./billing-nav";
import { ChargeResultCard } from "./charge-result-card";
import {
  ATTEMPT_RESULT,
  BILLING_PRIVACY_NOTICE,
  INVOICE_STATUS,
  REFUND_REASON_LABELS,
  REFUND_STATUS,
} from "./billing-model";

const NO_PAGING = {
  page: 1,
  pageSize: 100 as const,
  onPageChange: () => undefined,
  onPageSizeChange: () => undefined,
};

export function InvoiceDetailScreen({ invoiceId }: { invoiceId: number }) {
  const query = useInvoiceDetail(invoiceId);
  return (
    <OpsScreen
      title={`청구서 ${invoiceId}`}
      description="청구 스냅샷과 결제 시도, 연결된 환불 사건을 확인합니다."
      roles={["BILLING"]}
    >
      <BillingNav current="invoices" />
      <QueryGate query={query} loadingLabel="청구서를 불러오는 중입니다">
        {(detail) => {
          const verifyingOrderIds = detail.chargeAttempts
            .filter((attempt) => attempt.result === "VERIFYING")
            .map((attempt) => attempt.pgOrderId);
          const isVerifying = detail.status === "VERIFYING" || verifyingOrderIds.length > 0;
          return (
            <>
              <p className="text-caption text-ink-2">{BILLING_PRIVACY_NOTICE}</p>
              {isVerifying ? (
                <p
                  role="status"
                  className="rounded-card-flat border border-line bg-white p-4 text-body text-ink"
                >
                  결제대행사에서 결과를 확인하는 중입니다. 결과가 확정되기 전에는 다시 청구하거나
                  환불하지 말고 대사 화면에서 확인해 주세요.
                </p>
              ) : null}
              {isVerifying || detail.status === "FAILED" ? (
                <ChargeResultCard
                  officeId={detail.officeId}
                  verifyingOrderIds={verifyingOrderIds}
                  isRefreshing={query.isFetching}
                  refreshedAt={query.dataUpdatedAt}
                  onRefresh={() => void query.refetch()}
                />
              ) : null}
              <Card title="청구 스냅샷">
                <OpsDetailList
                  items={[
                    {
                      label: "상태",
                      value: <OpsStatusBadge status={detail.status} map={INVOICE_STATUS} />,
                    },
                    {
                      label: "사무소",
                      value: (
                        <Link
                          href={`/ops/offices/${detail.officeId}`}
                          className="text-primary underline"
                        >
                          {detail.officeId}
                        </Link>
                      ),
                    },
                    { label: "구독", value: detail.subscriptionId },
                    {
                      label: "청구기간",
                      value: `${formatSeoulDate(detail.billingPeriodStart)} ~ ${formatSeoulDate(detail.billingPeriodEnd)}`,
                    },
                    { label: "청구 금액", value: formatKrw(detail.amount) },
                    { label: "VAT 포함 금액", value: formatKrw(detail.vatIncludedAmount) },
                    { label: "과금 인원", value: `${detail.memberCountSnapshot}명` },
                    { label: "단가", value: formatKrw(detail.unitPriceSnapshot) },
                    { label: "가격표 버전", value: detail.priceVersion },
                    { label: "납부기한", value: formatSeoulDateTime(detail.dueAt) },
                    {
                      label: "납부 일시",
                      value: detail.paidAt ? formatSeoulDateTime(detail.paidAt) : null,
                    },
                    { label: "생성 일시", value: formatSeoulDateTime(detail.createdAt) },
                  ]}
                />
              </Card>
              <Card title="동의 근거">
                <OpsDetailList
                  items={[
                    { label: "동의 문안 버전", value: detail.consentVersion },
                    { label: "동의 금액 한도", value: formatKrw(detail.consentAmountLimit) },
                    { label: "동의 시각", value: formatSeoulDateTime(detail.consentedAt) },
                    { label: "구매 동의 사건 ID", value: detail.purchaseConsentId },
                  ]}
                />
              </Card>
              <Card title="결제 시도">
                <DataTable
                  caption="결제 시도 목록"
                  rows={detail.chargeAttempts}
                  getRowId={(row) => String(row.attemptNo)}
                  totalCount={detail.chargeAttempts.length}
                  {...NO_PAGING}
                  emptyMessage="결제 시도 기록이 없습니다."
                  columns={[
                    { key: "no", header: "회차", render: (row) => row.attemptNo },
                    { key: "order", header: "PG 주문 ID", render: (row) => row.pgOrderId },
                    {
                      key: "result",
                      header: "결과",
                      render: (row) => <OpsStatusBadge status={row.result} map={ATTEMPT_RESULT} />,
                    },
                    {
                      key: "at",
                      header: "시도 일시",
                      render: (row) => formatSeoulDateTime(row.attemptedAt),
                    },
                    {
                      key: "resolved",
                      header: "확정 일시",
                      render: (row) => (row.resolvedAt ? formatSeoulDateTime(row.resolvedAt) : "-"),
                    },
                    {
                      key: "reason",
                      header: "실패 사유",
                      render: (row) => row.failureReason ?? "-",
                    },
                  ]}
                />
              </Card>
              <Card title="연결된 환불 사건">
                <DataTable
                  caption="연결된 환불 사건 목록"
                  rows={detail.refunds}
                  getRowId={(row) => String(row.refundId)}
                  totalCount={detail.refunds.length}
                  {...NO_PAGING}
                  emptyMessage="연결된 환불 사건이 없습니다."
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
                      key: "amount",
                      header: "환불 금액",
                      render: (row) => formatKrw(row.refundAmount),
                    },
                    {
                      key: "requested",
                      header: "신청 일시",
                      render: (row) => formatSeoulDateTime(row.requestedAt),
                    },
                  ]}
                />
              </Card>
              <Card title="증빙">
                <p className="text-body text-ink-2">
                  세금계산서와 현금영수증 발급 기록은{" "}
                  <Link href="/ops/billing/tax-documents" className="text-primary underline">
                    증빙 발급 화면
                  </Link>
                  에서 확인하고 기록합니다.
                </p>
              </Card>
            </>
          );
        }}
      </QueryGate>
    </OpsScreen>
  );
}
