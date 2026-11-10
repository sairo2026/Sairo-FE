"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Button } from "@/shared/components/ui/button";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { designatePreferredBroker, releasePreferredBroker } from "../api/review.api";
import { approverKeys } from "../hooks/approver-queries";
import { reviewKeys, usePreferredBrokers } from "../hooks/review-queries";
import { describeVisitError } from "../model/messages";

export function ApproverPreferredPanel({ base, readOnly }: { base: string; readOnly: boolean }) {
  const queryClient = useQueryClient();
  const query = usePreferredBrokers(base);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: reviewKeys.preferred(base) });
    await queryClient.invalidateQueries({ queryKey: approverKeys.all });
    await queryClient.invalidateQueries({ queryKey: reviewKeys.reviews(base) });
  }

  const noticeVersion = query.data?.privacyNotice.noticeVersion ?? "";

  const designate = useMutation({
    mutationFn: (candidate: {
      sourceRequestId?: number | null;
      sourceScheduleItemId?: number | null;
    }) =>
      designatePreferredBroker(base, {
        ...(typeof candidate.sourceRequestId === "number"
          ? { sourceRequestId: candidate.sourceRequestId }
          : {}),
        ...(typeof candidate.sourceScheduleItemId === "number"
          ? { sourceScheduleItemId: candidate.sourceScheduleItemId }
          : {}),
        acknowledgedNoticeVersion: noticeVersion,
      }),
    onSuccess: async () => {
      setError(undefined);
      setNotice("선호 중개사로 지정했습니다.");
      await refresh();
    },
    onError: (caught) => {
      setNotice(undefined);
      setError(
        describeVisitError(caught, "선호 중개사를 지정하지 못했습니다. 다시 시도해 주세요."),
      );
    },
  });

  const release = useMutation({
    mutationFn: (preferredBrokerId: number) => releasePreferredBroker(base, preferredBrokerId),
    onSuccess: async () => {
      setError(undefined);
      setNotice("선호 중개사를 해제했습니다.");
      await refresh();
    },
    onError: (caught) => {
      setNotice(undefined);
      setError(
        describeVisitError(caught, "선호 중개사를 해제하지 못했습니다. 다시 시도해 주세요."),
      );
    },
  });

  if (query.isPending) return <PageSkeleton label="선호 중개사를 불러오는 중입니다." />;
  if (query.isError) {
    const failure = query.error;
    return (
      <ErrorScreen
        kind={toErrorScreenKind(failure)}
        traceId={failure instanceof ApiError ? failure.traceId : undefined}
        retryAfterSeconds={failure instanceof ApiError ? failure.retryAfterSeconds : undefined}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const data = query.data;
  const isFull = data.items.length >= data.maxActiveCount;

  return (
    <div className="flex flex-col gap-5">
      <FormNotice>
        선호 중개사로 지정하면 신청 목록에서 위쪽에 표시됩니다. 지정한 중개사의 신청이 자동으로
        확정되지 않고 다른 신청도 똑같이 선택할 수 있으며, 지정 여부는 중개사에게 보이지 않습니다.
      </FormNotice>
      {error ? <FormAlert>{error}</FormAlert> : null}
      {notice ? <FormNotice>{notice}</FormNotice> : null}
      <section aria-label="지정한 선호 중개사" className="flex flex-col gap-3">
        <h3 className="text-body font-semibold text-ink">
          지정한 중개사 {data.items.length}/{data.maxActiveCount}명
        </h3>
        {data.items.length === 0 ? (
          <EmptyState title="지정한 선호 중개사가 없습니다" />
        ) : (
          <ul className="flex flex-col gap-2">
            {data.items.map((item) => (
              <li
                key={item.preferredBrokerId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-card-flat border border-line bg-white px-4 py-3"
              >
                <span className="text-body text-ink">
                  {item.applicantOfficeName} · {item.applicantBrokerName}
                  <span className="ml-2 text-caption text-ink-3">
                    지정 {formatSeoulDateTime(item.designatedAt)}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="cancel"
                  disabled={readOnly}
                  isLoading={release.isPending && release.variables === item.preferredBrokerId}
                  aria-label={`${item.applicantBrokerName} 선호 해제`}
                  onClick={() => release.mutate(item.preferredBrokerId)}
                >
                  해제
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-label="지정 후보" className="flex flex-col gap-3">
        <h3 className="text-body font-semibold text-ink">지정 후보</h3>
        {isFull ? (
          <FormNotice>
            활성 지정은 최대 {data.maxActiveCount}명입니다. 한 명을 해제한 뒤 다시 지정해 주세요.
          </FormNotice>
        ) : null}
        {data.candidates.length === 0 ? (
          <EmptyState
            title="지정할 수 있는 후보가 없습니다"
            description="이 출입승인에서 신청을 냈거나 방문을 완료한 중개사가 후보로 나타납니다."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {data.candidates.map((candidate) => (
              <li
                key={`${candidate.sourceRequestId ?? "v"}-${candidate.sourceScheduleItemId ?? "r"}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-card-flat border border-line bg-white px-4 py-3"
              >
                <span className="text-body text-ink">
                  {candidate.applicantOfficeName} · {candidate.applicantBrokerName}
                </span>
                <Button
                  size="sm"
                  disabled={readOnly || isFull}
                  isLoading={designate.isPending && designate.variables === candidate}
                  aria-label={`${candidate.applicantBrokerName} 선호 지정`}
                  onClick={() => designate.mutate(candidate)}
                >
                  지정
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
