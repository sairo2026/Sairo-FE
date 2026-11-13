"use client";

import { useState } from "react";
import type { ContractStatusHistoryResponse } from "@/lib/api/contracts/contract.schema";
import type { ContractRevisionListResponse } from "@/lib/api/contracts/contract.schema";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { formatKrw, formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { useRevisions, useStatusHistory } from "../hooks/contract-queries";
import {
  DEAL_TYPE_LABEL,
  REVISION_TYPE_LABEL,
  TRACK_LABEL,
  labelOf,
  statusLabelFor,
} from "../model/labels";

type Revision = ContractRevisionListResponse["items"][number];
type Snapshot = Revision["currentSnapshot"];
type HistoryItem = ContractStatusHistoryResponse["items"][number];

function moneyText(value: number | null): string {
  return value === null ? "없음" : formatKrw(value);
}

function dateText(value: string | null): string {
  return value === null ? "없음" : formatSeoulDate(value);
}

function partiesText(parties: Snapshot["sellerLandlordParties"]): string {
  return parties.length === 0 ? "없음" : parties.map((party) => party.name).join(", ");
}

const FIELDS: Array<[string, (snapshot: Snapshot) => string]> = [
  ["체결일", (s) => dateText(s.signedDate)],
  ["거래유형", (s) => labelOf(DEAL_TYPE_LABEL, s.dealType)],
  ["매매가", (s) => moneyText(s.salePrice)],
  ["보증금", (s) => moneyText(s.depositAmount)],
  ["월세", (s) => moneyText(s.monthlyRentAmount)],
  ["잔금 예정일", (s) => dateText(s.balanceDueDate)],
  ["잔금 예정일 미정 사유", (s) => s.balanceDueDatePendingReason ?? "없음"],
  ["임대 시작일", (s) => dateText(s.leaseStartDate)],
  ["임대 만기일", (s) => dateText(s.leaseEndDate)],
  ["매도·임대인", (s) => partiesText(s.sellerLandlordParties)],
  ["매수·임차인", (s) => partiesText(s.buyerTenantParties)],
];

export function describeRevisionChanges(revision: Revision): string[] {
  const current = revision.currentSnapshot;
  const previous = revision.previousSnapshot;
  const lines: string[] = [];
  for (const [label, read] of FIELDS) {
    const now = read(current);
    if (previous === null) {
      if (now !== "없음") lines.push(`${label}: ${now}`);
      continue;
    }
    const before = read(previous);
    if (before !== now) lines.push(`${label}: ${before} → ${now}`);
  }
  return lines;
}

export function revisionNumberMap(items: Revision[]): Map<number, number> {
  return new Map(items.map((item) => [item.revisionId, item.revisionNo]));
}

export function RevisionSection({ contractId }: { contractId: number }) {
  const query = useRevisions(contractId);
  return (
    <section aria-labelledby="revision-title" className="flex flex-col gap-3">
      <h2 id="revision-title" className="text-h2 font-semibold text-ink">
        핵심정보 버전 이력
      </h2>
      <QueryGate query={query} loadingLabel="버전 이력을 불러오는 중입니다.">
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState
              title="아직 체결 버전이 없습니다."
              description="초안에는 버전 이력이 없습니다."
            />
          ) : (
            <ol className="flex flex-col gap-3">
              {data.items.map((revision) => (
                <li
                  key={revision.revisionId}
                  className="flex flex-col gap-2 rounded-card-flat border border-line px-5 py-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-body font-bold text-ink">버전 {revision.revisionNo}</span>
                    <Badge tone={revision.revisionType === "SIGNED" ? "green" : "amber"}>
                      {labelOf(REVISION_TYPE_LABEL, revision.revisionType)}
                    </Badge>
                    <span className="text-caption text-ink-2">
                      효력 {formatSeoulDateTime(revision.effectiveAt)} · 기록{" "}
                      {formatSeoulDateTime(revision.recordedAt)}
                    </span>
                  </div>
                  {revision.reason ? (
                    <p className="text-caption text-ink-2">정정 사유: {revision.reason}</p>
                  ) : null}
                  <ul className="list-disc pl-5 text-caption text-ink">
                    {describeRevisionChanges(revision).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )
        }
      </QueryGate>
    </section>
  );
}

function historyChange(item: HistoryItem): string {
  const from = item.fromStatus ? statusLabelFor(item.track, item.fromStatus) : "처음";
  return `${from} → ${statusLabelFor(item.track, item.toStatus)}`;
}

export function StatusHistorySection({ contractId }: { contractId: number }) {
  const [page, setPage] = useState(0);
  const size = 25;
  const query = useStatusHistory(contractId, page, size);
  return (
    <section aria-labelledby="history-title" className="flex flex-col gap-3">
      <h2 id="history-title" className="text-h2 font-semibold text-ink">
        상태 변경 이력
      </h2>
      <QueryGate query={query} loadingLabel="상태 이력을 불러오는 중입니다.">
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState title="상태 변경 이력이 없습니다." />
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {data.items.map((item, index) => (
                  <li
                    key={`${item.track}-${item.createdAt}-${index}`}
                    className="flex flex-col gap-1 rounded-card-flat border border-line px-5 py-3"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone="gray" className="h-7 min-w-0 px-3 text-caption">
                        {labelOf(TRACK_LABEL, item.track)}
                      </Badge>
                      <span className="font-semibold text-ink">{historyChange(item)}</span>
                      {item.supersedesHistoryId ? (
                        <Badge tone="amber" className="h-7 min-w-0 px-3 text-caption">
                          이전 기록 정정
                        </Badge>
                      ) : null}
                    </span>
                    <span className="text-caption text-ink-2">
                      효력 {formatSeoulDateTime(item.effectiveAt)} · 기록{" "}
                      {formatSeoulDateTime(item.createdAt)} ·{" "}
                      {item.changedByMemberName ?? "시스템 자동"}
                    </span>
                    {item.reason ? (
                      <span className="text-caption text-ink-2">사유: {item.reason}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-center gap-3 text-caption text-ink-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  이전
                </Button>
                <span>
                  {page + 1} / {Math.max(1, Math.ceil(data.totalElements / size))}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={(page + 1) * size >= data.totalElements}
                  onClick={() => setPage((p) => p + 1)}
                >
                  다음
                </Button>
              </div>
            </>
          )
        }
      </QueryGate>
    </section>
  );
}
