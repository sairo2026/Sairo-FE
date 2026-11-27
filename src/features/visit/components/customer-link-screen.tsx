"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
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
import { Tabs } from "@/shared/components/ui/tabs";
import { cn } from "@/shared/lib/cn";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { normalizeLinkToken } from "@/shared/lib/link-token";
import {
  fetchCustomerConfirmed,
  fetchCustomerLink,
  fetchCustomerPortalRequests,
  logoutCustomerPortal,
  previewBrowserReusableCustomerTimes,
  previewCustomerPortalTimes,
  previewReusableCustomerTimes,
  sendCustomerPortalCode,
  submitCustomerTimes,
  verifyCustomerPortalCode,
} from "../api/follow.api";
import {
  LEGAL_ROLE_LABEL,
  PUBLIC_VISIT_STATE_LABEL,
  PUBLIC_VISIT_STATE_TONE,
  statusLabel,
} from "../model/labels";
import { LINK_COMMON_COPY, linkExpiredNotice } from "../model/legal-copy";
import type { LinkNoticeContext } from "../model/legal-copy";
import { describeVisitError, isApiCode } from "../model/messages";
import { CustomerLinkPrivacyNotice, LinkCommonNotices } from "./link-legal-notices";
import { kstParts, todayKst } from "../model/time";
import {
  blocksToDrafts,
  listWindowDates,
  parseSubmittedSlots,
  rangesToBlocks,
  toSubmitSlots,
  acceptsCustomerResponse,
  validateSlots,
} from "../model/customer-times";
import type { SelectedBlocks } from "../model/customer-times";
import { toKstIso } from "../model/time";
import { CustomerTimeSelect } from "./customer-time-select";
import { previousCustomerToken, safeReusableBlocks } from "../model/reuse-link";

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
      <p className="text-caption text-ink-2">
        담당 {name} ({LEGAL_ROLE_LABEL[role]})
      </p>
      {role === "ASSISTANT" ? (
        <div className="mt-2 flex flex-col gap-1 rounded-control border border-primary bg-surface px-3.5 py-3">
          <p className="text-caption font-semibold text-primary">중개보조원 신분 안내</p>
          <p className="text-caption text-ink-2">
            담당자는 중개보조원입니다. 중개보조원은 공인중개사가 아니며 소속 공인중개사의 감독 아래
            방문을 안내합니다.
          </p>
        </div>
      ) : null}
    </>
  );
}

const SURFACE_CARD = "rounded-card-flat border border-line bg-white p-5";

function shortDate(date: string): string {
  const [, month = "", day = ""] = date.split("-");
  return `${month}.${day}`;
}

function initialBlocks(link: PublicVisitLinkResponse): SelectedBlocks {
  return rangesToBlocks(
    parseSubmittedSlots(link.submittedTimeSlots).map((slot) => {
      const start = kstParts(slot.startsAt);
      const end = kstParts(slot.endsAt);
      return { date: start.date, start: start.time, end: end.time };
    }),
  );
}

type ReusableSlot = { startsAt: string; endsAt: string };

function CustomerPortalPanel({
  token,
  onReuse,
}: {
  token: string;
  onReuse: (slots: ReusableSlot[]) => void;
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const existing = useQuery({
    queryKey: ["customer-visit-portal", token],
    queryFn: () => fetchCustomerPortalRequests(token),
    retry: false,
  });
  const send = useMutation({ mutationFn: () => sendCustomerPortalCode(token) });
  const loadTimes = useMutation({
    mutationFn: () => previewCustomerPortalTimes(token),
    onSuccess: (result) => onReuse(result.timeSlots),
  });
  const verify = useMutation({
    mutationFn: async () => {
      await verifyCustomerPortalCode(token, code);
      const requests = await fetchCustomerPortalRequests(token);
      const reusable = await previewCustomerPortalTimes(token).catch(() => ({ timeSlots: [] }));
      return { requests, reusable };
    },
    onSuccess: ({ requests, reusable }) => {
      queryClient.setQueryData(["customer-visit-portal", token], requests);
      onReuse(reusable.timeSlots);
      setCode("");
    },
  });
  const leave = useMutation({
    mutationFn: () => logoutCustomerPortal(token),
    onSuccess: () => {
      queryClient.setQueryData(["customer-visit-portal", token], {
        available: true,
        verified: false,
        items: [],
      });
      setCode("");
    },
  });
  const items = existing.data?.verified ? existing.data.items : undefined;
  if (!existing.data?.available) return null;
  return (
    <div className="rounded-control border border-line bg-surface px-3.5 py-3">
      <h3 className="text-body font-semibold text-ink">내 방문 요청 확인</h3>
      <p className="mt-1 text-caption text-ink-2">
        이전 링크가 없어도 등록된 이메일로 본인을 확인하면 같은 사무소의 방문 요청과 유효한 시간을
        볼 수 있습니다. 시간을 확인하고 고친 뒤 이번 요청에 직접 제출해 주세요.
      </p>
      {items ? (
        <>
          <ul className="mt-3 space-y-1 text-caption text-ink-2" aria-label="내 방문 요청">
            {items.map((item) => (
              <li key={item.coordinationId}>
                {item.periodStartDate} ~ {item.periodEndDate} · {statusLabel(item.status)}
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            variant="outlined"
            isLoading={loadTimes.isPending}
            onClick={() => loadTimes.mutate()}
          >
            유효한 이전 시간 불러오기
          </Button>
          {loadTimes.isError ? (
            <FormAlert>이전 시간을 불러오지 못했습니다. 다시 시도해 주세요.</FormAlert>
          ) : null}
          <Button
            size="sm"
            variant="outlined"
            isLoading={leave.isPending}
            onClick={() => leave.mutate()}
          >
            이 기기에서 방문 요청 보기 종료
          </Button>
        </>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <Button
            size="sm"
            variant="outlined"
            isLoading={send.isPending}
            onClick={() => send.mutate()}
          >
            인증번호 받기
          </Button>
          {send.data ? (
            <>
              <p className="text-caption text-ink-2">
                {send.data.maskedEmail}로 보낸 6자리 인증번호를 입력해 주세요.
              </p>
              <label htmlFor="customer-portal-code" className="text-caption font-medium text-ink">
                인증번호
              </label>
              <input
                id="customer-portal-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                className="w-full rounded-control border border-line bg-white px-3.5 py-3 text-body text-ink"
              />
              <Button
                disabled={!/^\d{6}$/.test(code)}
                isLoading={verify.isPending}
                onClick={() => verify.mutate()}
              >
                내 방문 요청 확인하기
              </Button>
            </>
          ) : null}
          {send.isError ? (
            <FormAlert>
              인증번호를 보내지 못했습니다. 잠시 후 다시 시도하거나 사무소에 문의해 주세요.
            </FormAlert>
          ) : null}
          {verify.isError ? (
            <FormAlert>인증번호를 확인하지 못했습니다. 번호와 유효시간을 확인해 주세요.</FormAlert>
          ) : null}
        </div>
      )}
    </div>
  );
}

function TimeForm({ token, link }: { token: string; link: PublicVisitLinkResponse }) {
  const queryClient = useQueryClient();
  const initial = parseSubmittedSlots(link.submittedTimeSlots);
  const dates = listWindowDates(link.candidateWindow);
  const [selected, setSelected] = useState<SelectedBlocks>(() => initialBlocks(link));
  const [activeDate, setActiveDate] = useState(() => {
    const firstSelected = dates.find((date) => (initialBlocks(link)[date]?.length ?? 0) > 0);
    const today = todayKst();
    return firstSelected ?? dates.find((date) => date >= today) ?? dates[0] ?? today;
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [formError, setFormError] = useState<string>();
  const [previousLink, setPreviousLink] = useState("");
  const [reuseInputError, setReuseInputError] = useState<string>();
  const [reuseNotice, setReuseNotice] = useState<string>();
  const autoApplied = useRef(false);
  const autoRequested = useRef(false);
  const userChangedTimes = useRef(false);
  const userChangedDate = useRef(false);
  const submissionStarted = useRef(false);
  const isClosed = !acceptsCustomerResponse(link.coordinationStatus, link.linkExpiresAt);
  const isResubmit = initial.length > 0;
  const { mutate: loadBrowserTimes } = useMutation({
    mutationFn: () => previewBrowserReusableCustomerTimes(token),
    onSuccess: ({ timeSlots }) => {
      if (autoApplied.current || userChangedTimes.current || submissionStarted.current) return;
      autoApplied.current = true;
      const blocks = safeReusableBlocks(timeSlots);
      if (Object.keys(blocks).length === 0) return;
      setSelected((current) => {
        const merged = { ...current };
        for (const [date, minutes] of Object.entries(blocks)) {
          merged[date] = [...new Set([...(current[date] ?? []), ...minutes])].sort(
            (left, right) => left - right,
          );
        }
        return merged;
      });
      const firstReusableDate = Object.keys(blocks).sort()[0];
      if (firstReusableDate && !userChangedDate.current) setActiveDate(firstReusableDate);
      setErrors([]);
      setFormError(undefined);
      setReuseNotice(
        "이 브라우저에서 이전에 확인한 유효한 시간을 표시했습니다. 이번 요청에 맞게 확인·수정한 뒤 제출해 주세요.",
      );
    },
  });
  useEffect(() => {
    if (isClosed || isResubmit || autoRequested.current) return;
    autoRequested.current = true;
    loadBrowserTimes();
  }, [isClosed, isResubmit, loadBrowserTimes]);
  const reuse = useMutation({
    mutationFn: (previousToken: string) => previewReusableCustomerTimes(token, previousToken),
    onSuccess: ({ timeSlots }) => {
      const blocks = safeReusableBlocks(timeSlots);
      setSelected((current) => {
        const merged = { ...current };
        for (const [date, minutes] of Object.entries(blocks)) {
          merged[date] = [...new Set([...(current[date] ?? []), ...minutes])].sort(
            (left, right) => left - right,
          );
        }
        return merged;
      });
      const firstReusableDate = Object.keys(blocks).sort()[0];
      if (firstReusableDate) setActiveDate(firstReusableDate);
      setPreviousLink("");
      setReuseInputError(undefined);
      setErrors([]);
      setFormError(undefined);
      setReuseNotice(
        Object.keys(blocks).length > 0
          ? "표시 가능한 이전 시간을 현재 선택에 추가했습니다. 일부 시간은 단위가 달라 제외될 수 있습니다. 확인·수정한 뒤 제출해 주세요."
          : "이번 방문 기간에 화면에서 재사용할 수 있는 시간이 없습니다. 새 시간을 선택해 주세요.",
      );
    },
    onError: () => {
      setPreviousLink("");
      setReuseNotice(undefined);
    },
  });
  const drafts = blocksToDrafts(selected);
  const mutation = useMutation({
    mutationFn: () =>
      submitCustomerTimes(token, {
        timeSlots: toSubmitSlots(drafts),
        acknowledgedNoticeVersion: link.privacyNotice.noticeVersion,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["visit-public", token] }),
    onError: (error) => {
      if (isApiCode(error, "NOTICE_VERSION_CHANGED")) {
        void queryClient.invalidateQueries({ queryKey: ["visit-public", token] });
      }
    },
  });
  const isWithdrawAll = isResubmit && drafts.length === 0;

  function toggle(date: string, minutes: number) {
    userChangedTimes.current = true;
    setSelected((current) => {
      const set = new Set(current[date] ?? []);
      if (set.has(minutes)) set.delete(minutes);
      else set.add(minutes);
      const next = { ...current };
      if (set.size === 0) delete next[date];
      else next[date] = [...set].sort((x, y) => x - y);
      return next;
    });
    setErrors([]);
    setFormError(undefined);
  }

  function submit() {
    const result = validateSlots(drafts, link.candidateWindow, new Date(), isResubmit);
    setErrors(
      Object.values(result.errors).filter((message): message is string => Boolean(message)),
    );
    setFormError(result.formError);
    if (!result.formError && Object.keys(result.errors).length === 0) {
      submissionStarted.current = true;
      mutation.mutate();
    }
  }

  function loadPrevious() {
    userChangedTimes.current = true;
    const previous = previousCustomerToken(previousLink, window.location.origin);
    if (!previous || previous === token) {
      setReuseInputError("이전 방문 조율 링크를 확인해 주세요.");
      return;
    }
    setReuseInputError(undefined);
    reuse.mutate(previous);
  }

  function reuseVerifiedTimes(timeSlots: ReusableSlot[]) {
    if (submissionStarted.current) return;
    autoApplied.current = true;
    const blocks = safeReusableBlocks(timeSlots);
    setSelected((current) => {
      const merged = { ...current };
      for (const [date, minutes] of Object.entries(blocks)) {
        merged[date] = [...new Set([...(current[date] ?? []), ...minutes])].sort((a, b) => a - b);
      }
      return merged;
    });
    const firstDate = Object.keys(blocks).sort()[0];
    if (firstDate && !userChangedDate.current) setActiveDate(firstDate);
    if (firstDate)
      setReuseNotice(
        "본인 확인이 완료됐습니다. 유효한 이전 시간을 확인하고 이번 요청에 제출해 주세요.",
      );
  }

  function isPast(date: string, minutes: number): boolean {
    const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
    const minute = String(minutes % 60).padStart(2, "0");
    return Date.parse(toKstIso(date, `${hour}:${minute}`)) <= Date.now();
  }

  return (
    <div className="flex flex-col gap-4">
      {!isClosed && isResubmit ? (
        <CustomerPortalPanel token={token} onReuse={reuseVerifiedTimes} />
      ) : null}
      {!isClosed && !isResubmit ? (
        <section
          aria-labelledby="reuse-time-title"
          className={cn(SURFACE_CARD, "flex flex-col gap-3")}
        >
          <h2 id="reuse-time-title" className="text-body font-semibold text-ink">
            이전 시간 불러오기
          </h2>
          <CustomerPortalPanel token={token} onReuse={reuseVerifiedTimes} />
          <p className="text-caption text-ink-2">
            같은 사무소에서 받은 이전 방문 링크가 아직 열려 있다면, 유효한 시간만 추가할 수
            있습니다. 이번 요청에 제출하기 전에 확인·수정해 주세요.
          </p>
          <label htmlFor="previous-visit-link" className="text-caption font-medium text-ink">
            이전 방문 조율 링크
          </label>
          <input
            id="previous-visit-link"
            type="password"
            autoComplete="off"
            value={previousLink}
            onChange={(event) => setPreviousLink(event.target.value)}
            className="w-full rounded-control border border-line bg-white px-3.5 py-3 text-body text-ink"
            placeholder="이전 링크 붙여넣기"
          />
          <Button
            disabled={!previousLink.trim()}
            isLoading={reuse.isPending}
            onClick={loadPrevious}
          >
            시간 불러오기
          </Button>
          {reuseInputError ? <FormAlert>{reuseInputError}</FormAlert> : null}
          {reuse.isError ? (
            <FormAlert>
              {isApiCode(reuse.error, "PUBLIC_LINK_EXPIRED")
                ? "현재 또는 이전 링크가 만료됐습니다. 지금 링크도 마감됐다면 사무소에 문의해 주세요."
                : describeVisitError(
                    reuse.error,
                    "이전 링크를 확인할 수 없습니다. 새 시간을 선택해 주세요.",
                  )}
            </FormAlert>
          ) : null}
          {reuseNotice ? <FormNotice>{reuseNotice}</FormNotice> : null}
        </section>
      ) : null}
      <section
        aria-labelledby="customer-time-title"
        className={cn(SURFACE_CARD, "flex flex-col gap-3")}
      >
        <h2 id="customer-time-title" className="text-body font-semibold text-ink">
          가능한 시간 선택
        </h2>
        <CustomerTimeSelect
          dates={dates}
          activeDate={activeDate}
          onActiveDateChange={(date) => {
            userChangedDate.current = true;
            setActiveDate(date);
          }}
          selected={selected}
          onToggle={toggle}
          isPast={isPast}
          isDisabled={isClosed}
          drafts={drafts}
        />
      </section>
      {errors.map((message) => (
        <FormAlert key={message}>{message}</FormAlert>
      ))}
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      {mutation.isError ? (
        <FormAlert>
          {isApiCode(mutation.error, "NOTICE_VERSION_CHANGED")
            ? LINK_COMMON_COPY.noticeChanged
            : describeVisitError(mutation.error, "시간을 제출하지 못했습니다. 다시 시도해 주세요.")}
        </FormAlert>
      ) : null}
      {mutation.isSuccess ? <FormNotice>가능한 시간을 제출했습니다.</FormNotice> : null}
      {isClosed ? <FormNotice>지금은 가능한 시간을 제출하거나 고칠 수 없습니다.</FormNotice> : null}
      {isWithdrawAll && !isClosed ? (
        <FormNotice>
          시간을 모두 해제하고 제출하면 앞서 보낸 가능한 시간이 모두 취소됩니다.
        </FormNotice>
      ) : null}
      <p className="text-caption text-muted">
        키보드의 Tab과 방향키로도 시간을 고를 수 있습니다. 마감 전에는 제출한 시간을 다시 고칠 수
        있습니다.
      </p>
      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-line bg-white px-5 pb-6 pt-3.5 sm:-mx-6">
        <p className="text-center text-caption text-ink-2">{LINK_COMMON_COPY.aboveSubmit}</p>
        <p className="text-center text-caption text-ink-2">
          링크 만료 {formatSeoulDateTime(link.linkExpiresAt)}
        </p>
        <Button fullWidth isLoading={mutation.isPending} disabled={isClosed} onClick={submit}>
          {isWithdrawAll
            ? "제출한 시간 모두 취소"
            : isResubmit
              ? "가능한 시간 수정 제출"
              : "가능한 시간 제출"}
        </Button>
      </div>
    </div>
  );
}

function InfoCell({ label, value, isAlert }: { label: string; value: string; isAlert?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-control border border-line bg-white px-3.5 py-3">
      <span className="text-caption text-ink-2">{label}</span>
      <span className={cn("text-caption font-semibold", isAlert ? "text-danger" : "text-ink")}>
        {value}
      </span>
    </div>
  );
}

function CandidateSummary({ link }: { link: PublicVisitLinkResponse }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const properties = link.candidateProperties ?? [];
  const visible = isExpanded ? properties : properties.slice(0, 3);
  const hiddenCount = properties.length - visible.length;
  return (
    <section
      aria-labelledby="customer-properties-title"
      className={cn(SURFACE_CARD, "flex flex-col gap-3")}
    >
      <div className="flex items-center justify-between">
        <h2 id="customer-properties-title" className="text-body font-semibold text-ink">
          보러 갈 매물
        </h2>
        <span className="text-caption font-bold text-primary">{properties.length}개</span>
      </div>
      <ol className="flex flex-col">
        {visible.map((entry, index) => (
          <li
            key={entry.candidatePropertyId}
            className="flex items-center gap-2.5 border-t border-line py-2.5 first:border-t-0"
          >
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-small bg-primary-soft text-caption font-semibold text-primary"
            >
              {index + 1}
            </span>
            <span className="flex min-w-0 flex-col">
              <span
                className="truncate-text text-caption font-semibold text-ink"
                title={entry.displayName}
              >
                {entry.displayName}
              </span>
              <span className="truncate-text text-caption text-ink-2" title={entry.district}>
                {entry.district}
              </span>
            </span>
          </li>
        ))}
      </ol>
      {hiddenCount > 0 || isExpanded ? (
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((current) => !current)}
          className="self-start text-caption font-semibold text-primary underline-offset-4 clickable-link"
        >
          {isExpanded ? "접기" : `${hiddenCount}개 더 보기`}
        </button>
      ) : null}
      <p className="text-caption text-ink-2">
        방문 전에는 정확한 주소를 알려드리지 않습니다. 확정되면 일정에서 확인할 수 있습니다.
      </p>
    </section>
  );
}

function isNextOnAnotherDay(
  item: PublicConfirmedVisitResponse["items"][number],
  next: PublicConfirmedVisitResponse["items"][number] | undefined,
): boolean {
  return (
    next !== undefined &&
    kstParts(item.scheduledEndAt).date !== kstParts(next.scheduledStartAt).date
  );
}

function ConfirmedView({
  data,
  contact,
  isPartial,
}: {
  data: PublicConfirmedVisitResponse;
  contact: string;
  isPartial: boolean;
}) {
  const isValid = data.state === "VALID";
  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2">
        <Badge tone={isValid && isPartial ? "blue" : PUBLIC_VISIT_STATE_TONE[data.state]}>
          {isValid && isPartial ? "일부 확정" : PUBLIC_VISIT_STATE_LABEL[data.state]}
        </Badge>
      </p>
      <ManagerLine name={data.managerDisplayName} role={data.managerLegalRole} />
      {isValid ? (
        <ol className="flex flex-col gap-3">
          {data.items.map((item, index) => (
            <li
              key={item.sortOrder}
              className="flex flex-col gap-1 rounded-control border border-line p-3"
            >
              <span className="text-body font-semibold text-ink">
                {item.sortOrder}. {item.propertyAddress}
              </span>
              <span className="text-caption text-ink-2">
                {formatSeoulDateTime(item.scheduledStartAt)} ~{" "}
                {formatSeoulDateTime(item.scheduledEndAt)}
              </span>
              {item.travelDurationMinutes !== null &&
              data.items[index + 1]?.sortOrder === item.sortOrder + 1 &&
              !isNextOnAnotherDay(item, data.items[index + 1]) ? (
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
        <a href={`tel:${contact}`} className="font-semibold text-primary underline clickable-link">
          {contact}
        </a>
      </p>
      <p className="text-caption text-ink-2">
        확정 일정은 마지막 방문의 예정 종료 시각부터 24시간까지만 볼 수 있습니다.
      </p>
    </div>
  );
}

function ConfirmedTab({
  token,
  contact,
  isPartial,
}: {
  token: string;
  contact: string;
  isPartial: boolean;
}) {
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
  return <ConfirmedView data={query.data} contact={contact} isPartial={isPartial} />;
}

export function CustomerLinkScreen({ token }: { token: string | undefined }) {
  const normalized = normalizeLinkToken(token);
  const [pickedTab, setTab] = useState<string>();
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
  const isConfirmed = link.coordinationStatus === "CONFIRMED";
  const isArranging =
    !isConfirmed && !acceptsCustomerResponse(link.coordinationStatus, link.linkExpiresAt);
  const tab = pickedTab ?? (isConfirmed || isArranging ? "confirmed" : "times");
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-h2 font-bold text-ink">
          {isConfirmed
            ? "방문 일정이 확정되었습니다"
            : isArranging
              ? "방문 일정을 조율하고 있습니다"
              : "방문 가능한 시간을 알려주세요"}
        </h1>
        <p className="text-caption text-ink-2">
          {isConfirmed
            ? "확정 일정 탭에서 방문 순서와 시각을 확인해 주세요. 제출한 가능한 시간은 가능한 시간 탭에서 볼 수 있으며 더 이상 고칠 수 없습니다."
            : isArranging
              ? "담당자가 매물 주인의 승인을 받아 일정을 확정하는 중입니다. 확정된 방문은 확정 일정 탭에서 볼 수 있고, 시간을 고치려면 사무소에 문의해 주세요."
              : "보러 갈 수 있는 시간을 모두 골라 주세요. 담당자가 동선을 짜서 다시 안내해 드립니다."}
        </p>
      </header>
      <section aria-label="안내 사무소" className={cn(SURFACE_CARD, "flex flex-col gap-3")}>
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" />
            </svg>
          </span>
          <p className="text-body font-semibold text-ink">{link.officeName}</p>
        </div>
        <div className="flex flex-col">
          <ManagerLine name={link.managerDisplayName} role={link.managerLegalRole} />
        </div>
        <p className="text-caption text-ink-2">
          문의{" "}
          <a
            href={`tel:${link.officeContactPhone}`}
            className="font-semibold text-primary underline clickable-link"
          >
            {link.officeContactPhone}
          </a>
        </p>
      </section>
      <div className="flex gap-2">
        <InfoCell
          label="방문 가능 기간"
          value={`${shortDate(link.candidateWindow.startDate)} ~ ${shortDate(link.candidateWindow.endDate)}`}
        />
        <InfoCell label="응답 마감" value={formatSeoulDateTime(link.linkExpiresAt)} isAlert />
      </div>
      <CandidateSummary link={link} />
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
            panel: (
              <ConfirmedTab
                token={normalized}
                contact={link.officeContactPhone}
                isPartial={!isConfirmed}
              />
            ),
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
        rightsTarget={{
          kind: "CUSTOMER",
          token: normalized,
          noticeVersion: link.privacyNotice.noticeVersion,
        }}
        officeName={link.officeName}
        officeContactPhone={link.officeContactPhone}
        retentionDays={link.privacyNotice.retentionDays}
      />
    </div>
  );
}
