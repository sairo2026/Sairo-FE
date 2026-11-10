"use client";

import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { formatKrw, formatSeoulDateTime } from "@/shared/lib/format";
import { OpsDetailList } from "../components/common/ops-detail-list";
import { OpsTable, useOpsPaging } from "../components/common/ops-table";
import { describeOpsError } from "../model/ops-errors";
import { useHasOpsRole } from "../model/ops-session";
import { useActivePrices, useIntegrationsForCompany, useRefundDocuments } from "./company-api";
import { INTEGRATION_CONSENT_LABELS, INTEGRATION_CONTRACT_LABELS } from "./company-model";

export function SubprocessorSection() {
  const paging = useOpsPaging();
  const query = useIntegrationsForCompany({ page: paging.page, size: paging.size });
  return (
    <Card title="수탁 정보">
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink-2">
          수탁업체와 처리 조건은 연동 설정의 값을 그대로 보여줍니다. 값을 바꾸려면{" "}
          <Link href="/ops/integrations">연동 설정</Link>에서 수정해 주세요.
        </p>
        <OpsTable
          caption="수탁 정보 목록"
          query={query}
          paging={paging}
          getRowId={(row) => String(row.integrationId)}
          emptyMessage="등록된 연동이 없습니다."
          columns={[
            { key: "provider", header: "수탁업체", render: (row) => row.provider },
            { key: "function", header: "업무", render: (row) => row.functionCode },
            {
              key: "env",
              header: "환경",
              render: (row) => (row.environment === "TEST" ? "시험" : "운영"),
            },
            { key: "region", header: "처리 지역", render: (row) => row.processingRegion ?? "-" },
            { key: "retention", header: "보유기간", render: (row) => row.retentionPolicy },
            {
              key: "contract",
              header: "계약",
              render: (row) =>
                INTEGRATION_CONTRACT_LABELS[row.contractStatus] ?? row.contractStatus,
            },
            {
              key: "consent",
              header: "동의",
              render: (row) => INTEGRATION_CONSENT_LABELS[row.consentStatus] ?? row.consentStatus,
            },
          ]}
        />
      </div>
    </Card>
  );
}

export function PriceAndRefundSection() {
  const canSeePrice = useHasOpsRole(["BILLING"]);
  const prices = useActivePrices(canSeePrice);
  const documents = useRefundDocuments();

  const active = prices.data?.items.find(
    (item) => item.audience === "STANDARD" && item.status === "ACTIVE",
  );
  const refund = documents.data?.items.find(
    (item) => item.docType === "REFUND" && item.status === "PUBLISHED",
  );

  return (
    <Card title="시행 중인 요금과 환불 안내">
      <div className="flex flex-col gap-6">
        <p className="text-caption text-ink-2">
          요금과 환불 안내는 요금표 버전과 환불 정책 문서의 게시 버전을 그대로 보여주며 여기서
          입력하지 않습니다.
        </p>
        <section aria-label="시행 중인 요금" className="flex flex-col gap-2">
          <h3 className="text-body font-semibold text-ink">VAT 포함 요금</h3>
          {!canSeePrice ? (
            <p className="text-body text-ink-2">요금표는 결제담당만 조회할 수 있습니다.</p>
          ) : prices.isPending ? (
            <p role="status" className="text-body text-ink-2">
              요금표를 불러오는 중입니다.
            </p>
          ) : prices.isError ? (
            <div className="flex flex-col gap-2">
              <p role="alert" className="text-danger">
                {describeOpsError(prices.error, "요금표를 불러오지 못했습니다.")}
              </p>
              <div>
                <Button variant="outlined" size="sm" onClick={() => void prices.refetch()}>
                  요금표 다시 시도
                </Button>
              </div>
            </div>
          ) : active ? (
            <OpsDetailList
              items={[
                { label: "버전", value: active.version },
                { label: "Solo 기준액", value: formatKrw(active.soloAmount) },
                { label: "2~4인 추가액", value: formatKrw(active.teamFirstExtra) },
                { label: "5인 이상 추가액", value: formatKrw(active.teamAfterFourExtra) },
                { label: "효력", value: formatSeoulDateTime(active.effectiveAt) },
              ]}
            />
          ) : (
            <p className="text-body text-ink-2">시행 중인 표준 요금표가 없습니다.</p>
          )}
        </section>
        <section aria-label="환불 안내" className="flex flex-col gap-2">
          <h3 className="text-body font-semibold text-ink">환불 안내</h3>
          {documents.isPending ? (
            <p role="status" className="text-body text-ink-2">
              환불 정책 문서를 불러오는 중입니다.
            </p>
          ) : documents.isError ? (
            <div className="flex flex-col gap-2">
              <p role="alert" className="text-danger">
                {describeOpsError(documents.error, "환불 정책 문서를 불러오지 못했습니다.")}
              </p>
              <div>
                <Button variant="outlined" size="sm" onClick={() => void documents.refetch()}>
                  환불 정책 다시 시도
                </Button>
              </div>
            </div>
          ) : refund ? (
            <>
              <p className="text-caption text-ink-2">게시 버전 {refund.version}</p>
              <p className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-card-flat border border-line p-4 text-body text-ink">
                {refund.body}
              </p>
            </>
          ) : (
            <p className="text-body text-ink-2">게시된 환불 정책 문서가 없습니다.</p>
          )}
        </section>
      </div>
    </Card>
  );
}
