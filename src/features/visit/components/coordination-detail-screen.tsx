"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type { VisitCoordinationDetailResponse } from "@/lib/api/contracts/visit.schema";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Modal } from "@/shared/components/ui/modal";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { useAssignableMembers } from "@/shared/session/assignable-members";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import {
  addCandidate,
  changeManager,
  checkScheduleConflicts,
  issueCustomerLink,
  reissueCustomerLink,
  removeCandidate,
  saveSchedule,
} from "../api/visit.api";
import { useAssistantCustomer, useCoordinationDetail, visitKeys } from "../hooks/visit-queries";
import {
  CONFLICT_TYPE_LABEL,
  GRANT_STATE_LABEL,
  GRANT_STATE_TONE,
  ITEM_RESULT_LABEL,
  MAX_CANDIDATES,
  labelOf,
  statusLabel,
  statusTone,
} from "../model/labels";
import { describeVisitError, isApiCode } from "../model/messages";
import { minutesBetween } from "../model/time";
import { IssuedLinkDialog } from "./issued-link-dialog";
import type { IssuedLink } from "./issued-link-dialog";
import { CandidatePicker } from "./pickers";
import type { CandidateChoice } from "./pickers";

type Detail = VisitCoordinationDetailResponse;
type Candidate = Detail["candidateProperties"][number];

const SCHEDULABLE = ["COORDINATABLE", "FINAL_CONFIRMATION_REQUIRED", "RESCHEDULE_REQUIRED"];
const CLOSED = ["CANCELLED", "VISIT_COMPLETED", "VISIT_INCOMPLETE"];

function useRefresh() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: visitKeys.all });
}

function SectionTitle({ id, children }: { id?: string; children: string }) {
  return (
    <h2 id={id} className="text-h2 font-semibold text-ink">
      {children}
    </h2>
  );
}

function CustomerSummary({ detail, isDeputy }: { detail: Detail; isDeputy: boolean }) {
  const assistant = useAssistantCustomer(detail.customerId, isDeputy);
  if (!isDeputy) {
    return (
      <Link
        href={`/customers/${detail.customerId}`}
        className="font-semibold text-primary hover:underline"
      >
        {detail.customerName}
      </Link>
    );
  }
  if (assistant.isPending)
    return <span className="text-caption text-ink-2">고객 정보를 불러오는 중입니다.</span>;
  if (assistant.isError)
    return (
      <span role="alert" className="text-caption text-danger">
        {describeVisitError(assistant.error, "고객 정보를 불러오지 못했습니다.")}
      </span>
    );
  return (
    <span className="font-semibold text-ink">
      {assistant.data.name} · {assistant.data.phone ?? "연락처 없음"}
    </span>
  );
}

function CandidateRow({
  candidate,
  canRemove,
  isBusy,
  onRemove,
}: {
  candidate: Candidate;
  canRemove: boolean;
  isBusy: boolean;
  onRemove: () => void;
}) {
  const state = candidate.grantState;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
      <div className="flex flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
          {candidate.propertyName}
          {candidate.crossOffice ? <Badge tone="teal">{candidate.ownerOfficeName}</Badge> : null}
          {state ? (
            <Badge tone={GRANT_STATE_TONE[state]}>{`허용 ${GRANT_STATE_LABEL[state]}`}</Badge>
          ) : null}
        </span>
        <span className="text-caption text-ink-2">
          {candidate.propertyAddress ?? "상세주소는 확정 신청 뒤에 보입니다."}
          {candidate.propertyAddressDetail ? ` ${candidate.propertyAddressDetail}` : ""}
        </span>
        <span className="text-caption text-ink-2">
          신청 가능 구간 {candidate.applicableSlots.length}개
          {state && state !== "ACTIVE" ? " · 허용이 끝나 신청할 수 없습니다" : ""}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        disabled={!canRemove}
        isLoading={isBusy}
        aria-label={`${candidate.propertyName} 제거`}
        onClick={onRemove}
      >
        제거
      </Button>
    </li>
  );
}

function CandidatesPanel({ detail, isReadOnly }: { detail: Detail; isReadOnly: boolean }) {
  const refresh = useRefresh();
  const [error, setError] = useState<string>();
  const [isAdding, setIsAdding] = useState(false);
  const [picked, setPicked] = useState<CandidateChoice[]>([]);
  const [removing, setRemoving] = useState<number>();
  const remaining = MAX_CANDIDATES - detail.candidateProperties.length;
  const isClosed = CLOSED.includes(detail.status);

  const removeMutation = useMutation({
    mutationFn: (candidateId: number) => removeCandidate(detail.coordinationId, candidateId),
    onMutate: (candidateId) => setRemoving(candidateId),
    onSuccess: async () => {
      setError(undefined);
      await refresh();
    },
    onError: (caught) => setError(describeVisitError(caught, "후보를 제거하지 못했습니다.")),
    onSettled: () => setRemoving(undefined),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      for (const item of picked) {
        await addCandidate(detail.coordinationId, { propertyId: item.propertyId });
      }
    },
    onSuccess: async () => {
      setError(undefined);
      setIsAdding(false);
      setPicked([]);
      await refresh();
    },
    onError: async (caught) => {
      setError(describeVisitError(caught, "후보를 추가하지 못했습니다."));
      await refresh();
    },
  });

  function canRemove(candidate: Candidate) {
    if (isReadOnly || isClosed) return false;
    if (detail.status === "TIME_COLLECTING") return true;
    return (
      candidate.crossOffice && candidate.grantState !== null && candidate.grantState !== "ACTIVE"
    );
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="candidates-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle id="candidates-title">후보 매물</SectionTitle>
        <Button
          variant="outlined"
          size="sm"
          disabled={isReadOnly || isClosed || remaining <= 0}
          onClick={() => setIsAdding(true)}
        >
          후보 추가
        </Button>
      </div>
      <p className="text-caption text-ink-2">
        후보 매물은 {detail.candidateProperties.length}/{MAX_CANDIDATES}개입니다. 제거는 시간 수집
        전에만 할 수 있고, 허용이 끝난 매물은 확정 방문이 없으면 언제든 제거할 수 있습니다.
      </p>
      {error ? <FormAlert>{error}</FormAlert> : null}
      {detail.candidateProperties.length === 0 ? (
        <p className="text-caption text-ink-2">후보 매물이 없습니다.</p>
      ) : (
        <ul>
          {detail.candidateProperties.map((candidate) => (
            <CandidateRow
              key={candidate.candidatePropertyId}
              candidate={candidate}
              canRemove={canRemove(candidate)}
              isBusy={removing === candidate.candidatePropertyId}
              onRemove={() => removeMutation.mutate(candidate.candidatePropertyId)}
            />
          ))}
        </ul>
      )}
      <Modal
        isOpen={isAdding}
        title="후보 매물 추가"
        onClose={() => setIsAdding(false)}
        footer={
          <>
            <Button variant="cancel" onClick={() => setIsAdding(false)}>
              취소
            </Button>
            <Button
              isLoading={addMutation.isPending}
              disabled={picked.length === 0}
              onClick={() => addMutation.mutate()}
            >
              추가
            </Button>
          </>
        }
      >
        <CandidatePicker
          selected={picked}
          max={remaining}
          excludedIds={detail.candidateProperties.map((item) => item.propertyId)}
          onToggle={(choice) =>
            setPicked((current) =>
              current.some((item) => item.propertyId === choice.propertyId)
                ? current.filter((item) => item.propertyId !== choice.propertyId)
                : [...current, choice],
            )
          }
        />
      </Modal>
    </section>
  );
}

function CustomerTimePanel({ detail, isReadOnly }: { detail: Detail; isReadOnly: boolean }) {
  const refresh = useRefresh();
  const [issued, setIssued] = useState<IssuedLink | null>(null);
  const [error, setError] = useState<string>();
  const link = detail.customerLink;
  const isActive = link !== null && !link.revokedAt;
  const isClosed = CLOSED.includes(detail.status);

  const issue = useMutation({
    mutationFn: () =>
      isActive
        ? reissueCustomerLink(detail.coordinationId)
        : issueCustomerLink(detail.coordinationId),
    onSuccess: async (result) => {
      setError(undefined);
      setIssued({ publicUrl: result.publicUrl, expiresAt: result.expiresAt });
      await refresh();
    },
    onError: (caught) => setError(describeVisitError(caught, "링크를 발급하지 못했습니다.")),
  });

  return (
    <section className="flex flex-col gap-3" aria-labelledby="customer-time-title">
      <SectionTitle id="customer-time-title">고객 가능 시간</SectionTitle>
      {link ? (
        <p className="text-caption text-ink-2">
          발급 {formatSeoulDateTime(link.issuedAt)} · 만료 {formatSeoulDateTime(link.expiresAt)}
          {link.revokedAt ? " · 폐기됨" : ""}
        </p>
      ) : (
        <p className="text-caption text-ink-2">
          아직 고객 링크를 발급하지 않았습니다. 발급한 링크는 직접 복사해 고객에게 전달합니다.
        </p>
      )}
      <p className="text-caption text-ink-2">
        링크 원문은 발급 응답에서 한 번만 보입니다. 다시 전달해야 하면 재발급해 주세요.
      </p>
      {detail.customerRespondedAt ? (
        <div className="flex flex-col gap-1">
          <p className="text-caption text-ink-2">
            고객 응답 {formatSeoulDateTime(detail.customerRespondedAt)}
          </p>
          <ul className="flex flex-wrap gap-2">
            {detail.customerTimeSlots.map((slot) => (
              <li
                key={slot.startsAt}
                className="rounded-control bg-primary-soft px-3 py-1 text-caption text-ink"
              >
                {formatSeoulDateTime(slot.startsAt)} ~ {formatSeoulDateTime(slot.endsAt)}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-caption text-ink-2">고객이 제출한 가능 시간이 아직 없습니다.</p>
      )}
      {error ? <FormAlert>{error}</FormAlert> : null}
      <div>
        <Button
          variant="outlined"
          size="sm"
          disabled={isReadOnly || isClosed}
          isLoading={issue.isPending}
          onClick={() => issue.mutate()}
        >
          {isActive ? "링크 재발급" : "고객 링크 발급"}
        </Button>
      </div>
      <IssuedLinkDialog
        title="고객 링크"
        link={issued}
        notice="이 링크는 지금만 볼 수 있습니다. 복사해 고객에게 직접 전달해 주세요."
        onClose={() => setIssued(null)}
      />
    </section>
  );
}

type ScheduleRow = { candidatePropertyId: number; order: string; visit: string; travel: string };

function SchedulePanel({ detail, isReadOnly }: { detail: Detail; isReadOnly: boolean }) {
  const refresh = useRefresh();
  const [rows, setRows] = useState<ScheduleRow[]>(() =>
    detail.candidateProperties.map((item, index) => ({
      candidatePropertyId: item.candidatePropertyId,
      order: String(index + 1),
      visit: "30",
      travel: "15",
    })),
  );
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const canSchedule = SCHEDULABLE.includes(detail.status);
  const nameOf = (id: number) =>
    detail.candidateProperties.find((item) => item.candidatePropertyId === id)?.propertyName ?? "";

  const conflicts = useMutation({
    mutationFn: () => checkScheduleConflicts(detail.coordinationId),
    onError: (caught) => setError(describeVisitError(caught, "충돌 여부를 확인하지 못했습니다.")),
  });

  const save = useMutation({
    mutationFn: () =>
      saveSchedule(
        detail.coordinationId,
        {
          items: rows.map((row) => ({
            candidatePropertyId: row.candidatePropertyId,
            sortOrder: Number(row.order),
            visitDurationMinutes: Number(row.visit),
            travelDurationMinutes: Number(row.travel),
          })),
        },
        detail.version,
      ),
    onSuccess: async () => {
      setError(undefined);
      setNotice("일정 구성을 저장했습니다. 신청 가능한 시작 시각 후보가 계산되었습니다.");
      await refresh();
    },
    onError: async (caught) => {
      setNotice(undefined);
      setError(describeVisitError(caught, "일정을 저장하지 못했습니다."));
      if (isApiCode(caught, "VERSION_CONFLICT") || isApiCode(caught, "INVALID_TRANSITION")) {
        await refresh();
      }
    },
  });

  function update(id: number, key: keyof ScheduleRow, value: string) {
    setRows((current) =>
      current.map((row) => (row.candidatePropertyId === id ? { ...row, [key]: value } : row)),
    );
    setErrors((current) => ({ ...current, [id]: "" }));
  }

  function submit() {
    const next: Record<number, string> = {};
    for (const row of rows) {
      const order = Number(row.order);
      const visit = Number(row.visit);
      const travel = Number(row.travel);
      if (!Number.isInteger(order) || order < 1)
        next[row.candidatePropertyId] = "순서는 1 이상의 정수로 입력해 주세요.";
      else if (!Number.isInteger(visit) || visit < 5 || visit > 240)
        next[row.candidatePropertyId] = "방문 소요시간은 5분에서 240분 사이로 입력해 주세요.";
      else if (!Number.isInteger(travel) || travel < 0 || travel > 240)
        next[row.candidatePropertyId] = "이동시간은 0분에서 240분 사이로 입력해 주세요.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setError(undefined);
    save.mutate();
  }

  return (
    <section id="schedule" className="flex flex-col gap-3" aria-labelledby="schedule-title">
      <SectionTitle id="schedule-title">일정 구성</SectionTitle>
      {!canSchedule ? (
        <p className="text-caption text-ink-2">
          고객이 가능 시간을 제출해 조율 가능 상태가 되면 일정을 구성할 수 있습니다.
        </p>
      ) : (
        <>
          <p className="text-caption text-ink-2">
            방문 순서와 방문 소요시간, 다음 매물까지의 이동시간을 입력합니다. 저장하면 고객 가능
            시간과 승인자 조건 안의 시작 시각 후보가 계산됩니다. 겹치는 신청은 함께 존재할 수 있고
            확정 예약이나 점유가 아닙니다.
          </p>
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <li
                key={row.candidatePropertyId}
                className="flex flex-col gap-2 rounded-card-flat border border-line p-3"
              >
                <span className="text-body font-semibold text-ink">
                  {nameOf(row.candidatePropertyId)}
                </span>
                <div className="grid gap-3 sm:grid-cols-3">
                  <TextField
                    label="방문 순서"
                    kind="number"
                    value={row.order}
                    disabled={isReadOnly}
                    onValueChange={(value) => update(row.candidatePropertyId, "order", value)}
                  />
                  <TextField
                    label="방문 소요시간 (분)"
                    kind="number"
                    value={row.visit}
                    disabled={isReadOnly}
                    onValueChange={(value) => update(row.candidatePropertyId, "visit", value)}
                  />
                  <TextField
                    label="다음 매물까지 이동시간 (분)"
                    kind="number"
                    value={row.travel}
                    disabled={isReadOnly}
                    onValueChange={(value) => update(row.candidatePropertyId, "travel", value)}
                  />
                </div>
                {errors[row.candidatePropertyId] ? (
                  <p role="alert" className="text-caption text-danger">
                    {errors[row.candidatePropertyId]}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          {error ? <FormAlert>{error}</FormAlert> : null}
          {notice ? <FormNotice>{notice}</FormNotice> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              isLoading={conflicts.isPending}
              onClick={() => {
                setError(undefined);
                conflicts.mutate();
              }}
            >
              충돌 확인
            </Button>
            <Button size="sm" isLoading={save.isPending} disabled={isReadOnly} onClick={submit}>
              일정 저장
            </Button>
          </div>
          {conflicts.data ? (
            conflicts.data.conflicts.length === 0 ? (
              <FormNotice>겹치는 일정이 없습니다.</FormNotice>
            ) : (
              <ul aria-label="겹치는 일정" className="flex flex-col gap-2">
                {conflicts.data.conflicts.map((item) => (
                  <li
                    key={`${item.candidatePropertyId}-${item.conflictingScheduleItemId}`}
                    className="rounded-control bg-tag-yellow px-4 py-2 text-caption text-tag-yellow-ink"
                  >
                    {nameOf(item.candidatePropertyId)} ·{" "}
                    {labelOf(CONFLICT_TYPE_LABEL, item.conflictType)} ·{" "}
                    {formatSeoulDateTime(item.conflictingStartAt)} ~{" "}
                    {formatSeoulDateTime(item.conflictingEndAt)}
                    {item.conflictingPropertyName ? ` · ${item.conflictingPropertyName}` : ""}
                  </li>
                ))}
              </ul>
            )
          ) : null}
          {save.data ? (
            <ul aria-label="계산된 시작 시각" className="flex flex-col gap-1">
              {save.data.items.map((item) => (
                <li key={item.candidatePropertyId} className="text-caption text-ink">
                  {item.sortOrder}. {nameOf(item.candidatePropertyId)} ·{" "}
                  {formatSeoulDateTime(item.suggestedStartAt)} (
                  {minutesBetween(item.suggestedStartAt, item.suggestedEndAt)}분)
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </section>
  );
}

function ManagerPanel({ detail, isReadOnly }: { detail: Detail; isReadOnly: boolean }) {
  const refresh = useRefresh();
  const members = useAssignableMembers();
  const [selected, setSelected] = useState(String(detail.managerMembershipId));
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const mutation = useMutation({
    mutationFn: () =>
      changeManager(
        detail.coordinationId,
        { managerMembershipId: Number(selected) },
        detail.version,
      ),
    onSuccess: async () => {
      setError(undefined);
      setNotice("담당자를 바꿨습니다.");
      await refresh();
    },
    onError: async (caught) => {
      setNotice(undefined);
      setError(describeVisitError(caught, "담당자를 바꾸지 못했습니다."));
      if (isApiCode(caught, "VERSION_CONFLICT")) await refresh();
    },
  });

  return (
    <section className="flex flex-col gap-3" aria-labelledby="manager-title">
      <SectionTitle id="manager-title">담당자 변경</SectionTitle>
      <p className="text-caption text-ink-2">
        담당 변경은 대표와 소속공인중개사만 할 수 있습니다. 새 담당자의 확정 일정과 겹치면 변경되지
        않습니다.
      </p>
      <SelectField
        label="담당자"
        value={selected}
        options={(members.data ?? []).map((item) => ({
          value: String(item.membershipId),
          label: item.displayName,
        }))}
        onValueChange={setSelected}
      />
      {error ? <FormAlert>{error}</FormAlert> : null}
      {notice ? <FormNotice>{notice}</FormNotice> : null}
      <div>
        <Button
          size="sm"
          isLoading={mutation.isPending}
          disabled={isReadOnly || selected === String(detail.managerMembershipId)}
          onClick={() => mutation.mutate()}
        >
          담당자 변경
        </Button>
      </div>
    </section>
  );
}

function RequestsPanel({ detail }: { detail: Detail }) {
  return (
    <section id="requests" className="flex flex-col gap-3" aria-labelledby="requests-title">
      <SectionTitle id="requests-title">신청 가능 구간</SectionTitle>
      <p className="text-caption text-ink-2">
        신청 가능한 구간은 고객 가능 시간과 승인자 조건, 중개사 일정의 교집합으로 서버가 계산합니다.
        승인자의 시간표 전체는 보이지 않습니다.
      </p>
      <ul className="flex flex-col gap-2">
        {detail.candidateProperties.map((candidate) => (
          <li key={candidate.candidatePropertyId} className="flex flex-col gap-1">
            <span className="text-body font-semibold text-ink">{candidate.propertyName}</span>
            {candidate.applicableSlots.length === 0 ? (
              <span className="text-caption text-ink-2">지금 신청할 수 있는 구간이 없습니다.</span>
            ) : (
              <span className="flex flex-wrap gap-2">
                {candidate.applicableSlots.map((slot) => (
                  <span
                    key={slot.startsAt}
                    className="rounded-control bg-primary-soft px-3 py-1 text-caption text-ink"
                  >
                    {formatSeoulDateTime(slot.startsAt)} ~ {formatSeoulDateTime(slot.endsAt)}
                  </span>
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ScheduleItemsPanel({ detail }: { detail: Detail }) {
  const items = detail.scheduleItems ?? [];
  if (items.length === 0) return null;
  const nameOf = (id: number) =>
    detail.candidateProperties.find((item) => item.candidatePropertyId === id)?.propertyName ?? "";
  return (
    <section className="flex flex-col gap-3" aria-labelledby="items-title">
      <SectionTitle id="items-title">확정된 방문</SectionTitle>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.itemId} className="flex flex-wrap items-center gap-3 text-body text-ink">
            <span className="font-semibold">{nameOf(item.candidatePropertyId)}</span>
            <span className="text-caption text-ink-2">
              {item.scheduledStartAt ? formatSeoulDateTime(item.scheduledStartAt) : "시각 미정"}
            </span>
            <Badge tone={item.state === "RESCHEDULE_REQUIRED" ? "red" : "gray"}>
              {labelOf(ITEM_RESULT_LABEL, item.result)}
            </Badge>
            {item.state === "RESCHEDULE_REQUIRED" ? (
              <span className="text-caption text-danger">재조율 필요</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DetailBody({ detail }: { detail: Detail }) {
  const { role, isReadOnly } = useOfficeAccess();
  const isDeputy = role === "DEPUTY";
  const alert = detail.rescheduleAlert;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 font-bold text-ink">방문 조율 상세</h1>
          <div className="flex flex-wrap items-center gap-3 text-body text-ink">
            <CustomerSummary detail={detail} isDeputy={isDeputy} />
            <Badge tone={statusTone(detail.status)}>{statusLabel(detail.status)}</Badge>
          </div>
          <p className="text-caption text-ink-2">
            담당 {detail.managerName} · 방문 가능 {formatSeoulDate(detail.periodStartDate)} ~{" "}
            {formatSeoulDate(detail.periodEndDate)}
          </p>
        </div>
        <Link
          href="/coordinations"
          className="inline-flex h-12 items-center rounded-control border border-line bg-white px-6 text-body font-medium text-ink-2 hover:border-primary hover:text-primary"
        >
          목록
        </Link>
      </header>
      {alert ? (
        <FormAlert>
          재조율이 필요합니다. {alert.reason ?? "일정이 바뀌었습니다."} (
          {formatSeoulDateTime(alert.raisedAt)})
        </FormAlert>
      ) : null}
      <Card>
        <div className="flex flex-col gap-8">
          <CandidatesPanel detail={detail} isReadOnly={isReadOnly} />
          <CustomerTimePanel detail={detail} isReadOnly={isReadOnly} />
          <SchedulePanel
            key={detail.candidateProperties.map((item) => item.candidatePropertyId).join("-")}
            detail={detail}
            isReadOnly={isReadOnly}
          />
          <RequestsPanel detail={detail} />
          <ScheduleItemsPanel detail={detail} />
          {isDeputy ? null : <ManagerPanel detail={detail} isReadOnly={isReadOnly} />}
        </div>
      </Card>
    </div>
  );
}

export function CoordinationDetailScreen({ coordinationId }: { coordinationId: number }) {
  const query = useCoordinationDetail(coordinationId);
  return (
    <QueryGate query={query} loadingLabel="조율 정보를 불러오는 중입니다.">
      {(detail) => <DetailBody detail={detail} />}
    </QueryGate>
  );
}
