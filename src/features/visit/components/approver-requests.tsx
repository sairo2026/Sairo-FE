"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ApproverSelectionResponse } from "@/lib/api/contracts/visit.schema";
import { selectApproverRequest } from "../api/approver.api";
import { designatePreferredBroker } from "../api/review.api";
import { reviewKeys } from "../hooks/review-queries";
import type { ApproverCompare, ApproverCompareItem } from "../api/approver.api";
import { approverKeys } from "../hooks/approver-queries";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { formatSeoulDateTime } from "@/shared/lib/format";
import {
  APPLICANT_RELATION_LABEL,
  REVALIDATION_FAILURE_LABEL,
  TRUST_BAND_LABEL,
  TRUST_INDICATOR_LABEL,
  TRUST_STATE_LABEL,
  labelOf,
} from "../model/labels";
import { describeVisitError, isApiCode } from "../model/messages";

type Trust = NonNullable<ApproverCompareItem["applicantTrust"]>;

function TrustSummary({ trust }: { trust: Trust | null | undefined }) {
  const state = trust?.state ?? "NO_DATA";
  const neutral = state !== "AVAILABLE";
  return (
    <div className="flex flex-col gap-2 rounded-control bg-surface px-4 py-3 text-caption text-ink-2">
      <p className="font-semibold text-ink">
        신뢰 요약 · {labelOf(TRUST_STATE_LABEL, state)}
        {trust?.overallBand ? ` · ${labelOf(TRUST_BAND_LABEL, trust.overallBand)}` : ""}
      </p>
      {neutral ? (
        <p>자료 없음과 표본 부족은 낮은 평가가 아닙니다.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {(trust?.indicators ?? []).map((item) => (
            <li key={item.indicator}>
              {labelOf(TRUST_INDICATOR_LABEL, item.indicator)}:{" "}
              {item.band ? labelOf(TRUST_BAND_LABEL, item.band) : "요약 없음"} (응답{" "}
              {item.answeredCount ?? 0}건 중 예 {item.yesCount ?? 0}건)
            </li>
          ))}
        </ul>
      )}
      {trust ? (
        <p>
          완료 방문 {trust.completedVisitCount ?? 0}건 · 평가 반영 방문{" "}
          {trust.evaluatedVisitCount ?? 0}건
        </p>
      ) : null}
      <p>사무소가 아니라 중개사 한 명의 응답 요약이며 점수나 순위가 아닙니다.</p>
    </div>
  );
}

function RequestCard({
  item,
  readOnly,
  onSelect,
  onPrefer,
  isPreferPending,
}: {
  item: ApproverCompareItem;
  readOnly: boolean;
  onSelect: (item: ApproverCompareItem) => void;
  onPrefer: (item: ApproverCompareItem) => void;
  isPreferPending: boolean;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-card-flat border border-line bg-white px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body font-semibold text-ink">
          {item.applicantOfficeName} · {item.applicantBrokerName}
        </span>
        {item.isPreferredBroker ? (
          <Badge tone="teal" className="h-8 min-w-0 px-3 text-caption">
            내가 지정한 중개사
          </Badge>
        ) : null}
        {item.applicantRelation === "GRANTED_OFFICE" ? (
          <Badge tone="amber" className="h-8 min-w-0 px-3 text-caption">
            {labelOf(APPLICANT_RELATION_LABEL, item.applicantRelation)}의 신청
          </Badge>
        ) : null}
        {item.requestKind === "CHANGE" ? (
          <Badge tone="blue" className="h-8 min-w-0 px-3 text-caption">
            확정 변경 신청
          </Badge>
        ) : null}
      </div>
      <dl className="grid grid-cols-1 gap-1 text-caption text-ink-2 sm:grid-cols-2">
        <div>
          희망 시간: {formatSeoulDateTime(item.requestedStartAt)} ~{" "}
          {formatSeoulDateTime(item.requestedEndAt)}
        </div>
        <div>예상 소요시간: {item.expectedDurationMinutes}분</div>
        <div>방문 인원: {item.partySize ?? "입력 없음"}</div>
        <div>
          이전 방문 이력: 완료 {item.applicantHistory.previousCompletedVisitCount}건 · 확정 취소{" "}
          {item.applicantHistory.previousCancelledVisitCount}건
        </div>
        <div className="sm:col-span-2">요청사항: {item.requestNote ?? "입력 없음"}</div>
        <div>제출 시각: {formatSeoulDateTime(item.submittedAt)}</div>
      </dl>
      <TrustSummary trust={item.applicantTrust} />
      <div>
        <Button
          size="sm"
          disabled={readOnly}
          aria-label={`${item.applicantBrokerName} 신청 선택`}
          onClick={() => onSelect(item)}
        >
          이 신청 선택
        </Button>
        {item.isPreferredBroker ? null : (
          <Button
            size="sm"
            variant="ghost"
            className="ml-2"
            disabled={readOnly}
            isLoading={isPreferPending}
            aria-label={`${item.applicantBrokerName} 선호 중개사로 지정`}
            onClick={() => onPrefer(item)}
          >
            선호 중개사로 지정
          </Button>
        )}
      </div>
    </li>
  );
}

function failureText(result: ApproverSelectionResponse): string {
  const code = result.revalidation.failureCode;
  const known = code ? REVALIDATION_FAILURE_LABEL[code] : undefined;
  return [known, result.revalidation.failureDetail].filter(Boolean).join(" ");
}

export function ApproverRequestList({
  base,
  data,
  kind,
  readOnly,
  noticeVersion,
}: {
  base: string;
  data: ApproverCompare;
  kind: "NEW" | "CHANGE";
  readOnly: boolean;
  noticeVersion: string;
}) {
  const queryClient = useQueryClient();
  const items = data.items.filter((item) => item.requestKind === kind);
  const [target, setTarget] = useState<ApproverCompareItem>();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<ApproverSelectionResponse>();

  const mutation = useMutation({
    mutationFn: (item: ApproverCompareItem) =>
      selectApproverRequest(
        base,
        item.requestId,
        {
          comparedRequestIds: data.items.map((entry) => entry.requestId),
          selectionNote: note.trim() === "" ? null : note.trim(),
          acknowledgedNoticeVersion: noticeVersion,
        },
        item.version,
      ),
    onSuccess: async (response) => {
      setResult(response);
      setTarget(undefined);
      setNote("");
      setError(undefined);
      await queryClient.invalidateQueries({ queryKey: approverKeys.all });
    },
    onError: async (caught) => {
      setError(describeVisitError(caught, "신청을 선택하지 못했습니다. 다시 시도해 주세요."));
      if (
        isApiCode(caught, "VERSION_CONFLICT") ||
        isApiCode(caught, "VISIT_REQUEST_INVALID_STATE")
      ) {
        setTarget(undefined);
        await queryClient.invalidateQueries({ queryKey: approverKeys.all });
      }
    },
  });

  const preferMutation = useMutation({
    mutationFn: (item: ApproverCompareItem) =>
      designatePreferredBroker(base, {
        sourceRequestId: item.requestId,
        acknowledgedNoticeVersion: noticeVersion,
      }),
    onSuccess: async () => {
      setError(undefined);
      await queryClient.invalidateQueries({ queryKey: approverKeys.all });
      await queryClient.invalidateQueries({ queryKey: reviewKeys.preferred(base) });
    },
    onError: (caught) =>
      setError(
        describeVisitError(caught, "선호 중개사를 지정하지 못했습니다. 다시 시도해 주세요."),
      ),
  });

  return (
    <div className="flex flex-col gap-4">
      {result ? (
        result.requestStatus === "CONFIRMED" ? (
          <FormNotice>
            선택한 신청이 확정되었습니다.
            {result.timeClosedRequestIds.length > 0
              ? ` 시간이 겹치는 다른 신청 ${result.timeClosedRequestIds.length}건은 시간 마감되었습니다.`
              : ""}
          </FormNotice>
        ) : (
          <FormAlert>
            최신 조건을 확인한 결과 확정하지 못했습니다. {failureText(result)} 다른 신청을 선택해
            주세요. 신청한 중개사에게는 사유와 대안 안내가 전달됩니다.
          </FormAlert>
        )
      ) : null}
      {error ? <FormAlert>{error}</FormAlert> : null}
      {readOnly ? (
        <FormNotice>공동 승인자는 신청을 읽기만 하고 선택할 수 없습니다.</FormNotice>
      ) : (
        <FormNotice>
          겹치는 신청은 승인 대기로 함께 보이며 확정 예약이 아닙니다. 선택하면 시스템이 최신 조건,
          권한, 일정 충돌을 다시 확인한 뒤 확정합니다. 표시 순서와 신뢰 요약은 참고용이며 선택
          기준이 아닙니다.
        </FormNotice>
      )}
      {items.length === 0 ? (
        <EmptyState
          title={kind === "NEW" ? "비교할 신청이 없습니다" : "받은 변경 신청이 없습니다"}
          description={
            kind === "NEW"
              ? "중개사가 방문을 신청하면 이곳에 나타납니다."
              : "중개사가 확정된 방문의 변경을 신청하면 이곳에 나타납니다."
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <RequestCard
              key={item.requestId}
              item={item}
              readOnly={readOnly}
              onSelect={setTarget}
              onPrefer={(entry) => preferMutation.mutate(entry)}
              isPreferPending={
                preferMutation.isPending && preferMutation.variables?.requestId === item.requestId
              }
            />
          ))}
        </ul>
      )}
      <p className="text-caption text-ink-3">
        접근 거리, 취급 적합성, 거래 실적은 아직 제공하지 않는 미확인 항목입니다. 선호 중개사로
        지정해도 신청이 자동으로 확정되지 않고 다른 신청도 똑같이 선택할 수 있으며, 지정 여부는
        중개사에게 보이지 않습니다. 표시 순서가 위쪽인 것은 표시 편의일 뿐입니다.
      </p>
      <Modal
        isOpen={target !== undefined}
        title="이 신청을 선택할까요"
        onClose={() => setTarget(undefined)}
        footer={
          <>
            <Button
              variant="cancel"
              onClick={() => setTarget(undefined)}
              disabled={mutation.isPending}
            >
              취소
            </Button>
            <Button
              isLoading={mutation.isPending}
              onClick={() => target && mutation.mutate(target)}
            >
              선택하기
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>
            {kind === "CHANGE"
              ? "변경 신청을 선택하면 재승인으로 처리되며 별도의 거절 버튼은 없습니다. "
              : ""}
            선택한 뒤 시스템이 최신 조건을 다시 확인하며, 통과하면 방문이 확정됩니다.
          </p>
          <label htmlFor="selection-note" className="text-caption font-semibold text-ink">
            선택 메모 (선택 입력)
          </label>
          <textarea
            id="selection-note"
            value={note}
            maxLength={200}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-20 rounded-control border border-line px-3 py-2 text-body text-ink"
          />
        </div>
      </Modal>
    </div>
  );
}
