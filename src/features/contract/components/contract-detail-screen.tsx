"use client";

import Link from "next/link";
import { useState } from "react";
import type { ContractDetailResponse } from "@/lib/api/contracts/contract.schema";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormNotice } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { DetailList, MutedNote } from "@/shared/components/feedback/page-parts";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatKrw, formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { useContract, useContractProperty, useRevisions } from "../hooks/contract-queries";
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_TONE,
  DEAL_TYPE_LABEL,
  DOCUMENT_TYPE_LABEL,
  LEASE_STATUS_LABEL,
  LEASE_STATUS_TONE,
  SETTLEMENT_STATUS_LABEL,
  SETTLEMENT_STATUS_TONE,
  isLease,
  labelOf,
} from "../model/labels";
import {
  CorrectionDialog,
  DuplicateDialog,
  SettlementStatusDialog,
  StatusDialog,
  canRenew,
} from "./contract-dialogs";
import { ContractSubNav } from "./contract-sub-screen";
import { RevisionSection, StatusHistorySection, revisionNumberMap } from "./contract-history";

type Dialog = "status" | "settlement" | "correction" | "duplicate" | null;

function PartyList({
  title,
  parties,
}: {
  title: string;
  parties: ContractDetailResponse["sellerLandlordParties"];
}) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-caption font-semibold text-ink-2">{title}</h3>
      {parties.length === 0 ? (
        <MutedNote>입력된 당사자가 없습니다.</MutedNote>
      ) : (
        <ul className="flex flex-col gap-1">
          {parties.map((party) => (
            <li key={party.partyId} className="text-body text-ink">
              {party.sequenceNo}. {party.name}
              {party.phone ? ` · ${party.phone}` : ""}
              {party.customerId ? (
                <Link
                  href={`/customers/${party.customerId}`}
                  className="ml-2 text-caption font-semibold text-primary hover:underline"
                >
                  고객 보기
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TrackCard({
  title,
  badge,
  note,
  action,
}: {
  title: string;
  badge: React.ReactNode;
  note?: string;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-card-flat border border-line bg-white px-5 py-4">
      <span className="text-caption font-semibold text-ink-2">{title}</span>
      <span>{badge}</span>
      {note ? <span className="text-caption text-ink-3">{note}</span> : null}
      {action}
    </li>
  );
}

function DetailBody({ detail }: { detail: ContractDetailResponse }) {
  const { role, isReadOnly } = useOfficeAccess();
  const [dialog, setDialog] = useState<Dialog>(null);
  const property = useContractProperty(detail.propertyId);
  const revisions = useRevisions(detail.contractId, detail.contractStatus !== "DRAFT");
  const revisionNumbers = revisionNumberMap(revisions.data?.items ?? []);
  const isDraft = detail.contractStatus === "DRAFT";
  const lease = isLease(detail.dealType);
  const close = () => setDialog(null);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={property.data?.name ?? `계약 ${detail.contractId}`}
        description={`${labelOf(DEAL_TYPE_LABEL, detail.dealType)} 계약${property.data?.address ? ` · ${property.data.address}` : ""}`}
        actions={
          <>
            <Link
              href={`/properties/${detail.propertyId}`}
              className="inline-flex h-12 items-center rounded-control border border-line px-5 text-body font-medium text-ink-2 hover:border-primary hover:text-primary"
            >
              매물 보기
            </Link>
            {isDraft ? (
              <Link
                href={`/contracts/${detail.contractId}/edit`}
                className="inline-flex h-12 items-center rounded-control bg-primary px-6 text-body font-bold text-white hover:bg-primary-hover"
              >
                초안 수정
              </Link>
            ) : null}
            {canRenew(detail) ? (
              <Link
                href={`/contracts/${detail.contractId}/renew`}
                className="inline-flex h-12 items-center rounded-control border border-primary bg-primary-soft px-5 text-body font-semibold text-primary hover:bg-primary-line"
              >
                재계약
              </Link>
            ) : null}
          </>
        }
      />
      <ContractSubNav contractId={detail.contractId} />
      {detail.duplicateExcluded ? (
        <FormNotice>
          중복 제외된 계약입니다. 제외 시각{" "}
          {detail.duplicateExcludedAt ? formatSeoulDateTime(detail.duplicateExcludedAt) : "-"}, 중복
          대상{" "}
          {detail.duplicateOfContractId ? (
            <Link
              href={`/contracts/${detail.duplicateOfContractId}`}
              className="font-semibold underline hover:opacity-70 active:opacity-50"
            >
              계약 {detail.duplicateOfContractId}
            </Link>
          ) : (
            "-"
          )}
          , 사유 {detail.duplicateExclusionReason ?? "-"}
        </FormNotice>
      ) : null}
      <ul aria-label="계약 세 가지 상태" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <TrackCard
          title="계약 상태"
          badge={
            <Badge tone={CONTRACT_STATUS_TONE[detail.contractStatus] ?? "gray"}>
              {labelOf(CONTRACT_STATUS_LABEL, detail.contractStatus)}
            </Badge>
          }
          action={
            !isDraft ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={isReadOnly}
                onClick={() => setDialog("status")}
              >
                상태 변경
              </Button>
            ) : null
          }
        />
        <TrackCard
          title="임대기간"
          badge={
            lease && detail.leasePeriodStatus ? (
              <Badge tone={LEASE_STATUS_TONE[detail.leasePeriodStatus] ?? "gray"}>
                {labelOf(LEASE_STATUS_LABEL, detail.leasePeriodStatus)}
              </Badge>
            ) : (
              <Badge tone="gray">{lease ? "체결 전" : "해당 없음"}</Badge>
            )
          }
          note={
            lease
              ? "날짜에 따라 자동으로 계산되며 계약 상태를 바꾸지 않습니다."
              : "매매는 임대기간 상태가 없습니다."
          }
        />
        <TrackCard
          title="잔금 상태"
          badge={
            <Badge tone={SETTLEMENT_STATUS_TONE[detail.settlementStatus] ?? "gray"}>
              {labelOf(SETTLEMENT_STATUS_LABEL, detail.settlementStatus)}
            </Badge>
          }
          note="잔금 예정일을 바꿔도 자동으로 바뀌지 않고 담당자가 기록한 값만 표시합니다."
          action={
            !isDraft ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={isReadOnly}
                onClick={() => setDialog("settlement")}
              >
                잔금 상태 기록
              </Button>
            ) : null
          }
        />
      </ul>
      <section aria-labelledby="values-title" className="flex flex-col gap-4">
        <h2 id="values-title" className="text-h2 font-semibold text-ink">
          현재 계약 정보
        </h2>
        <DetailList
          items={[
            {
              label: "체결일",
              value: detail.signedDate ? formatSeoulDate(detail.signedDate) : "-",
            },
            ...(detail.dealType === "SALE"
              ? [{ label: "매매가", value: formatKrw(detail.salePrice) }]
              : [
                  { label: "보증금", value: formatKrw(detail.depositAmount) },
                  ...(detail.dealType === "MONTHLY"
                    ? [{ label: "월세", value: formatKrw(detail.monthlyRentAmount) }]
                    : []),
                  {
                    label: "임대기간",
                    value: `${detail.leaseStartDate ? formatSeoulDate(detail.leaseStartDate) : "-"} ~ ${detail.leaseEndDate ? formatSeoulDate(detail.leaseEndDate) : "-"}`,
                  },
                ]),
            {
              label: "잔금 예정일",
              value: detail.balanceDueDate
                ? formatSeoulDate(detail.balanceDueDate)
                : `미정${detail.balanceDueDatePendingReason ? ` (${detail.balanceDueDatePendingReason})` : ""}`,
            },
            { label: "업무 메모", value: detail.memo ?? "-" },
            {
              label: "이전 계약",
              value: detail.previousContractId ? (
                <Link
                  href={`/contracts/${detail.previousContractId}`}
                  className="font-semibold text-primary hover:underline"
                >
                  계약 {detail.previousContractId}
                </Link>
              ) : (
                "-"
              ),
            },
          ]}
        />
        <PartyList title="매도·임대인" parties={detail.sellerLandlordParties} />
        <PartyList title="매수·임차인" parties={detail.buyerTenantParties} />
        {!isDraft ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outlined"
              disabled={isReadOnly}
              onClick={() => setDialog("correction")}
            >
              핵심정보 정정
            </Button>
            {role === "OWNER" && !detail.duplicateExcluded ? (
              <Button variant="ghost" disabled={isReadOnly} onClick={() => setDialog("duplicate")}>
                중복 제외
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>
      <section aria-labelledby="documents-title" className="flex flex-col gap-3">
        <h2 id="documents-title" className="text-h2 font-semibold text-ink">
          첨부 서류
        </h2>
        {detail.documents.length === 0 ? (
          <MutedNote>
            {isDraft
              ? "초안에는 서류를 올릴 수 없습니다. 체결 뒤 올려 주세요."
              : "첨부된 서류가 없습니다."}
          </MutedNote>
        ) : (
          <ul className="flex flex-col gap-2">
            {detail.documents.map((document) => (
              <li
                key={document.documentId}
                className="flex flex-wrap items-center gap-3 rounded-card-flat border border-line px-5 py-3 text-body text-ink"
              >
                <span className="font-semibold">
                  {labelOf(DOCUMENT_TYPE_LABEL, document.documentType)}
                </span>
                <span className="text-caption text-ink-2">문서 버전 {document.versionNo}</span>
                <span className="text-caption text-ink-2">
                  계약 버전{" "}
                  {document.contractRevisionId
                    ? (revisionNumbers.get(document.contractRevisionId) ?? "-")
                    : "-"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {!isDraft ? <RevisionSection contractId={detail.contractId} /> : null}
      <StatusHistorySection contractId={detail.contractId} />
      {dialog === "status" ? <StatusDialog detail={detail} onClose={close} /> : null}
      {dialog === "settlement" ? <SettlementStatusDialog detail={detail} onClose={close} /> : null}
      {dialog === "correction" ? <CorrectionDialog detail={detail} onClose={close} /> : null}
      {dialog === "duplicate" ? <DuplicateDialog detail={detail} onClose={close} /> : null}
    </div>
  );
}

export function ContractDetailScreen({ contractId }: { contractId: number }) {
  const { role } = useOfficeAccess();
  const query = useContract(contractId, role !== "DEPUTY");
  if (role === "DEPUTY") return <ErrorScreen kind="forbidden" />;
  return (
    <QueryGate query={query} loadingLabel="계약 정보를 불러오는 중입니다.">
      {(detail) => <DetailBody detail={detail} />}
    </QueryGate>
  );
}
