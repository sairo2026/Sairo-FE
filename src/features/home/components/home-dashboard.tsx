"use client";

import Link from "next/link";
import { useState } from "react";
import { useSubscription } from "@/features/billing/hooks/billing-queries";
import { COORDINATION_STATUSES, statusLabel, statusTone } from "@/features/visit/model/labels";
import { coordinationListPath } from "@/features/visit/model/visit-routes";
import { VISIT_REQUEST_NOTICES_HREF, taskContractHref } from "../model/labels";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { ScheduleTag } from "@/shared/components/ui/badge";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import type { HomeSummary } from "../api/wire";
import { useHomeSummary, useIsEmptyOffice, useTasks } from "../hooks/home-queries";
import { TaskDialog } from "./task-dialog";
import type { TaskItem } from "./task-dialog";
import { MiniCalendar } from "./mini-calendar";

type StatIcon = "contract" | "visit" | "coordination";

const STAT_ICON_PATH: Record<StatIcon, string> = {
  contract: "M7 3h10l4 4v14H7zM17 3v4h4M10 12h8M10 16h8",
  visit: "M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6",
  coordination:
    "M16 11a3 3 0 100-6 3 3 0 000 6zM8 12a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 6-5s6 2 6 5M14 15c4-1 8 1 8 5",
};

function StatCard({
  href,
  title,
  value,
  label,
  icon,
}: {
  href: string;
  title: string;
  value: number;
  label: string;
  icon?: StatIcon;
}) {
  return (
    <Link
      href={href}
      aria-label={`${title} ${value}${label}`}
      className={`group flex flex-col rounded-card border border-line bg-white px-7 py-8 clickable-card ${icon ? "gap-[52px] lg:h-[254px]" : "gap-10"}`}
    >
      <span className="flex flex-col gap-3">
        {icon ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d={STAT_ICON_PATH[icon]} />
          </svg>
        ) : null}
        <span
          className={`flex items-center justify-between font-bold text-ink ${icon ? "text-h1" : "text-h2"}`}
        >
          {title}
          <span aria-hidden="true" className="clickable-arrow">
            {icon ? (
              <svg
                viewBox="0 0 18 36"
                width="18"
                height="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="block"
              >
                <path d="M5 12l8 6-8 6" />
              </svg>
            ) : (
              "›"
            )}
          </span>
        </span>
      </span>
      <span className="text-[64px] font-semibold leading-[60px] text-primary">{value}</span>
    </Link>
  );
}

function TaskOpener({ taskId, onClose }: { taskId: number; onClose: () => void }) {
  const query = useTasks({ status: "TODO", page: 0, size: 100 });
  const found: TaskItem | undefined = query.data?.items.find((item) => item.taskId === taskId);
  if (query.isPending) return null;
  if (!found) {
    return (
      <FormAlert>
        업무 정보를 불러오지 못했습니다.{" "}
        <button type="button" className="underline clickable-link" onClick={onClose}>
          닫기
        </button>
      </FormAlert>
    );
  }
  return <TaskDialog isOpen task={found} onClose={onClose} />;
}

/** 계약 ID가 있으면 그 계약의 후속업무 확인 화면으로, 없는 응답이면 만기 계약 목록으로 보낸다. */
function followupHref(contractId: number | undefined) {
  return contractId === undefined
    ? "/contracts?tab=maturity"
    : `/contracts/${contractId}/followups`;
}

const FIRST_USE_LINK_CLASS =
  "group flex items-center justify-between gap-3 rounded-control border border-line px-4 py-3 font-semibold text-ink clickable-row";

function FirstUseGuide({ isOwner, needsCard }: { isOwner: boolean; needsCard: boolean }) {
  const steps = [
    { href: "/properties/new", label: "매물 등록" },
    { href: "/customers/new", label: "고객 등록" },
    ...(isOwner ? [{ href: "/import", label: "데이터 이전" }] : []),
    ...(needsCard ? [{ href: "/billing/card-guide", label: "카드 등록 안내" }] : []),
  ];
  return (
    <section
      aria-labelledby="home-first-use"
      className="flex flex-col gap-4 rounded-card border border-line bg-white px-7 py-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="home-first-use" className="text-h2 font-semibold text-ink">
          첫 사용 안내
        </h2>
        <p className="text-caption text-ink-2">
          아직 등록된 매물과 고객이 없습니다. 아래에서 시작해 주세요.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => (
          <li key={step.href}>
            <Link href={step.href} className={FIRST_USE_LINK_CLASS}>
              {step.label}
              <span aria-hidden="true" className="clickable-arrow">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HomeBody({ summary }: { summary: HomeSummary }) {
  const { role, isReadOnly } = useOfficeAccess();
  const isDeputy = role === "DEPUTY";
  const isOwner = role === "OWNER";
  const isEmptyOffice = useIsEmptyOffice(role !== null && !isDeputy && !isReadOnly);
  const subscription = useSubscription(isOwner);
  const needsCard = isOwner && subscription.data?.readiness.hasBillingKey === false;
  const [creating, setCreating] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const overdue = summary.openTasks.filter((task) => task.overdue);
  const upcoming = summary.openTasks.filter((task) => !task.overdue);
  const counts = new Map(summary.coordinationStatusCounts.map((item) => [item.status, item.count]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="오늘 할 일"
        description={
          isDeputy
            ? "본인 업무와 담당 방문만 보입니다."
            : "오늘 방문과 업무, 조율 진행 현황을 한눈에 봅니다."
        }
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,326px))]">
        {isDeputy ? null : (
          <StatCard
            href="/contracts?tab=maturity"
            title="계약 만기 D-90"
            icon="contract"
            value={summary.leaseExpiringWithin90DaysCount}
            label="건"
          />
        )}
        <StatCard
          href="/coordinations"
          title="오늘 임장 목록"
          icon="visit"
          value={summary.todayScheduledVisits.length}
          label="건"
        />
        <StatCard
          href="/coordinations"
          title="방문 조율 중"
          icon="coordination"
          value={summary.activeCoordinationCount}
          label="건"
        />
      </div>
      {isEmptyOffice ? <FirstUseGuide isOwner={isOwner} needsCard={needsCard} /> : null}
      {needsCard && !isEmptyOffice ? (
        <p className="text-caption text-ink-2">
          결제 카드를 아직 등록하지 않았습니다.{" "}
          <Link
            href="/billing/card-guide"
            className="font-semibold text-primary underline clickable-link"
          >
            카드 등록 안내
          </Link>
          를 확인해 주세요.
        </p>
      ) : null}
      <section aria-labelledby="home-visit-requests" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="home-visit-requests" className="text-h2 font-semibold text-ink">
            방문 신청 현황
          </h2>
          <Link
            href={VISIT_REQUEST_NOTICES_HREF}
            aria-label={`읽지 않은 방문 신청 알림 ${summary.unreadVisitRequestNoticeCount}건`}
            className="text-caption font-semibold text-primary underline clickable-link"
          >
            읽지 않은 방문 신청 알림 {summary.unreadVisitRequestNoticeCount}건
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <StatCard
            href={coordinationListPath()}
            title="신청 대기"
            value={summary.visitRequestSummary.pendingCount}
            label="건"
          />
          <StatCard
            href={coordinationListPath()}
            title="재검증 실패"
            value={summary.visitRequestSummary.revalidationFailedCount}
            label="건"
          />
          <StatCard
            href={coordinationListPath()}
            title="시간 마감"
            value={summary.visitRequestSummary.timeClosedCount}
            label="건"
          />
        </div>
      </section>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[443px_minmax(0,1fr)] lg:gap-11">
        <section
          aria-labelledby="home-tasks"
          className="flex flex-col gap-5 rounded-card border border-line bg-white p-8"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="home-tasks" className="text-h2 font-semibold text-ink">
              오늘 업무 리스트
            </h2>
            <button
              type="button"
              aria-label="+ 업무 만들기"
              disabled={isReadOnly}
              onClick={() => setCreating(true)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover active:bg-primary-pressed disabled:bg-ink-3"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-body font-semibold text-ink-2">오늘 방문</h3>
            {summary.todayScheduledVisits.length === 0 ? (
              <p className="text-caption text-ink-3">오늘 확정된 방문이 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {summary.todayScheduledVisits.map((visit) => (
                  <li key={visit.scheduleItemId}>
                    <Link
                      href={`/coordinations/${visit.coordinationId}`}
                      className="group flex items-center justify-between gap-3 rounded-control border border-line px-4 py-3 clickable-row"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate-text font-semibold text-ink">
                          {visit.propertyAddress}
                        </span>
                        <span className="text-caption text-ink-2">
                          {formatSeoulDateTime(visit.scheduledStartAt)} · {visit.customerName}
                        </span>
                      </span>
                      <span aria-hidden="true" className="clickable-arrow">
                        ›
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <TaskColumnHeader />
            {overdue.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-body font-semibold text-tag-red-ink">기한이 지난 업무</h3>
                <ul aria-label="기한이 지난 업무" className="flex flex-col gap-2">
                  {overdue.map((task) => (
                    <li key={task.taskId}>
                      <TaskRow
                        title={task.title}
                        dueDate={task.dueDate}
                        assigneeName={task.assigneeName}
                        isOverdue
                        href={taskContractHref(task.sourceType, task.sourceId)}
                        onOpen={() => setOpenTaskId(task.taskId)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              <h3 className="text-body font-semibold text-ink-2">오늘·예정 업무</h3>
              {upcoming.length === 0 ? (
                <p className="text-caption text-ink-3">오늘 할 업무가 없습니다.</p>
              ) : (
                <ul aria-label="오늘 예정 업무" className="flex flex-col gap-2">
                  {upcoming.map((task) => (
                    <li key={task.taskId}>
                      <TaskRow
                        title={task.title}
                        dueDate={task.dueDate}
                        assigneeName={task.assigneeName}
                        isOverdue={false}
                        href={taskContractHref(task.sourceType, task.sourceId)}
                        onOpen={() => setOpenTaskId(task.taskId)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {isDeputy ? null : (
            <div className="flex flex-col gap-2">
              <h3 className="text-body font-semibold text-ink-2">임대 만기 90일 전 후속업무</h3>
              {summary.openFollowupTasks.length === 0 ? (
                <p className="text-caption text-ink-3">제출할 후속업무가 없습니다.</p>
              ) : (
                <ul aria-label="계약 후속업무" className="flex flex-col gap-2">
                  {summary.openFollowupTasks.map((task) => (
                    <li key={task.taskId}>
                      <Link
                        href={followupHref(task.contractId)}
                        className="group flex items-center justify-between gap-3 rounded-control border border-line px-4 py-3 clickable-row"
                      >
                        <span className="truncate-text font-semibold text-ink">{task.title}</span>
                        <span className="flex shrink-0 items-center gap-3 text-caption text-ink-2">
                          {formatSeoulDate(task.dueDate)}
                          <span aria-hidden="true" className="clickable-arrow">
                            ›
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <Link
            href="/tasks"
            className="text-caption font-semibold text-primary underline-offset-4 clickable-link"
          >
            업무 전체 보기
          </Link>
        </section>
        <div className="flex flex-col gap-5">
          <section
            aria-labelledby="home-status"
            className="rounded-card border border-line bg-white p-8"
          >
            <h2 id="home-status" className="mb-4 text-h2 font-semibold text-ink">
              방문 조율 현황
            </h2>
            <ul className="flex flex-wrap gap-3">
              {COORDINATION_STATUSES.map((status) => (
                <li key={status}>
                  <Link href={coordinationListPath(status)} className="block rounded-control">
                    <ScheduleTag
                      tone={statusTone(status)}
                      label={statusLabel(status)}
                      count={counts.get(status) ?? 0}
                      isInteractive
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section
            aria-labelledby="home-calendar"
            className="rounded-card border border-line bg-white p-8"
          >
            <h2 id="home-calendar" className="mb-4 text-h2 font-semibold text-ink">
              캘린더
            </h2>
            <MiniCalendar days={summary.calendarDays} />
          </section>
        </div>
      </div>
      {isDeputy ? (
        <FormNotice>중개보조원 홈은 본인 일반서무와 담당 현장안내만 집계합니다.</FormNotice>
      ) : null}
      <TaskDialog isOpen={creating} task={null} onClose={() => setCreating(false)} />
      {openTaskId !== null ? (
        <TaskOpener taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
      ) : null}
    </div>
  );
}

const TASK_COLUMNS = "grid-cols-[minmax(0,1fr)_5rem_5.5rem]";

function TaskColumnHeader() {
  return (
    <div aria-hidden="true" className={`grid gap-3 px-4 text-body ${TASK_COLUMNS}`}>
      <span className="font-semibold text-primary">할 일 제목</span>
      <span className="font-medium text-ink-2">담당자</span>
      <span className="font-medium text-ink">예정일</span>
    </div>
  );
}

function TaskRow({
  title,
  dueDate,
  assigneeName,
  isOverdue,
  href,
  onOpen,
}: {
  title: string;
  dueDate: string;
  assigneeName: string;
  isOverdue: boolean;
  /** 계약에서 생긴 업무면 그 계약 화면 주소다. 없으면 업무 상세 창을 연다. */
  href: string | null;
  onOpen: () => void;
}) {
  const className =
    "group grid w-full items-center gap-3 rounded-control border border-line px-4 py-3 text-left clickable-row " +
    TASK_COLUMNS;
  const content = (
    <>
      <span className="truncate-text font-semibold text-ink">{title}</span>
      <span className="truncate-text text-body font-medium text-ink-2">{assigneeName}</span>
      <span className={`text-body font-medium ${isOverdue ? "text-tag-red-ink" : "text-ink"}`}>
        {isOverdue ? <span className="sr-only">기한 </span> : null}
        {formatSeoulDate(dueDate)}
      </span>
    </>
  );
  return href ? (
    <Link href={href} aria-label={`업무 ${title}의 계약 보기`} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onOpen} aria-label={`업무 ${title} 열기`} className={className}>
      {content}
    </button>
  );
}

export function HomeDashboard() {
  const query = useHomeSummary();
  return (
    <QueryGate query={query} loadingLabel="홈 정보를 불러오는 중입니다.">
      {(summary) => <HomeBody summary={summary} />}
    </QueryGate>
  );
}
