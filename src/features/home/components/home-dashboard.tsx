"use client";

import Link from "next/link";
import { useState } from "react";
import type { HomeSummaryResponse } from "@/lib/api/contracts/work.schema";
import { COORDINATION_STATUSES, statusLabel, statusTone } from "@/features/visit/model/labels";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { useHomeSummary, useTasks } from "../hooks/home-queries";
import { TaskDialog } from "./task-dialog";
import type { TaskItem } from "./task-dialog";
import { MiniCalendar } from "./mini-calendar";

function StatCard({
  href,
  title,
  value,
  label,
}: {
  href: string;
  title: string;
  value: number;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`${title} ${value}${label}`}
      className="flex flex-col gap-10 rounded-card border border-line bg-white px-7 py-8 transition-colors hover:border-primary"
    >
      <span className="flex items-center justify-between text-h2 font-bold text-ink">
        {title}
        <span aria-hidden="true" className="text-ink-3">
          &gt;
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
        <button type="button" className="underline" onClick={onClose}>
          닫기
        </button>
      </FormAlert>
    );
  }
  return <TaskDialog isOpen task={found} onClose={onClose} />;
}

function HomeBody({ summary }: { summary: HomeSummaryResponse }) {
  const { role, isReadOnly } = useOfficeAccess();
  const isDeputy = role === "DEPUTY";
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
        actions={
          <>
            <Link
              href="/notifications"
              className="inline-flex h-12 items-center gap-2 rounded-control border border-line px-5 text-body font-medium text-ink-2 hover:border-primary hover:text-primary"
            >
              알림함
              <span
                aria-label={`읽지 않은 알림 ${summary.unreadNotificationCount}건`}
                className="inline-flex min-w-6 justify-center rounded-full bg-primary px-2 text-caption font-bold text-white"
              >
                {summary.unreadNotificationCount}
              </span>
            </Link>
            <Button onClick={() => setCreating(true)} disabled={isReadOnly}>
              + 업무 만들기
            </Button>
          </>
        }
      />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {isDeputy ? null : (
          <StatCard
            href="/contracts?tab=maturity"
            title="계약 만기 D-90"
            value={summary.leaseExpiringWithin90DaysCount}
            label="건"
          />
        )}
        <StatCard
          href="/coordinations"
          title="오늘 임장 목록"
          value={summary.todayScheduledVisits.length}
          label="건"
        />
        <StatCard
          href="/coordinations"
          title="방문 조율 중"
          value={summary.activeCoordinationCount}
          label="건"
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <section
          aria-labelledby="home-tasks"
          className="flex flex-col gap-5 rounded-card border border-line bg-white px-7 py-6"
        >
          <h2 id="home-tasks" className="text-h2 font-semibold text-ink">
            오늘 업무 리스트
          </h2>
          <div className="flex flex-col gap-2">
            <h3 className="text-caption font-semibold text-ink-2">오늘 방문</h3>
            {summary.todayScheduledVisits.length === 0 ? (
              <p className="text-caption text-ink-3">오늘 확정된 방문이 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {summary.todayScheduledVisits.map((visit) => (
                  <li key={visit.scheduleItemId}>
                    <Link
                      href={`/coordinations/${visit.coordinationId}`}
                      className="flex flex-col rounded-control border border-line px-4 py-3 hover:border-primary"
                    >
                      <span className="font-semibold text-ink">{visit.propertyAddress}</span>
                      <span className="text-caption text-ink-2">
                        {formatSeoulDateTime(visit.scheduledStartAt)} · {visit.customerName}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {overdue.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-caption font-semibold text-tag-red-ink">기한이 지난 업무</h3>
              <ul aria-label="기한이 지난 업무" className="flex flex-col gap-2">
                {overdue.map((task) => (
                  <li key={task.taskId}>
                    <TaskRow
                      title={task.title}
                      dueDate={task.dueDate}
                      assigneeName={task.assigneeName}
                      isOverdue
                      onOpen={() => setOpenTaskId(task.taskId)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <h3 className="text-caption font-semibold text-ink-2">오늘·예정 업무</h3>
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
                      onOpen={() => setOpenTaskId(task.taskId)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
          {isDeputy ? null : (
            <div className="flex flex-col gap-2">
              <h3 className="text-caption font-semibold text-ink-2">임대 만기 90일 전 후속업무</h3>
              {summary.openFollowupTasks.length === 0 ? (
                <p className="text-caption text-ink-3">제출할 후속업무가 없습니다.</p>
              ) : (
                <ul aria-label="계약 후속업무" className="flex flex-col gap-2">
                  {summary.openFollowupTasks.map((task) => (
                    <li key={task.taskId}>
                      <Link
                        href="/contracts?tab=maturity"
                        className="flex items-center justify-between rounded-control border border-line px-4 py-3 hover:border-primary"
                      >
                        <span className="font-semibold text-ink">{task.title}</span>
                        <span className="text-caption text-ink-2">
                          {formatSeoulDate(task.dueDate)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <Link href="/tasks" className="text-caption font-semibold text-primary hover:underline">
            업무 전체 보기
          </Link>
        </section>
        <div className="flex flex-col gap-5">
          <section
            aria-labelledby="home-status"
            className="rounded-card border border-line bg-white px-7 py-6"
          >
            <h2 id="home-status" className="mb-4 text-h2 font-semibold text-ink">
              방문 조율 현황
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {COORDINATION_STATUSES.map((status) => (
                <li key={status}>
                  <Link
                    href="/coordinations"
                    className="flex flex-col items-start gap-1 rounded-card-flat border border-line px-4 py-3 hover:border-primary"
                  >
                    <Badge tone={statusTone(status)} className="h-7 min-w-0 px-3 text-caption">
                      {statusLabel(status)}
                    </Badge>
                    <span className="text-h2 font-bold text-ink">
                      {counts.get(status) ?? 0}
                      <span className="text-caption font-medium text-ink-2">건</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section
            aria-labelledby="home-calendar"
            className="rounded-card border border-line bg-white px-7 py-6"
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

function TaskRow({
  title,
  dueDate,
  assigneeName,
  isOverdue,
  onOpen,
}: {
  title: string;
  dueDate: string;
  assigneeName: string;
  isOverdue: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`업무 ${title} 열기`}
      className="flex w-full items-center justify-between gap-3 rounded-control border border-line px-4 py-3 text-left hover:border-primary"
    >
      <span className="flex flex-col">
        <span className="font-semibold text-ink">{title}</span>
        <span className="text-caption text-ink-2">담당 {assigneeName}</span>
      </span>
      <span className={`text-caption font-medium ${isOverdue ? "text-tag-red-ink" : "text-ink-2"}`}>
        {isOverdue ? "기한 " : ""}
        {formatSeoulDate(dueDate)}
      </span>
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
