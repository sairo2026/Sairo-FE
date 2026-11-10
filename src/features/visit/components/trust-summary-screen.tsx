"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { BrokerReceivedVisitReviewListResponse } from "@/lib/api/contracts/visit.schema";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import type { BadgeTone } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { Modal } from "@/shared/components/ui/modal";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SelectField } from "@/shared/components/ui/select-field";
import { Tabs } from "@/shared/components/ui/tabs";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { fileReviewDispute } from "../api/review.api";
import type { ReviewScope } from "../api/review.api";
import { reviewKeys, useReceivedReviews, useTrustSummary } from "../hooks/review-queries";
import {
  DISPUTE_REASON_LABEL,
  DISPUTE_STATUS_LABEL,
  RECEIVED_REVIEW_STATUS_LABEL,
  REVIEW_ANSWER_LABEL,
  REVIEW_QUESTIONS,
  TRUST_BAND_LABEL,
  TRUST_INDICATOR_LABEL,
  TRUST_STATE_LABEL,
  labelOf,
} from "../model/labels";
import { describeVisitError, fieldErrorMap } from "../model/messages";

type ReceivedItem = BrokerReceivedVisitReviewListResponse["items"][number];

export const DISPUTE_TEXT_LIMIT = 500;

const REVIEW_TONE: Record<string, BadgeTone> = {
  ACTIVE: "green",
  DISPUTED: "amber",
  REMOVED: "gray",
};

function TrustCard() {
  const query = useTrustSummary();
  if (query.isPending) return <PageSkeleton label="신뢰 요약을 불러오는 중입니다." />;
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
  const trust = query.data;
  const neutral = trust.state !== "AVAILABLE";
  return (
    <Card title="내 신뢰 요약">
      <div className="flex flex-col gap-3 text-body text-ink-2">
        <p className="font-semibold text-ink">
          {labelOf(TRUST_STATE_LABEL, trust.state)}
          {trust.overallBand ? ` · ${labelOf(TRUST_BAND_LABEL, trust.overallBand)}` : ""}
        </p>
        {neutral ? (
          <p>자료 없음과 표본 부족은 낮은 평가가 아닙니다.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {trust.indicators.map((item) => (
              <li key={item.indicator}>
                {labelOf(TRUST_INDICATOR_LABEL, item.indicator)}:{" "}
                {item.band ? labelOf(TRUST_BAND_LABEL, item.band) : "요약 없음"} (응답{" "}
                {item.answeredCount}건 중 예 {item.yesCount}건)
              </li>
            ))}
          </ul>
        )}
        <p className="text-caption">
          완료 방문 {trust.completedVisitCount}건 · 평가 반영 방문 {trust.evaluatedVisitCount}건 ·
          서로 다른 출입승인 {trust.distinctApproverCount}개 · 이의 처리 중이라 제외된 평가{" "}
          {trust.excludedReviewCount}건
        </p>
        <p className="text-caption">
          집계 기간 최근 {trust.windowMonths}개월 · 기준 시각 {formatSeoulDateTime(trust.asOf)}
        </p>
      </div>
    </Card>
  );
}

function answersText(item: ReceivedItem): string {
  return REVIEW_QUESTIONS.map(
    (question, index) =>
      `${index + 1}번 ${labelOf(REVIEW_ANSWER_LABEL, item.answers[question.key])}`,
  ).join(" · ");
}

function DisputeModal({ item, onClose }: { item: ReceivedItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reasonCode, setReasonCode] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  const mutation = useMutation({
    mutationFn: () =>
      fileReviewDispute(item.reviewId, {
        reasonCode: reasonCode as "FACT_INCORRECT" | "WRONG_TARGET" | "OTHER",
        reasonText: reasonText.trim(),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: reviewKeys.receivedAll });
      await queryClient.invalidateQueries({ queryKey: reviewKeys.trust });
      onClose();
    },
    onError: async (caught) => {
      const mapped = fieldErrorMap(caught);
      if (Object.keys(mapped).length > 0) setErrors(mapped);
      setFormError(describeVisitError(caught, "이의를 접수하지 못했습니다. 다시 시도해 주세요."));
      if (caught instanceof ApiError && caught.status === 409) {
        await queryClient.invalidateQueries({ queryKey: reviewKeys.receivedAll });
      }
    },
  });

  function submit() {
    const next: Record<string, string> = {};
    if (reasonCode === "") next.reasonCode = "사유를 선택해 주세요.";
    if (reasonText.trim() === "") next.reasonText = "사유 설명을 입력해 주세요.";
    if (reasonText.length > DISPUTE_TEXT_LIMIT) {
      next.reasonText = `${DISPUTE_TEXT_LIMIT}자 이내로 입력해 주세요.`;
    }
    setErrors(next);
    setFormError(undefined);
    if (Object.keys(next).length === 0) mutation.mutate();
  }

  return (
    <Modal
      isOpen
      title="평가 이의 제기"
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={mutation.isPending}>
            취소
          </Button>
          <Button isLoading={mutation.isPending} onClick={submit}>
            이의 제기
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-caption text-ink-2">
          {formatSeoulDateTime(item.actualVisitedAt)} · {item.propertyName}
          <br />
          {answersText(item)}
        </p>
        <SelectField
          label="이의 사유"
          value={reasonCode}
          options={[
            { value: "", label: "선택해 주세요" },
            ...(Object.keys(DISPUTE_REASON_LABEL) as Array<keyof typeof DISPUTE_REASON_LABEL>).map(
              (value) => ({ value, label: DISPUTE_REASON_LABEL[value] }),
            ),
          ]}
          onValueChange={setReasonCode}
          error={errors.reasonCode}
        />
        <div className="flex flex-col gap-2">
          <label htmlFor="dispute-text" className="text-caption font-semibold text-ink">
            사유 설명
          </label>
          <textarea
            id="dispute-text"
            value={reasonText}
            onChange={(event) => setReasonText(event.target.value)}
            className="min-h-24 rounded-control border border-line px-3 py-2 text-body text-ink"
            aria-invalid={errors.reasonText ? true : undefined}
          />
          <p className="text-caption text-ink-3">
            {reasonText.length}/{DISPUTE_TEXT_LIMIT}자 · 고객 이름과 연락처를 넣지 마세요.
          </p>
          {errors.reasonText ? (
            <p role="alert" className="text-caption text-danger">
              {errors.reasonText}
            </p>
          ) : null}
        </div>
        <FormNotice>
          이의는 평가당 한 번이며 접수되면 평가가 요약에서 빠지고 승인자는 수정할 수 없습니다. 처리
          목표 7영업일은 목표일일 뿐 자동 처리가 아닙니다.
        </FormNotice>
        {formError ? <FormAlert>{formError}</FormAlert> : null}
      </div>
    </Modal>
  );
}

function ReceivedTable({ scope }: { scope: ReviewScope }) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  const [target, setTarget] = useState<ReceivedItem>();
  const query = useReceivedReviews(scope, page - 1, size);
  return (
    <>
      <DataTable
        caption={scope === "OFFICE" ? "사무소 전체 받은 평가" : "내가 받은 평가"}
        rows={query.data?.items ?? []}
        getRowId={(row) => String(row.reviewId)}
        totalCount={query.data?.totalElements ?? 0}
        page={page}
        pageSize={size}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setSize(next);
          setPage(1);
        }}
        isLoading={query.isPending}
        errorMessage={query.isError ? "받은 평가를 불러오지 못했습니다." : undefined}
        onRetry={() => void query.refetch()}
        emptyMessage="받은 평가가 없습니다."
        columns={[
          {
            key: "visit",
            header: "방문 일시",
            render: (row) => formatSeoulDateTime(row.actualVisitedAt),
          },
          { key: "property", header: "매물", render: (row) => row.propertyName },
          ...(scope === "OFFICE"
            ? [
                {
                  key: "broker",
                  header: "중개사",
                  render: (row: ReceivedItem) => row.reviewedBrokerName,
                },
              ]
            : []),
          { key: "answers", header: "항목별 응답", render: answersText },
          {
            key: "status",
            header: "평가 상태",
            render: (row) => (
              <Badge
                tone={REVIEW_TONE[row.reviewStatus] ?? "gray"}
                className="h-8 min-w-0 px-3 text-caption"
              >
                {labelOf(RECEIVED_REVIEW_STATUS_LABEL, row.reviewStatus)}
              </Badge>
            ),
          },
          {
            key: "revised",
            header: "마지막 입력",
            render: (row) => formatSeoulDateTime(row.lastRevisedAt),
          },
          {
            key: "dispute",
            header: "이의",
            render: (row) =>
              row.dispute?.status ? (
                <span className="flex flex-col text-caption">
                  <span>{labelOf(DISPUTE_STATUS_LABEL, row.dispute.status)}</span>
                  {row.dispute.decisionNote ? <span>{row.dispute.decisionNote}</span> : null}
                  <span className="text-ink-3">같은 평가에는 다시 이의를 낼 수 없습니다.</span>
                </span>
              ) : row.canDispute ? (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`${row.propertyName} 평가 이의 제기`}
                  onClick={() => setTarget(row)}
                >
                  이의 제기
                </Button>
              ) : (
                <span className="text-caption text-ink-3">
                  마지막 입력 시각부터 30일이 지나 이의를 낼 수 없습니다.
                </span>
              ),
          },
        ]}
      />
      {target ? <DisputeModal item={target} onClose={() => setTarget(undefined)} /> : null}
    </>
  );
}

export function TrustSummaryScreen() {
  const { role } = useOfficeAccess();
  const [tab, setTab] = useState("me");
  if (role === "DEPUTY") {
    return (
      <ErrorScreen
        kind="forbidden"
        description="신뢰 요약과 받은 평가는 중개보조원에게 보이지 않습니다."
      />
    );
  }
  const mine = <ReceivedTable scope="ME" />;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="신뢰 요약·받은 평가"
        description="승인자가 방문 뒤 남긴 응답의 요약과 받은 평가를 확인합니다."
      />
      <FormNotice>
        이 요약은 승인자 응답의 요약이며 점수나 순위가 아니고, 신청·선택·확정 가능 여부를 정하지
        않습니다. 자료 없음과 표본 부족은 낮은 평가가 아닙니다. 접근 거리, 취급 적합성, 거래 실적은
        아직 제공하지 않습니다.
      </FormNotice>
      <TrustCard />
      {role === "OWNER" ? (
        <Tabs
          label="받은 평가 범위"
          activeKey={tab}
          onActiveKeyChange={setTab}
          items={[
            { key: "me", label: "내 평가", panel: mine },
            { key: "office", label: "사무소 전체", panel: <ReceivedTable scope="OFFICE" /> },
          ]}
        />
      ) : (
        mine
      )}
    </div>
  );
}
