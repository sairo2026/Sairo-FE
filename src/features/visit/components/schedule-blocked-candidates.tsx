"use client";

import Link from "next/link";
import { useState } from "react";
import type { VisitCoordinationDetailResponse } from "@/lib/api/contracts/visit.schema";
import { Badge } from "@/shared/components/ui/badge";
import { useReceivedGrants } from "../hooks/visit-queries";
import { BLOCKED_REASON_LABEL, blockedReasonOf } from "../model/schedule-blocked";
import type { BlockedReason } from "../model/schedule-blocked";

type Candidate = VisitCoordinationDetailResponse["candidateProperties"][number];

const ORDER: BlockedReason[] = [
  "SERVER_REPORTED",
  "CONDITION_MISSING",
  "CONDITION_EXPIRED",
  "UNKNOWN",
];

export function ScheduleBlockedCandidates({
  candidates,
  serverIds,
}: {
  candidates: Candidate[];
  serverIds: number[];
}) {
  const grants = useReceivedGrants("");
  const [now] = useState(() => Date.now());
  const rows = candidates
    .map((candidate) => ({
      candidate,
      reason: blockedReasonOf(candidate, { serverIds, grants: grants.data?.items, now }),
    }))
    .sort((a, b) => ORDER.indexOf(a.reason) - ORDER.indexOf(b.reason));
  return (
    <ul aria-label="일정 저장을 막은 후보 확인" className="flex flex-col gap-2">
      {rows.map(({ candidate, reason }) => (
        <li
          key={candidate.candidatePropertyId}
          className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-tag-yellow px-4 py-3 text-caption text-tag-yellow-ink"
        >
          <span className="flex flex-col gap-1">
            <span className="font-semibold">{candidate.propertyName}</span>
            <span className="flex flex-wrap items-center gap-2">
              <Badge tone={reason === "UNKNOWN" ? "gray" : "red"}>
                {BLOCKED_REASON_LABEL[reason]}
              </Badge>
              {candidate.crossOffice ? (
                <span>{candidate.ownerOfficeName}의 승인자 조건입니다.</span>
              ) : null}
            </span>
          </span>
          {candidate.crossOffice ? (
            <Link
              href="/granted-properties"
              className="font-semibold text-primary hover:underline"
              aria-label={`${candidate.propertyName} 허용받은 매물에서 확인`}
            >
              허용받은 매물에서 확인
            </Link>
          ) : (
            <Link
              href={`/properties/${candidate.propertyId}/access-approvals`}
              className="font-semibold text-primary hover:underline"
              aria-label={`${candidate.propertyName} 승인자 조건 등록`}
            >
              승인자 조건 등록
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
