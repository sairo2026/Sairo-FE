"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ApproverVisitReviewListResponse } from "@/lib/api/contracts/visit.schema";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { RadioGroup } from "@/shared/components/ui/select-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import {
  designatePreferredBroker,
  saveApproverReview,
  withdrawApproverReview,
} from "../api/review.api";
import { reviewKeys, useApproverReviews } from "../hooks/review-queries";
import {
  APPROVER_REVIEW_STATUS_LABEL,
  REVIEW_ANSWER_LABEL,
  REVIEW_QUESTIONS,
  labelOf,
} from "../model/labels";
import { describeVisitError, isApiCode } from "../model/messages";

type ReviewItem = ApproverVisitReviewListResponse["items"][number];
type Answer = "YES" | "NO" | "SKIP";
type AnswerSet = Record<(typeof REVIEW_QUESTIONS)[number]["key"], Answer>;

const ANSWER_OPTIONS = (["YES", "NO", "SKIP"] as const).map((value) => ({
  value,
  label: REVIEW_ANSWER_LABEL[value],
}));

const STATUS_TONE = {
  NONE: "gray",
  SUBMITTED: "green",
  WITHDRAWN: "amber",
  LOCKED: "red",
} as const;

export function allSkipped(answers: AnswerSet): boolean {
  return REVIEW_QUESTIONS.every((question) => answers[question.key] === "SKIP");
}

function initialAnswers(item: ReviewItem): AnswerSet {
  return {
    punctuality: item.answers?.punctuality ?? "SKIP",
    advanceContact: item.answers?.advanceContact ?? "SKIP",
    asRequested: item.answers?.asRequested ?? "SKIP",
  };
}

function ReviewCard({
  base,
  item,
  noticeVersion,
  readOnly,
}: {
  base: string;
  item: ReviewItem;
  noticeVersion: string;
  readOnly: boolean;
}) {
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<AnswerSet>(() => initialAnswers(item));
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const locked = readOnly || !item.editable || item.reviewStatus === "LOCKED";
  const exhausted = item.reviewStatus === "SUBMITTED" && item.revisionsRemaining <= 0;
  const disabled = locked || exhausted;

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: reviewKeys.reviews(base) });
  }

  function onFailure(caught: unknown, fallback: string) {
    setNotice(undefined);
    setError(describeVisitError(caught, fallback));
    if (
      isApiCode(caught, "VERSION_CONFLICT") ||
      isApiCode(caught, "VISIT_REVIEW_LOCKED") ||
      isApiCode(caught, "VISIT_REVIEW_WINDOW_CLOSED")
    ) {
      void refresh();
    }
  }

  const save = useMutation({
    mutationFn: () =>
      saveApproverReview(
        base,
        item.scheduleItemId,
        { ...answers, acknowledgedNoticeVersion: noticeVersion },
        item.version,
      ),
    onSuccess: async () => {
      setError(undefined);
      setNotice("평가를 저장했습니다.");
      await refresh();
    },
    onError: (caught) => onFailure(caught, "평가를 저장하지 못했습니다. 다시 시도해 주세요."),
  });

  const withdraw = useMutation({
    mutationFn: () => withdrawApproverReview(base, item.scheduleItemId, item.version ?? 0),
    onSuccess: async () => {
      setError(undefined);
      setNotice("평가를 철회했습니다. 기한 안에서는 다시 입력할 수 있습니다.");
      setAnswers({ punctuality: "SKIP", advanceContact: "SKIP", asRequested: "SKIP" });
      await refresh();
    },
    onError: (caught) => onFailure(caught, "평가를 철회하지 못했습니다. 다시 시도해 주세요."),
  });

  const prefer = useMutation({
    mutationFn: () =>
      designatePreferredBroker(base, {
        sourceScheduleItemId: item.scheduleItemId,
        acknowledgedNoticeVersion: noticeVersion,
      }),
    onSuccess: async () => {
      setError(undefined);
      setNotice("선호 중개사로 지정했습니다.");
      await refresh();
      await queryClient.invalidateQueries({ queryKey: reviewKeys.preferred(base) });
    },
    onError: (caught) => onFailure(caught, "선호 중개사를 지정하지 못했습니다."),
  });

  return (
    <li className="flex flex-col gap-3 rounded-card-flat border border-line bg-white px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body font-semibold text-ink">
          {formatSeoulDateTime(item.actualVisitedAt)} · {item.applicantOfficeName}{" "}
          {item.applicantBrokerName}
        </span>
        <Badge tone={STATUS_TONE[item.reviewStatus]} className="h-8 min-w-0 px-3 text-caption">
          {labelOf(APPROVER_REVIEW_STATUS_LABEL, item.reviewStatus)}
        </Badge>
        {item.isPreferredBroker ? (
          <Badge tone="teal" className="h-8 min-w-0 px-3 text-caption">
            내가 지정한 중개사
          </Badge>
        ) : null}
      </div>
      <p className="text-caption text-ink-2">
        평가 기한 {formatSeoulDateTime(item.reviewDeadlineAt)} · 남은 수정 횟수{" "}
        {item.revisionsRemaining}회
      </p>
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled && !allSkipped(answers)) save.mutate();
        }}
      >
        {REVIEW_QUESTIONS.map((question) => (
          <RadioGroup
            key={question.key}
            legend={question.label}
            name={`${item.scheduleItemId}-${question.key}`}
            value={answers[question.key]}
            options={ANSWER_OPTIONS.map((option) => ({ ...option, isDisabled: disabled }))}
            onValueChange={(value) =>
              setAnswers((current) => ({ ...current, [question.key]: value as Answer }))
            }
          />
        ))}
        {disabled ? (
          <FormNotice>
            {readOnly
              ? "공동 승인자는 평가를 읽기만 할 수 있습니다."
              : exhausted
                ? "수정 횟수를 모두 사용해 더 이상 바꿀 수 없습니다."
                : "기한이 지났거나 잠긴 평가는 읽기 전용입니다."}
          </FormNotice>
        ) : null}
        {error ? <FormAlert>{error}</FormAlert> : null}
        {notice ? <FormNotice>{notice}</FormNotice> : null}
        <div className="flex flex-wrap gap-2">
          {disabled ? null : (
            <Button
              type="submit"
              size="sm"
              disabled={allSkipped(answers)}
              isLoading={save.isPending}
              aria-label={`${item.applicantBrokerName} ${item.reviewStatus === "SUBMITTED" ? "평가 수정" : "평가 제출"}`}
            >
              {item.reviewStatus === "SUBMITTED" ? "평가 수정" : "평가 제출"}
            </Button>
          )}
          {!disabled && item.reviewStatus === "SUBMITTED" ? (
            <Button
              size="sm"
              variant="cancel"
              isLoading={withdraw.isPending}
              onClick={() => withdraw.mutate()}
            >
              평가 철회
            </Button>
          ) : null}
          {!readOnly && !item.isPreferredBroker ? (
            <Button
              size="sm"
              variant="ghost"
              isLoading={prefer.isPending}
              onClick={() => prefer.mutate()}
            >
              선호 중개사로 지정
            </Button>
          ) : null}
        </div>
      </form>
    </li>
  );
}

export function ApproverReviewPanel({ base, readOnly }: { base: string; readOnly: boolean }) {
  const query = useApproverReviews(base);
  if (query.isPending) return <PageSkeleton label="방문 평가를 불러오는 중입니다." />;
  if (query.isError) {
    const error = query.error;
    return (
      <ErrorScreen
        kind={toErrorScreenKind(error)}
        traceId={error instanceof ApiError ? error.traceId : undefined}
        retryAfterSeconds={error instanceof ApiError ? error.retryAfterSeconds : undefined}
        onRetry={() => void query.refetch()}
      />
    );
  }
  const data = query.data;
  return (
    <div className="flex flex-col gap-4">
      <FormNotice>
        이 응답은 중개사의 신뢰 요약에 반영되고 중개사 본인과 운영자가 볼 수 있습니다. 승인자 이름과
        연락처는 중개사에게 전달되지 않습니다. 응답은 선택 사항이며 하지 않아도 이후
        신청·선택·확정에 영향이 없고, 평가가 없는 중개사는 낮은 평가를 받은 것이 아닙니다. 링크가
        만료되어도 번호 인증 계정으로 같은 평가를 입력할 수 있습니다.
      </FormNotice>
      {data.items.length === 0 ? (
        <EmptyState
          title="평가할 완료 방문이 없습니다"
          description={`방문이 완료되면 ${data.reviewWindowDays}일 동안 평가를 입력할 수 있습니다.`}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {data.items.map((item) => (
            <ReviewCard
              key={item.scheduleItemId}
              base={base}
              item={item}
              noticeVersion={data.privacyNotice.noticeVersion}
              readOnly={readOnly}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
