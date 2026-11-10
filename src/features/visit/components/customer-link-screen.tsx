"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type {
  PublicConfirmedVisitResponse,
  PublicVisitLinkResponse,
} from "@/lib/api/contracts/visit.schema";
import { ApiError } from "@/shared/api/client";
import { toErrorScreenKind } from "@/shared/api/error-kind";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { Tabs } from "@/shared/components/ui/tabs";
import { formatSeoulDateTime, formatTimeSlot } from "@/shared/lib/format";
import { normalizeLinkToken } from "@/shared/lib/link-token";
import { fetchCustomerConfirmed, fetchCustomerLink, submitCustomerTimes } from "../api/follow.api";
import { LEGAL_ROLE_LABEL, PUBLIC_VISIT_STATE_LABEL, labelOf } from "../model/labels";
import { LINK_COMMON_COPY, linkExpiredNotice } from "../model/legal-copy";
import type { LinkNoticeContext } from "../model/legal-copy";
import { describeVisitError, isApiCode } from "../model/messages";
import { CustomerLinkPrivacyNotice, LinkCommonNotices } from "./link-legal-notices";
import { kstParts } from "../model/time";
import {
  MAX_CUSTOMER_SLOTS,
  parseSubmittedSlots,
  toSubmitSlots,
  validateSlots,
} from "../model/customer-times";
import type { SlotDraft, SlotErrors } from "../model/customer-times";

const EMPTY_NOTICE_CONTEXT: LinkNoticeContext = {
  officeName: null,
  officeContactPhone: null,
  operatorName: null,
  privacyContact: null,
  retentionDays: null,
};

function LinkProblem() {
  return (
    <ErrorScreen
      kind="not-found"
      title="링크를 열 수 없습니다"
      description={`${linkExpiredNotice(EMPTY_NOTICE_CONTEXT)} 입력하신 내용은 정해진 보관 기간이 지나면 삭제됩니다.`}
    />
  );
}

function ManagerLine({ name, role }: { name: string; role: keyof typeof LEGAL_ROLE_LABEL }) {
  return (
    <>
      <p className="text-body text-ink">
        담당 {name} ({LEGAL_ROLE_LABEL[role]})
      </p>
      {role === "ASSISTANT" ? (
        <FormNotice>
          담당자는 중개보조원입니다. 중개보조원은 공인중개사가 아니며 소속 공인중개사의 감독 아래
          방문을 안내합니다.
        </FormNotice>
      ) : null}
    </>
  );
}

function TimeForm({ token, link }: { token: string; link: PublicVisitLinkResponse }) {
  const queryClient = useQueryClient();
  const initial = parseSubmittedSlots(link.submittedTimeSlots);
  const [seq, setSeq] = useState(initial.length);
  const [slots, setSlots] = useState<SlotDraft[]>(() =>
    initial.map((slot, index) => {
      const start = kstParts(slot.startsAt);
      const end = kstParts(slot.endsAt);
      return { key: index, date: start.date, start: start.time, end: end.time };
    }),
  );
  const [errors, setErrors] = useState<SlotErrors>({});
  const [formError, setFormError] = useState<string>();
  const mutation = useMutation({
    mutationFn: () =>
      submitCustomerTimes(token, {
        timeSlots: toSubmitSlots(slots),
        acknowledgedNoticeVersion: link.privacyNotice.noticeVersion,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["visit-public", token] }),
    onError: (error) => {
      if (isApiCode(error, "NOTICE_VERSION_CHANGED")) {
        void queryClient.invalidateQueries({ queryKey: ["visit-public", token] });
      }
    },
  });
  const isClosed = link.coordinationStatus === "CANCELLED";
  const isResubmit = initial.length > 0;

  function update(key: number, changes: Partial<SlotDraft>) {
    setSlots((current) =>
      current.map((slot) => (slot.key === key ? { ...slot, ...changes } : slot)),
    );
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function submit() {
    const result = validateSlots(slots, link.candidateWindow);
    setErrors(result.errors);
    setFormError(result.formError);
    if (!result.formError && Object.keys(result.errors).length === 0) mutation.mutate();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-caption text-ink-2">
        방문 가능 기간은 {link.candidateWindow.startDate} ~ {link.candidateWindow.endDate}입니다.
        제출은 {formatSeoulDateTime(link.linkExpiresAt)}까지 할 수 있고 마감 전에는 다시 제출해 고칠
        수 있습니다.
      </p>
      <ul className="flex flex-col gap-3">
        {slots.map((slot, index) => (
          <li key={slot.key} className="flex flex-col gap-2 rounded-control border border-line p-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <DateTimeField
                label={`${index + 1}번째 날짜`}
                kind="date"
                value={slot.date}
                onValueChange={(value) => update(slot.key, { date: value })}
              />
              <DateTimeField
                label={`${index + 1}번째 시작`}
                kind="time"
                value={slot.start}
                onValueChange={(value) => update(slot.key, { start: value })}
              />
              <DateTimeField
                label={`${index + 1}번째 종료`}
                kind="time"
                value={slot.end}
                onValueChange={(value) => update(slot.key, { end: value })}
              />
            </div>
            {errors[slot.key] ? (
              <p role="alert" className="text-caption text-danger">
                {errors[slot.key]}
              </p>
            ) : null}
            <div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setSlots((current) => current.filter((entry) => entry.key !== slot.key))
                }
              >
                {index + 1}번째 시간 삭제
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <div>
        <Button
          size="sm"
          variant="outlined"
          disabled={slots.length >= MAX_CUSTOMER_SLOTS || isClosed}
          onClick={() => {
            setSlots((current) => [...current, { key: seq, date: "", start: "", end: "" }]);
            setSeq((current) => current + 1);
          }}
        >
          가능한 시간 추가
        </Button>
      </div>
      <p className="text-caption text-ink-2">{LINK_COMMON_COPY.aboveSubmit}</p>
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      {mutation.isError ? (
        <FormAlert>
          {isApiCode(mutation.error, "NOTICE_VERSION_CHANGED")
            ? LINK_COMMON_COPY.noticeChanged
            : describeVisitError(mutation.error, "시간을 제출하지 못했습니다. 다시 시도해 주세요.")}
        </FormAlert>
      ) : null}
      {mutation.isSuccess ? <FormNotice>가능한 시간을 제출했습니다.</FormNotice> : null}
      <Button fullWidth isLoading={mutation.isPending} disabled={isClosed} onClick={submit}>
        {isResubmit ? "가능한 시간 수정 제출" : "가능한 시간 제출"}
      </Button>
    </div>
  );
}

function ConfirmedView({ data, contact }: { data: PublicConfirmedVisitResponse; contact: string }) {
  const isValid = data.state === "VALID";
  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2">
        <Badge tone={isValid ? "green" : "red"}>
          {labelOf(PUBLIC_VISIT_STATE_LABEL, data.state)}
        </Badge>
      </p>
      <ManagerLine name={data.managerDisplayName} role={data.managerLegalRole} />
      {isValid ? (
        <ol className="flex flex-col gap-3">
          {data.items.map((item) => (
            <li
              key={item.sortOrder}
              className="flex flex-col gap-1 rounded-control border border-line p-3"
            >
              <span className="text-body font-semibold text-ink">
                {item.sortOrder}. {item.propertyAddress}
              </span>
              <span className="text-caption text-ink-2">
                {formatSeoulDateTime(item.scheduledStartAt)} ~ {formatTimeSlot(item.scheduledEndAt)}
              </span>
              {item.travelDurationMinutes !== null ? (
                <span className="text-caption text-ink-2">
                  다음 방문까지 이동 {item.travelDurationMinutes}분
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          title="일정을 표시할 수 없습니다"
          description="일정이 취소되었거나 다시 조율 중입니다. 사무소에 문의해 다시 확인해 주세요."
        />
      )}
      <p className="text-caption text-ink-2">
        문의{" "}
        <a href={`tel:${contact}`} className="font-semibold text-primary">
          {contact}
        </a>
      </p>
      <p className="text-caption text-ink-2">
        확정 일정은 마지막 방문의 예정 종료 시각부터 24시간까지만 볼 수 있습니다.
      </p>
    </div>
  );
}

function ConfirmedTab({ token, contact }: { token: string; contact: string }) {
  const query = useQuery({
    queryKey: ["visit-public", token, "confirmed"],
    queryFn: ({ signal }) => fetchCustomerConfirmed(token, signal),
    retry: false,
  });
  if (query.isPending) return <PageSkeleton />;
  if (query.isError) {
    if (query.error instanceof ApiError && [404, 410].includes(query.error.status)) {
      return (
        <EmptyState
          title="확정된 일정이 아직 없습니다"
          description="일정이 확정되었거나 열람 기한이 지났다면 사무소에 문의해 주세요."
        />
      );
    }
    return (
      <ErrorScreen kind={toErrorScreenKind(query.error)} onRetry={() => void query.refetch()} />
    );
  }
  return <ConfirmedView data={query.data} contact={contact} />;
}

export function CustomerLinkScreen({ token }: { token: string | undefined }) {
  const normalized = normalizeLinkToken(token);
  const [tab, setTab] = useState("times");
  const query = useQuery({
    queryKey: ["visit-public", normalized],
    queryFn: ({ signal }) => fetchCustomerLink(normalized ?? "", signal),
    enabled: normalized !== null,
    retry: false,
  });
  if (normalized === null) return <LinkProblem />;
  if (query.isPending) return <PageSkeleton />;
  if (query.isError) {
    const error = query.error;
    if (isApiCode(error, "PUBLIC_LINK_EXPIRED")) return <LinkProblem />;
    if (error instanceof ApiError && error.status === 404) return <LinkProblem />;
    return (
      <ErrorScreen
        kind={toErrorScreenKind(error)}
        retryAfterSeconds={error instanceof ApiError ? error.retryAfterSeconds : undefined}
        onRetry={() => void query.refetch()}
      />
    );
  }
  const link = query.data;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 font-bold text-ink">방문 가능 시간 알려주기</h1>
        <p className="text-body text-ink">{link.officeName}</p>
        <ManagerLine name={link.managerDisplayName} role={link.managerLegalRole} />
        <p className="text-caption text-ink-2">
          문의{" "}
          <a href={`tel:${link.officeContactPhone}`} className="font-semibold text-primary">
            {link.officeContactPhone}
          </a>
        </p>
      </header>
      <Card title="후보 매물">
        <ul className="flex flex-col gap-1 text-body text-ink">
          {(link.candidateProperties ?? []).map((entry) => (
            <li key={entry.candidatePropertyId}>
              {entry.displayName} <span className="text-caption text-ink-2">{entry.district}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-caption text-ink-2">
          방문 전에는 정확한 주소를 알려드리지 않습니다. 확정되면 일정에서 확인할 수 있습니다.
        </p>
      </Card>
      <Tabs
        label="방문 안내"
        activeKey={tab}
        onActiveKeyChange={setTab}
        items={[
          {
            key: "times",
            label: "가능한 시간",
            panel: <TimeForm token={normalized} link={link} />,
          },
          {
            key: "confirmed",
            label: "확정 일정",
            panel: <ConfirmedTab token={normalized} contact={link.officeContactPhone} />,
          },
        ]}
      />
      <CustomerLinkPrivacyNotice
        officeName={link.officeName}
        officeContactPhone={link.officeContactPhone}
        retentionDays={link.privacyNotice.retentionDays}
      />
      <LinkCommonNotices
        audience="customer"
        officeName={link.officeName}
        officeContactPhone={link.officeContactPhone}
        retentionDays={link.privacyNotice.retentionDays}
      />
    </div>
  );
}
