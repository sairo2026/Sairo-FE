"use client";

import { useVisitRequestDetail } from "../hooks/request-queries";
import { brokerFailureReasons } from "../model/revalidation-reasons";

export function RevalidationFailureNote({
  requestId,
  statusReason,
}: {
  requestId: number;
  statusReason: string | null | undefined;
}) {
  const query = useVisitRequestDetail(requestId, true);
  const failed = [...(query.data?.revalidations ?? [])]
    .reverse()
    .find((item) => item.result === "FAILED");
  const [first, ...others] = brokerFailureReasons(
    failed?.failureCode ?? statusReason,
    failed?.failureDetail,
  );
  if (!first) return null;
  return (
    <div className="flex flex-col gap-1 text-caption text-ink-2">
      <span>사유 {first.reason}</span>
      {others.map((item) => (
        <span key={item.reason}>함께 위반한 항목 {item.reason}</span>
      ))}
      <span>다음 행동 {first.nextStep}</span>
    </div>
  );
}
