"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type { VisitCoordinationDetailResponse } from "@/lib/api/contracts/visit.schema";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { createChangeRequest, createVisitRequest, withdrawVisitRequest } from "../api/request.api";
import type { RequestListItem } from "../api/request.api";
import { useChangeSlots, useVisitRequests } from "../hooks/request-queries";
import { visitKeys } from "../hooks/visit-queries";
import { ITEM_RESULT_LABEL, labelOf } from "../model/labels";
import { describeRequestQuota, describeVisitError, violatedRuleCodes } from "../model/messages";
import {
  ACTIVE_REQUEST_STATUSES,
  REQUEST_KIND_LABEL,
  REQUEST_NOT_RESERVATION_NOTICE,
  REQUEST_RULE_LABEL,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TONE,
} from "../model/request-labels";
import type { RequestBody } from "../model/request-form";
import { minutesBetween } from "../model/time";
import { RequestForm } from "./request-form";

type Detail = VisitCoordinationDetailResponse;
type Candidate = Detail["candidateProperties"][number];

const SUBMITTABLE = ["FINAL_CONFIRMATION_REQUIRED", "APPLYING"];

function useRefreshAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: visitKeys.all });
}

export function RequestFailure({ error }: { error: unknown }) {
  const quota = describeRequestQuota(error);
  const rules = violatedRuleCodes(error);
  return (
    <FormAlert>
      {quota ?? describeVisitError(error, "신청을 처리하지 못했습니다. 다시 시도해 주세요.")}
      {rules.length > 0 ? (
        <span className="mt-1 block">
          {rules.map((rule) => (
            <span key={rule} className="block">
              {REQUEST_RULE_LABEL[rule] ?? rule}
            </span>
          ))}
        </span>
      ) : null}
    </FormAlert>
  );
}

export function RequestStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={REQUEST_STATUS_TONE[status] ?? "gray"}>
      {REQUEST_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export function WithdrawButton({ request }: { request: RequestListItem }) {
  const refresh = useRefreshAll();
  const { isReadOnly, role } = useOfficeAccess();
  const [error, setError] = useState<string>();
  const mutation = useMutation({
    mutationFn: () => withdrawVisitRequest(request.requestId, request.version ?? 1),
    onSuccess: async () => {
      setError(undefined);
      await refresh();
    },
    onError: async (caught) => {
      setError(describeVisitError(caught, "신청을 철회하지 못했습니다."));
      await refresh();
    },
  });
  if (request.status !== "PENDING" || role === "DEPUTY") return null;
  return (
    <span className="flex flex-col items-start gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={isReadOnly}
        isLoading={mutation.isPending}
        aria-label={`신청 ${request.requestId} 철회`}
        onClick={() => mutation.mutate()}
      >
        신청 철회
      </Button>
      {error ? (
        <span role="alert" className="text-caption text-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}

function CandidateRequests({
  detail,
  candidate,
  requests,
}: {
  detail: Detail;
  candidate: Candidate;
  requests: RequestListItem[];
}) {
  const refresh = useRefreshAll();
  const { role, isReadOnly } = useOfficeAccess();
  const [isOpen, setIsOpen] = useState(false);
  const [notice, setNotice] = useState<string>();
  const mutation = useMutation({
    mutationFn: (body: RequestBody) =>
      createVisitRequest(detail.coordinationId, {
        candidatePropertyId: candidate.candidatePropertyId,
        ...body,
      }),
    onSuccess: async () => {
      setIsOpen(false);
      setNotice("방문 신청을 제출했습니다. 승인자가 신청을 비교해 선택할 때까지 기다려 주세요.");
      await refresh();
    },
  });
  const own = requests.filter((item) => item.candidatePropertyId === candidate.candidatePropertyId);
  const state = candidate.grantState;
  let blocked: string | undefined;
  if (role === "DEPUTY") blocked = "중개보조원은 방문 신청을 낼 수 없습니다.";
  else if (candidate.crossOffice && state !== "ACTIVE") {
    blocked = "허용이 회수되었거나 만료되어 신청할 수 없습니다. 허용한 사무소에 문의해 주세요.";
  } else if (!SUBMITTABLE.includes(detail.status)) {
    blocked = "지금 조율 상태에서는 새 신청을 낼 수 없습니다.";
  }
  const hasActive = own.some((item) => ACTIVE_REQUEST_STATUSES.includes(item.status));
  return (
    <li className="flex flex-col gap-2 border-b border-line py-3">
      <span className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
        {candidate.propertyName}
        {candidate.crossOffice ? (
          <Badge tone="teal">{`${candidate.ownerOfficeName}의 매물`}</Badge>
        ) : null}
        {candidate.crossOffice && candidate.grantId ? (
          <span className="text-caption font-normal text-ink-2">
            허용한 사무소 {candidate.ownerOfficeName}
          </span>
        ) : null}
      </span>
      {candidate.applicableSlots.length > 0 ? (
        <span className="text-caption text-ink-2">
          신청 가능 구간 {candidate.applicableSlots.length}개
        </span>
      ) : null}
      {own.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {own.map((item) => (
            <li key={item.requestId} className="flex flex-wrap items-center gap-2 text-caption">
              <RequestStatusBadge status={item.status} />
              <span className="text-ink">
                {formatSeoulDateTime(item.requestedStartAt)} ~{" "}
                {formatSeoulDateTime(item.requestedEndAt)}
              </span>
              {item.requestKind === "CHANGE" ? (
                <span className="text-ink-2">{REQUEST_KIND_LABEL.CHANGE}</span>
              ) : null}
              <WithdrawButton request={item} />
            </li>
          ))}
        </ul>
      ) : null}
      {notice ? <FormNotice>{notice}</FormNotice> : null}
      {isOpen ? (
        <RequestForm
          slots={candidate.applicableSlots}
          submitLabel="방문 신청 제출"
          isPending={mutation.isPending}
          feedback={mutation.isError ? <RequestFailure error={mutation.error} /> : undefined}
          onSubmit={(body) => mutation.mutate(body)}
          onCancel={() => setIsOpen(false)}
        />
      ) : blocked ? (
        <p className="text-caption text-ink-2">{blocked}</p>
      ) : (
        <Button
          size="sm"
          variant="outlined"
          disabled={isReadOnly || hasActive}
          onClick={() => {
            mutation.reset();
            setNotice(undefined);
            setIsOpen(true);
          }}
        >
          {hasActive ? "신청 진행 중" : "방문 신청"}
        </Button>
      )}
    </li>
  );
}

export function RequestsSection({ detail }: { detail: Detail }) {
  const query = useVisitRequests(detail.coordinationId);
  return (
    <section id="requests" className="flex flex-col gap-3" aria-labelledby="requests-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="requests-title" className="text-h2 font-semibold text-ink">
          방문 신청
        </h2>
        <Link
          href={`/coordinations/${detail.coordinationId}/requests`}
          className="text-caption font-semibold text-primary hover:underline"
        >
          신청 현황과 알림
        </Link>
      </div>
      <p className="text-caption text-ink-2">
        신청은 고객 가능 시간과 승인자 조건이 맞는 구간에서만 낼 수 있고 승인자의 시간표 전체는
        보이지 않습니다. {REQUEST_NOT_RESERVATION_NOTICE}
      </p>
      {query.isError ? (
        <FormAlert>신청 목록을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.</FormAlert>
      ) : null}
      <ul className="flex flex-col">
        {detail.candidateProperties.map((candidate) => (
          <CandidateRequests
            key={candidate.candidatePropertyId}
            detail={detail}
            candidate={candidate}
            requests={query.data?.items ?? []}
          />
        ))}
      </ul>
    </section>
  );
}

function ChangeItem({
  detail,
  item,
}: {
  detail: Detail;
  item: NonNullable<Detail["scheduleItems"]>[number];
}) {
  const refresh = useRefreshAll();
  const { role, isReadOnly } = useOfficeAccess();
  const [isOpen, setIsOpen] = useState(false);
  const [notice, setNotice] = useState<string>();
  const slots = useChangeSlots(detail.coordinationId, item.itemId, isOpen);
  const candidate = detail.candidateProperties.find(
    (entry) => entry.candidatePropertyId === item.candidatePropertyId,
  );
  const mutation = useMutation({
    mutationFn: (body: RequestBody) => createChangeRequest(item.itemId, body),
    onSuccess: async () => {
      setIsOpen(false);
      setNotice(
        "변경 신청을 올렸습니다. 승인자가 재승인하기 전에는 기존 확정이 유지되고 시스템이 방문을 옮기지 않습니다.",
      );
      await refresh();
    },
  });
  const alternatives = detail.alternatives.filter((entry) => entry.scheduleItemId === item.itemId);
  const isAffected = item.state === "RESCHEDULE_REQUIRED";
  const canChange = item.result === "SCHEDULED" && role !== "DEPUTY";
  const changeSlots =
    slots.data?.candidateProperties.find(
      (entry) => entry.candidatePropertyId === item.candidatePropertyId,
    )?.applicableSlots ?? [];
  return (
    <li className="flex flex-col gap-2 border-b border-line py-3">
      <span className="flex flex-wrap items-center gap-2 text-body text-ink">
        <span className="font-semibold">{candidate?.propertyName ?? ""}</span>
        <span className="text-caption text-ink-2">
          {item.scheduledStartAt ? formatSeoulDateTime(item.scheduledStartAt) : "시각 미정"}
        </span>
        <Badge tone={isAffected ? "red" : "gray"}>{labelOf(ITEM_RESULT_LABEL, item.result)}</Badge>
        <Badge tone={isAffected ? "red" : "green"}>
          {isAffected ? "변경 필요" : "영향 없이 고정"}
        </Badge>
        {item.travelFeasibleToNext === false ? (
          <span className="text-caption text-danger">다음 방문까지 이동이 어렵습니다.</span>
        ) : null}
      </span>
      {isAffected && alternatives.length === 0 ? (
        <p className="text-caption text-ink-2">
          대안이 없어 변경이 필요하다는 알림을 보냈습니다. 이 매물을 이번 조율에서 제외하려면 방문
          결과를 취소로 기록해 주세요.
        </p>
      ) : null}
      {alternatives.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {alternatives.map((entry) => (
            <AlternativeRow
              key={`${entry.scheduleItemId}-${entry.startAt}`}
              entry={entry}
              disabled={!canChange || isReadOnly}
              onChoose={() =>
                mutation.mutate({
                  requestedStartAt: entry.startAt,
                  requestedEndAt: entry.endAt,
                  expectedDurationMinutes: minutesBetween(entry.startAt, entry.endAt),
                  partySize: null,
                  requestNote: null,
                })
              }
              isPending={mutation.isPending}
            />
          ))}
        </ul>
      ) : null}
      {notice ? <FormNotice>{notice}</FormNotice> : null}
      {mutation.isError && !isOpen ? <RequestFailure error={mutation.error} /> : null}
      {isOpen ? (
        slots.isPending ? (
          <p className="text-caption text-ink-2">변경 가능한 구간을 불러오는 중입니다.</p>
        ) : slots.isError ? (
          <FormAlert>변경 가능한 구간을 불러오지 못했습니다.</FormAlert>
        ) : (
          <RequestForm
            slots={changeSlots}
            submitLabel="변경 신청 제출"
            isPending={mutation.isPending}
            feedback={mutation.isError ? <RequestFailure error={mutation.error} /> : undefined}
            onSubmit={(body) => mutation.mutate(body)}
            onCancel={() => setIsOpen(false)}
          />
        )
      ) : canChange ? (
        <Button
          size="sm"
          variant="outlined"
          disabled={isReadOnly}
          onClick={() => {
            mutation.reset();
            setNotice(undefined);
            setIsOpen(true);
          }}
        >
          직접 구간 골라 변경 신청
        </Button>
      ) : null}
    </li>
  );
}

function AlternativeRow({
  entry,
  disabled,
  isPending,
  onChoose,
}: {
  entry: Detail["alternatives"][number];
  disabled: boolean;
  isPending: boolean;
  onChoose: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-primary-soft px-3 py-2">
      <span className="text-caption text-ink">
        변경안 {formatSeoulDateTime(entry.startAt)} ~ {formatSeoulDateTime(entry.endAt)}
        <span className="block text-ink-2">
          고객 {entry.checks.customer} · 중개사 {entry.checks.broker} · 승인자 조건{" "}
          {entry.checks.approverCondition} · 확정 방문 {entry.checks.confirmedVisits} · 이동{" "}
          {entry.checks.travel}
        </span>
      </span>
      <Button size="sm" disabled={disabled} isLoading={isPending} onClick={onChoose}>
        이 변경안으로 재승인 요청
      </Button>
    </li>
  );
}

export function ChangeSection({ detail }: { detail: Detail }) {
  const items = detail.scheduleItems ?? [];
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="change-title">
      <h2 id="change-title" className="text-h2 font-semibold text-ink">
        확정 방문 변경과 재승인
      </h2>
      <p className="text-caption text-ink-2">
        영향이 없는 확정 방문은 시각이 고정됩니다. 변경이 필요한 방문만 변경안을 고르고 해당 매물
        승인자의 재승인을 받습니다. 재승인을 받기 전에는 기존 확정이 유지되며 시스템이 임의로 방문을
        옮기지 않습니다. 승인자는 변경 신청을 선택하는 것으로 응답하고 별도 거절 버튼은 없습니다.
      </p>
      <ul className="flex flex-col">
        {items.map((item) => (
          <ChangeItem key={item.itemId} detail={detail} item={item} />
        ))}
      </ul>
    </section>
  );
}
